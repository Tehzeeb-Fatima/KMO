// Supabase Edge Function: claim-guest-account
//
// Turns a guest checkout (anonymous session) into a real account. The guest's
// email is set and confirmed server-side, then Supabase sends a "set your
// password" link through the project SMTP. The customer opens the link, lands
// on /reset-password and picks a password. Orders stay on the same user id.
//
// Deploy with: pnpm dlx supabase functions deploy claim-guest-account

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
  if (!userData.user.is_anonymous) {
    return json({ error: "This account already has an email." }, 400);
  }

  let body: { email?: string; redirectTo?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }
  const redirectTo = body.redirectTo ?? "";

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { error: updateError } = await admin.auth.admin.updateUserById(userData.user.id, {
    email,
    email_confirm: true,
  });
  if (updateError) {
    const msg = updateError.message.toLowerCase().includes("already")
      ? "This email is already registered. Please sign in, then check out."
      : updateError.message;
    return json({ error: msg }, 400);
  }

  // Sends the recovery email (set-password link) through the project SMTP.
  const recoverUrl = `${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`;
  const recoverRes = await fetch(recoverUrl, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!recoverRes.ok) {
    return json({ error: "Account saved, but the password email could not be sent. Use Forgot password." }, 502);
  }

  return json({ ok: true });
});
