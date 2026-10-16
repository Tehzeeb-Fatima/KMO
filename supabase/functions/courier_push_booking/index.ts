// Supabase Edge Function: courier_push_booking
//
// Admin-invoked (or staff with the "courier" module). This is the ONLY
// place that actually creates a real booking on Courier Fast Service — a
// vendor's own "request courier booking" action just flags the order for
// review; nothing is pushed until an admin approves it here. Each order is
// pushed using the owning vendor's own linked Courier account/API token,
// never a shared admin identity.
//
// Deploy with: pnpm dlx supabase functions deploy courier_push_booking

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COURIER_API_BASE_URL = Deno.env.get("COURIER_API_BASE_URL") ?? "https://portal.courierfastservice.com/api";

Deno.serve(async (req: Request) => {
  try {
    return await handle(req);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected server error" }, 500);
  }
});

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) return json({ error: "Not authenticated" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role, admin_modules")
    .eq("id", caller.id)
    .maybeSingle();
  const isAllowed =
    callerProfile?.role === "admin" ||
    (callerProfile?.role === "staff" && (callerProfile.admin_modules ?? []).includes("courier"));
  if (!isAllowed) return json({ error: "Not authorized" }, 403);

  let body: { order_ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const orderIds = Array.isArray(body.order_ids) ? body.order_ids.filter(Boolean) : [];
  if (orderIds.length === 0) return json({ error: "order_ids is required" }, 400);

  const results: { order_id: string; ok: boolean; tracking_id?: string; error?: string }[] = [];

  for (const orderId of orderIds) {
    try {
      const { data: order } = await admin
        .from("orders")
        .select(
          "id, vendor_id, order_number, ship_name, ship_phone, ship_address_line, ship_area, ship_city, payment_method, total, courier_booking_status, order_items(product_id, quantity)",
        )
        .eq("id", orderId)
        .maybeSingle();

      if (!order) {
        results.push({ order_id: orderId, ok: false, error: "Order not found" });
        continue;
      }
      if (order.courier_booking_status !== "pending_review") {
        results.push({ order_id: orderId, ok: false, error: `Order is "${order.courier_booking_status}", not pending review` });
        continue;
      }
      if (!order.ship_name || !order.ship_phone || !order.ship_city) {
        results.push({ order_id: orderId, ok: false, error: "Order is missing shipping name, phone, or city" });
        continue;
      }

      const { data: account } = await admin
        .from("vendor_courier_accounts")
        .select("api_token")
        .eq("vendor_id", order.vendor_id)
        .maybeSingle();
      if (!account?.api_token) {
        results.push({ order_id: orderId, ok: false, error: "This vendor has not connected their Courier account yet" });
        continue;
      }

      const items = (order.order_items ?? []) as { product_id: string | null; quantity: number }[];
      const productIds = [...new Set(items.map((i) => i.product_id).filter((id): id is string => !!id))];
      let weightByProduct = new Map<string, number>();
      if (productIds.length > 0) {
        const { data: products } = await admin
          .from("products")
          .select("id, weight_grams")
          .in("id", productIds);
        weightByProduct = new Map((products ?? []).map((p) => [p.id, p.weight_grams ?? 500]));
      }
      const totalGrams = items.reduce(
        (sum, i) => sum + (i.product_id ? weightByProduct.get(i.product_id) ?? 500 : 500) * i.quantity,
        0,
      );
      const weightKg = Math.max(0.1, totalGrams / 1000);
      const pieces = items.reduce((sum, i) => sum + i.quantity, 0) || 1;
      const isCod = order.payment_method === "cod";

      const bookingRes = await fetch(`${COURIER_API_BASE_URL}/integrations/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Token": account.api_token },
        body: JSON.stringify({
          consigneeName: order.ship_name,
          consigneePhone: order.ship_phone,
          consigneeAddress: [order.ship_address_line, order.ship_area].filter(Boolean).join(", ") || order.ship_city,
          city: order.ship_city,
          weight: weightKg,
          pieces,
          description: `KMO order #${order.order_number}`,
          isCod,
          codAmount: isCod ? order.total : 0,
          externalSource: "kmo",
          externalOrderId: order.id,
          autoPush: true,
        }),
      });

      if (!bookingRes.ok) {
        const errBody = await bookingRes.text();
        results.push({ order_id: orderId, ok: false, error: `Courier ${bookingRes.status}: ${errBody.slice(0, 200)}` });
        continue;
      }
      const booking = await bookingRes.json();
      const trackingId: string | undefined = booking.internalTrackingId ?? booking.rocketTrackingId ?? undefined;

      await admin
        .from("orders")
        .update({
          courier_booking_status: "booked",
          courier_tracking_id: trackingId ?? null,
          courier_booking_id: booking.id ?? null,
          courier_approved_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      results.push({ order_id: orderId, ok: true, tracking_id: trackingId });
    } catch (err) {
      results.push({ order_id: orderId, ok: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return json({ results }, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
