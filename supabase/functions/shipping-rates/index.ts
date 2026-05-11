// Edge Function: shipping-rates
// Retourne le prix d'une livraison en temps reel (Yalidine ou ZR Express)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const YALIDINE_BASE = "https://api.yalidine.app/v1";
const ZR_BASE = "https://api.zrexpress.app/api/v1";

const cache = new Map<string, { data: unknown; exp: number }>();
const TTL = 30 * 60 * 1000;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function zrHeaders(tenantId: string, secretKey: string) {
  return {
    "X-Tenant": tenantId,
    "X-Api-Key": secretKey,
    "Accept": "application/json",
  };
}

async function getZrFallbackRate(codeOrName: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey) return null;

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data } = await supabase
    .from("delivery_zones")
    .select("code,name,zr_domicile_price,zr_bureau_price,remote_price")
    .or(`code.eq.${codeOrName},name.eq.${codeOrName}`)
    .maybeSingle();

  if (!data) return null;
  return {
    service: "zr",
    territory_id: codeOrName,
    rates: {
      domicile_price: data.zr_domicile_price || data.remote_price || 0,
      bureau_price: data.zr_bureau_price || 0,
      raw: { source: "fallback", zone: data.name },
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const service = url.searchParams.get("service");
    const fromWilayaId = url.searchParams.get("from_wilaya_id") || "16"; // Alger par defaut
    const toWilayaId = url.searchParams.get("to_wilaya_id");
    const territoryId = url.searchParams.get("territory_id");

    if (!service) {
      return jsonResponse({ error: "service requis" }, 400);
    }

    const cacheKey = `${service}:${fromWilayaId}:${toWilayaId || territoryId}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.exp > Date.now()) {
      return jsonResponse(cached.data);
    }

    if (service === "yalidine") {
      if (!toWilayaId) throw new Error("to_wilaya_id requis");
      const apiId = Deno.env.get("YALIDINE_API_ID")!;
      const apiToken = Deno.env.get("YALIDINE_API_TOKEN")!;

      const resp = await fetch(`${YALIDINE_BASE}/fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${toWilayaId}`, {
        headers: { "X-API-ID": apiId, "X-API-TOKEN": apiToken },
      });
      const text = await resp.text();
      if (!resp.ok) throw new Error(`Yalidine ${resp.status}: ${text.slice(0, 200)}`);
      const json = JSON.parse(text);
      // json.per_commune contient les frais par commune avec express_home et express_desk
      const result = {
        service: "yalidine",
        from_wilaya: json.from_wilaya_name,
        to_wilaya: json.to_wilaya_name,
        per_commune: json.per_commune || {},
      };
      cache.set(cacheKey, { data: result, exp: Date.now() + TTL });
      return jsonResponse(result);
    }

    // ZR Express : /delivery-pricing/rates retourne la grille effective du compte.
    // Si le compte n'a pas l'accès API pricing, on retombe sur les tarifs locaux.
    if (!territoryId) throw new Error("territory_id requis");
    const tenantId = Deno.env.get("ZR_TENANT_ID")!;
    const secretKey = Deno.env.get("ZR_SECRET_KEY")!;

    const resp = await fetch(`${ZR_BASE}/delivery-pricing/rates`, {
      headers: zrHeaders(tenantId, secretKey),
    });
    const text = await resp.text();
    if (!resp.ok) {
      console.error(`ZR rates API ${resp.status}: ${text.slice(0, 500)}`);
      const fallback = await getZrFallbackRate(territoryId);
      if (fallback) return jsonResponse(fallback);
      return jsonResponse({ error: "Tarif ZR indisponible" }, 502);
    }
    const json = JSON.parse(text);
    const lines: any[] = json.rates || json.data || json.items || (Array.isArray(json) ? json : []);
    const match = lines.find((l) =>
      String(l.toTerritoryCode ?? "").padStart(2, "0") === String(territoryId).padStart(2, "0")
      || l.toTerritoryName === territoryId
      || l.toTerritoryId === territoryId
    );
    const home = (match?.deliveryPrices || []).find((p: any) => p.deliveryType === "home")?.price
      ?? match?.home_price ?? match?.domicile_price ?? match?.homeDeliveryPrice ?? 0;
    const desk = (match?.deliveryPrices || []).find((p: any) => p.deliveryType === "pickup-point")?.price
      ?? match?.desk_price ?? match?.bureau_price ?? match?.stopDeskPrice ?? 0;
    if (!match || (!home && !desk)) {
      const fallback = await getZrFallbackRate(territoryId);
      if (fallback) return jsonResponse(fallback);
    }
    const result = {
      service: "zr",
      territory_id: territoryId,
      rates: { domicile_price: home, bureau_price: desk, raw: match || data },
    };
    cache.set(cacheKey, { data: result, exp: Date.now() + TTL });
    return jsonResponse(result);
  } catch (err) {
    console.error("shipping-rates error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
