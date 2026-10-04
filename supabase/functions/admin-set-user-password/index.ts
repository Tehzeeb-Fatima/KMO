// Supabase Edge Function: admin-set-user-password
//
// Lets a signed-in admin set a new password for any account (for example a
// vendor who lost access). Verifies the caller is an admin, updates the
// password with the service-role key, and writes an audit log entry.
//
// Deploy with: pnpm dlx supabase functions deploy admin-set-user-password

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return json({ error: "Please sign in again." }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (callerProfile?.role !== "admin") return json({ error: "Only admins can change passwords." }, 403);

  let body: { userId?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const userId = body.userId ?? "";
  const password = body.password ?? "";
  if (!userId) return json({ error: "Missing user." }, 400);
  if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password });
  if (updateError) return json({ error: updateError.message }, 400);

  await admin.from("audit_logs").insert({
    actor_id: userData.user.id,
    action: "user.password_reset",
    target_type: "profile",
    target_id: userId,
    metadata: {},
  });

  return json({ ok: true });
});
