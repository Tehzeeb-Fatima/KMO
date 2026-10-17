// Supabase Edge Function: courier_sync_statuses
//
// Admin-invoked (or staff with the "courier" module). Courier Fast Service
// has no outgoing webhook for status changes, so this pulls the latest
// status for already-booked orders via /integrations/sync-statuses and
// writes it to orders.courier_live_status. Scoped per vendor, using each
// vendor's own API token, since tracking numbers only resolve against the
// merchant that owns them.
//
// Deploy with: pnpm dlx supabase functions deploy courier_sync_statuses

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
    body = {};
  }
  const requestedIds = Array.isArray(body.order_ids) ? body.order_ids.filter(Boolean) : null;

  let query = admin
    .from("orders")
    .select("id, vendor_id, courier_tracking_id")
    .eq("courier_booking_status", "booked")
    .not("courier_tracking_id", "is", null);
  if (requestedIds && requestedIds.length > 0) query = query.in("id", requestedIds);
  const { data: orders, error: ordersError } = await query;
  if (ordersError) return json({ error: ordersError.message }, 500);
  if (!orders || orders.length === 0) return json({ updated: 0, results: [] }, 200);

  const byVendor = new Map<string, { id: string; tracking: string }[]>();
  for (const o of orders) {
    if (!o.courier_tracking_id) continue;
    const list = byVendor.get(o.vendor_id) ?? [];
    list.push({ id: o.id, tracking: o.courier_tracking_id });
    byVendor.set(o.vendor_id, list);
  }

  const results: { order_id: string; ok: boolean; status?: string; error?: string }[] = [];
  let updated = 0;

  for (const [vendorId, items] of byVendor) {
    const { data: account } = await admin
      .from("vendor_courier_accounts")
      .select("api_token")
      .eq("vendor_id", vendorId)
      .maybeSingle();
    if (!account?.api_token) {
      for (const item of items) {
        results.push({ order_id: item.id, ok: false, error: "Vendor has no linked Courier account" });
      }
      continue;
    }

    try {
      const res = await fetch(`${COURIER_API_BASE_URL}/integrations/sync-statuses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Token": account.api_token },
        body: JSON.stringify({ trackingNumbers: items.map((i) => i.tracking) }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        for (const item of items) {
          results.push({ order_id: item.id, ok: false, error: `Courier ${res.status}: ${errBody.slice(0, 200)}` });
        }
        continue;
      }
      const bookings: {
        internalTrackingId?: string;
        rocketTrackingId?: string;
        status?: string;
        expectedDeliveryDate?: string | null;
      }[] = await res.json();

      for (const item of items) {
        const match = bookings.find(
          (b) => b.internalTrackingId === item.tracking || b.rocketTrackingId === item.tracking,
        );
        if (!match) {
          results.push({ order_id: item.id, ok: false, error: "Not found in Courier's response" });
          continue;
        }
        await admin
          .from("orders")
          .update({
            courier_live_status: match.status ?? null,
            courier_expected_delivery: match.expectedDeliveryDate ?? null,
          })
          .eq("id", item.id);
        updated += 1;
        results.push({ order_id: item.id, ok: true, status: match.status });
      }
    } catch (err) {
      for (const item of items) {
        results.push({
          order_id: item.id,
          ok: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  return json({ updated, results }, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
