// Edge Function: create-shipment
// Cree l'expedition dans Yalidine ou ZR Express quand l'admin confirme la commande
// AUTH requise (admin connecte)
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const YALIDINE_BASE = "https://api.yalidine.app/v1";
const ZR_BASE = "https://api.zrexpress.app/api/v1";

function zrHeaders(tenantId: string, secretKey: string) {
  return {
    "X-Tenant": tenantId,
    "X-Api-Key": secretKey,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: admin uniquement
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = (claims.claims as any).sub;
    // Verify admin role
    const adminCheck = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleRow } = await adminCheck
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { order_id } = body;
    if (!order_id) throw new Error("order_id requis");

    // Service role pour lire la commande
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: order, error: oErr } = await admin.from("orders").select("*").eq("id", order_id).single();
    if (oErr || !order) throw new Error("Commande introuvable");
    if (order.tracking_number) {
      return new Response(JSON.stringify({ ok: true, tracking_number: order.tracking_number, already: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items } = await admin.from("order_items").select("*").eq("order_id", order_id);
    const productList = (items || []).map((i: any) => `${i.product_name} x${i.quantity}`).join(", ");

    const isYalidine = (order.service_livraison || "").startsWith("yalidine");
    let tracking = "";
    let labelUrl = "";

    if (isYalidine) {
      const apiId = Deno.env.get("YALIDINE_API_ID")!;
      const apiToken = Deno.env.get("YALIDINE_API_TOKEN")!;
      const isStopdesk = order.delivery_type === "bureau";

      const payload = [{
        order_id: order.order_number,
        from_wilaya_name: "Alger",
        firstname: order.client_name.split(" ")[0] || order.client_name,
        familyname: order.client_name.split(" ").slice(1).join(" ") || "-",
        contact_phone: order.client_phone,
        address: order.address,
        to_commune_name: order.commune,
        to_wilaya_name: order.wilaya,
        product_list: productList || "Produits",
        price: order.total,
        do_insurance: false,
        declared_value: order.subtotal,
        length: 20, width: 15, height: 10, weight: 1,
        freeshipping: false,
        is_stopdesk: isStopdesk,
        has_exchange: false,
        product_to_collect: null,
      }];

      const resp = await fetch(`${YALIDINE_BASE}/parcels/`, {
        method: "POST",
        headers: { "X-API-ID": apiId, "X-API-TOKEN": apiToken, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await resp.text();
      if (!resp.ok) throw new Error(`Yalidine ${resp.status}: ${text.slice(0, 300)}`);
      const json = JSON.parse(text);
      const first = json[order.order_number] || Object.values(json)[0] as any;
      if (!first?.success) throw new Error(`Yalidine: ${first?.message || text.slice(0, 200)}`);
      tracking = first.tracking;
      labelUrl = first.label || "";
    } else {
      // ZR Express
      const tenantId = Deno.env.get("ZR_TENANT_ID")!;
      const secretKey = Deno.env.get("ZR_SECRET_KEY")!;

      const payload = {
        external_id: order.order_number,
        recipient: {
          name: order.client_name,
          phone: order.client_phone,
          address: order.address,
          territory: order.wilaya,
          commune: order.commune,
        },
        delivery_type: order.delivery_type,
        amount: order.total,
        product_description: productList || "Produits",
        weight: 1,
      };

      const resp = await fetch(`${ZR_BASE}/parcels`, {
        method: "POST",
        headers: zrHeaders(tenantId, secretKey),
        body: JSON.stringify(payload),
      });
      const text = await resp.text();
      if (!resp.ok) throw new Error(`ZR ${resp.status}: ${text.slice(0, 300)}`);
      const json = JSON.parse(text);
      tracking = json.tracking_number || json.data?.tracking_number || json.tracking || "";
      labelUrl = json.label_url || json.data?.label_url || "";
      if (!tracking) throw new Error("ZR: tracking_number manquant dans la reponse");
    }

    await admin.from("orders").update({
      tracking_number: tracking,
      shipping_label_url: labelUrl || null,
      shipping_created_at: new Date().toISOString(),
      shipping_error: null,
      status: "Expediee",
    }).eq("id", order_id);

    return new Response(JSON.stringify({ ok: true, tracking_number: tracking, label_url: labelUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-shipment error:", err);
    const msg = (err as Error).message;
    // Log l'erreur dans la commande si possible
    try {
      const body = await req.clone().json();
      if (body?.order_id) {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await admin.from("orders").update({ shipping_error: msg.slice(0, 500) }).eq("id", body.order_id);
      }
    } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
