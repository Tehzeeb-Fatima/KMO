// Supabase Edge Function: courier_connect
//
// Vendor-invoked. Links a vendor's KMO account to their own account on the
// Courier Fast Service portal (portal.courierfastservice.com), using the
// one-time password admin assigned them (stored in vendor_courier_accounts,
// never sent to the browser otherwise). On success, stores the resulting
// Courier API token server-side only — the browser never sees it.
//
// Deploy with: pnpm dlx supabase functions deploy courier_connect

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

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const password = body.password?.trim();
  if (!password) return json({ error: "Password is required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", caller.id)
    .maybeSingle();

  const { data: vendor } = await admin
    .from("vendors")
    .select("id, store_name, phone, courier_connected")
    .eq("owner_id", caller.id)
    .maybeSingle();
  if (!vendor) return json({ error: "No vendor account found for this user" }, 403);
  if (vendor.courier_connected) return json({ connected: true }, 200);

  const { data: account } = await admin
    .from("vendor_courier_accounts")
    .select("pending_password")
    .eq("vendor_id", vendor.id)
    .maybeSingle();
  if (!account?.pending_password) {
    return json({ error: "Admin has not set a Courier password for you yet. Please contact admin." }, 400);
  }
  if (account.pending_password !== password) {
    return json({ error: "Incorrect password. Please check with admin and try again." }, 400);
  }

  const email = (caller.email ?? profile?.email ?? "").toLowerCase();
  if (!email) return json({ error: "Your KMO account has no email on file" }, 400);

  // Try logging in first (account may already exist on Courier); fall back
  // to registering a brand-new merchant with the same email + password.
  let courierUserId: string | null = null;
  let accessToken: string | null = null;

  const loginRes = await fetch(`${COURIER_API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (loginRes.ok) {
    const loginData = await loginRes.json();
    accessToken = loginData.accessToken;
    courierUserId = loginData.user?.id ?? null;
  } else {
    const registerRes = await fetch(`${COURIER_API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        companyName: vendor.store_name,
        contactPerson: profile?.full_name || vendor.store_name,
        phone: vendor.phone || undefined,
      }),
    });
    if (!registerRes.ok) {
      const errBody = await registerRes.text();
      return json(
        { error: `Could not connect to Courier Fast Service: ${registerRes.status} ${errBody.slice(0, 200)}` },
        502,
      );
    }
    const registerData = await registerRes.json();
    accessToken = registerData.accessToken;
    courierUserId = registerData.user?.id ?? null;
  }

  if (!accessToken) {
    return json({ error: "Courier did not return an access token" }, 502);
  }

  const tokenRes = await fetch(`${COURIER_API_BASE_URL}/api-tokens/regenerate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    return json(
      { error: `Connected, but could not fetch an integration token: ${tokenRes.status} ${errBody.slice(0, 200)}` },
      502,
    );
  }
  const tokenData = await tokenRes.json();
  const apiToken: string | undefined = tokenData.token;
  if (!apiToken) return json({ error: "Courier did not return an API token" }, 502);

  const { error: upsertError } = await admin.from("vendor_courier_accounts").upsert({
    vendor_id: vendor.id,
    pending_password: null,
    api_token: apiToken,
    courier_merchant_id: courierUserId,
    connected_at: new Date().toISOString(),
  });
  if (upsertError) return json({ error: upsertError.message }, 500);

  await admin.from("vendors").update({ courier_connected: true }).eq("id", vendor.id);

  return json({ connected: true }, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
