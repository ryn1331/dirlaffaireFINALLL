// Edge Function: shipping-locations
// Retourne la liste des wilayas/communes pour Yalidine ou ZR Express
// SECURITE: les cles API restent cote backend
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const YALIDINE_BASE = "https://api.yalidine.app/v1";
const ZR_BASE = "https://api.zrexpress.app/api/v1";

const ZR_WILAYA_UUID_BY_CODE: Record<string, string> = {
  "01": "6e978fc5-f20a-4b5f-9adf-61dd21a7672a", "02": "981f136a-996f-463e-a536-8e643daab193", "03": "00b5ef4b-ae2e-4b7f-bd26-70c1a376b69b", "04": "37c70742-df6b-4019-981a-a16a29a14748", "05": "a8c05822-e30a-4d5a-bcb3-3b3bb23c079b", "06": "295585ad-4cf4-4b7e-b276-9bb62d019749", "07": "796e70df-1102-44da-9582-2da66ead2ba6", "08": "e740c188-2bbc-4206-8999-302b17dc0e4b", "09": "a7e764cf-e9ca-4c1f-8232-89852d102aec", "10": "a1f0229c-4f34-40aa-9238-fadde6757cba", "11": "38560f06-e049-4fd2-9664-a655e552b517", "12": "5afdfab6-e505-4691-abc7-5e8bd79afad5", "13": "53c9e062-9c4e-4c77-8b71-55eabf887f83", "14": "ada5bb27-ffe5-4977-a917-3105c2b3d9c6", "15": "5bef8e95-fad8-4a15-95f0-8d6f5c80f69e", "16": "d134c182-7dac-4655-9d9b-bbdb62aa2ec4", "17": "9ee8eac2-77e5-4d70-ac49-bde455d06bee", "18": "dc851e52-55b2-4beb-a7f1-79d4e73e9458", "19": "56ee938d-7887-408e-8731-364d07ad3594", "20": "27b2042a-77f8-4c91-b62d-60934fa0daca", "21": "a9df7e26-1086-4319-8a93-19969c99c89b", "22": "2cec2b2a-cc37-480a-9183-59fdfdb65cd4", "23": "3fd318e8-7c24-480c-a106-21f6c842583d", "24": "2d1e61ff-e2af-4b4d-a592-0a6436c5fffd", "25": "e9a1e9cf-8475-4768-94cc-0888d094ff47", "26": "0e0f2d43-6d78-47dd-8bb7-0f2771cb97ff", "27": "d7175ca6-6dd7-4dfb-a399-d388e782473a", "28": "75ca308d-ab36-44e2-9702-2e2300a57b8c", "29": "a17a6482-3f48-4948-aaf2-8a653c4c1110", "30": "ada333a0-708d-476e-a97d-fd70fe661b09", "31": "e772eb46-276a-4f41-bae7-3b67e1bdc616", "32": "dca8b699-ce8b-4ad7-b8f2-560e63911383", "34": "80d1b557-03b2-4073-a8c2-89a8712a7fc8", "35": "f823492c-f79d-4c2d-befe-933bf9917a65", "36": "e6f4b09c-f63e-42af-92bc-dab9b422c34d", "38": "fb1a9f7a-81a2-4825-af92-79f9d187637f", "39": "cd82549a-b1f7-48c1-9a25-2f3f05b80b1d", "40": "d4549528-8327-4a3f-9732-5a5462c84b8d", "41": "56d30b7a-465a-462c-bc2a-3e132c89be63", "42": "1435179a-6dbb-4d9c-a186-c521b2a57319", "43": "0c8476c5-bbe4-46e4-80e5-67d3501195cc", "44": "8d2d130f-460c-4867-85ef-641341a4d586", "45": "ecdf0888-0470-4b2f-beb8-24c99b6fc9cb", "46": "fc460ec5-3e71-489c-b95b-e5301ea68341", "47": "e7b51620-74f4-4748-85c5-216fb9b01b03", "48": "ad58c5ee-868d-4acb-8f03-409f97a10370", "49": "bcb30485-37b5-4135-a508-acad8a8a9cf8", "51": "0f2dab00-094c-412c-a7d0-ebd0268d3d3c", "52": "ba12c65c-de9e-4f30-a449-6ba0b27dd7d7", "53": "7c752560-8412-4e11-8c75-ed7cd9c22be2", "54": "f30136dc-3012-4ac7-912c-33eab37393a9", "55": "442d8a1c-2e12-4a8a-9c7e-8618aac20280", "57": "eabb6505-5eef-479f-b6a3-36ba282d5237", "58": "3d19d427-08f3-492c-a1d0-e7ace3516ed2",
};

// Cache simple en memoire (TTL 1h) pour limiter les appels
const cache = new Map<string, { data: unknown; exp: number }>();
const TTL = 60 * 60 * 1000;

function getCache(key: string) {
  const v = cache.get(key);
  if (v && v.exp > Date.now()) return v.data;
  cache.delete(key);
  return null;
}
function setCache(key: string, data: unknown) {
  cache.set(key, { data, exp: Date.now() + TTL });
}

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
    "Content-Type": "application/json",
  };
}

async function getZrFallbackLocations() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey) return [];

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("code,name")
    .order("code", { ascending: true });

  if (error) {
    console.error("ZR fallback delivery_zones error:", error.message);
    return [];
  }

  return (data || []).map((zone: any) => ({
    id: zone.code,
    name: zone.name,
    code: zone.code,
    territory_id: ZR_WILAYA_UUID_BY_CODE[zone.code],
    source: "fallback",
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const service = url.searchParams.get("service"); // "yalidine" | "zr"
    const wilayaId = url.searchParams.get("wilaya_id"); // pour communes Yalidine
    const type = url.searchParams.get("type") || "wilayas"; // "wilayas" | "communes"

    if (!service || !["yalidine", "zr"].includes(service)) {
      return jsonResponse({ error: "service requis (yalidine|zr)" }, 400);
    }

    const cacheKey = `${service}:${type}:${wilayaId || "all"}`;
    const cached = getCache(cacheKey);
    if (cached) return jsonResponse(cached);

    if (service === "yalidine") {
      const apiId = Deno.env.get("YALIDINE_API_ID");
      const apiToken = Deno.env.get("YALIDINE_API_TOKEN");
      if (!apiId || !apiToken) throw new Error("Yalidine credentials missing");

      const endpoint = type === "communes" && wilayaId
        ? `${YALIDINE_BASE}/communes/?wilaya_id=${wilayaId}&page_size=200`
        : `${YALIDINE_BASE}/wilayas/?page_size=100`;

      const resp = await fetch(endpoint, {
        headers: { "X-API-ID": apiId, "X-API-TOKEN": apiToken },
      });
      const text = await resp.text();
      if (!resp.ok) throw new Error(`Yalidine ${resp.status}: ${text.slice(0, 200)}`);
      const json = JSON.parse(text);
      const data = json.data || [];
      setCache(cacheKey, data);
      return jsonResponse(data);
    }

    // ZR Express : les hubs ne sont pas les wilayas. On affiche les wilayas DZ locales,
    // avec l'UUID territoire ZR connu quand disponible. Les communes demandent un accès API ZR spécifique.
    const fallback = await getZrFallbackLocations();
    if (type === "wilayas") {
      setCache(cacheKey, fallback);
      return jsonResponse(fallback);
    }

    const tenantId = Deno.env.get("ZR_TENANT_ID");
    const secretKey = Deno.env.get("ZR_SECRET_KEY");
    if (!tenantId || !secretKey) throw new Error("ZR credentials missing");

    const cityTerritoryId = wilayaId ? ZR_WILAYA_UUID_BY_CODE[wilayaId.padStart(2, "0")] : null;
    if (!cityTerritoryId) return jsonResponse([]);

    const resp = await fetch(`${ZR_BASE}/territories/search`, {
      method: "POST",
      headers: zrHeaders(tenantId, secretKey),
      body: JSON.stringify({
        pageNumber: 1,
        pageSize: 500,
        advancedFilter: {
          logic: "and",
          filters: [
            { field: "parentId", operator: "eq", value: cityTerritoryId },
          ],
        },
      }),
    });
    const text = await resp.text();
    if (!resp.ok) {
      console.error(`ZR communes API ${resp.status}: ${text.slice(0, 500)}`);
      return jsonResponse([]);
    }
    const json = JSON.parse(text);
    const raw = json.data || json.items || json.territories || json.results || (Array.isArray(json) ? json : []);
    // Normaliser au format { id, name }
    const data = (raw as any[]).map((h: any) => ({
      id: h.id ?? h.hub_id ?? h.code,
      name: h.name ?? h.label ?? h.wilaya ?? h.title,
      code: h.code,
    })).filter((h) => h.id && h.name);
    setCache(cacheKey, data);
    return jsonResponse(data);
  } catch (err) {
    console.error("shipping-locations error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
