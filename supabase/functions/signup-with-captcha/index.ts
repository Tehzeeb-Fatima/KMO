// Supabase Edge Function: signup-with-captcha
//
// Verifies the Cloudflare Turnstile token server-side, then creates the account
// through the normal Auth signup endpoint. Deployed with --no-verify-jwt because
// visitors calling it have no session yet.
//
// Deploy with: pnpm dlx supabase functions deploy signup-with-captcha --no-verify-jwt

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
  if (req.method !== "POST") return json({ error: { message: "Method not allowed" } }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!turnstileSecret) return json({ error: { message: "Captcha is not configured." } }, 500);

  let body: { email?: string; password?: string; data?: Record<string, unknown>; captchaToken?: string; redirectTo?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: { message: "Invalid JSON body" } }, 400);
  }

  if (!body.captchaToken) return json({ error: { message: "Please complete the captcha." } }, 400);

  const verifyForm = new FormData();
  verifyForm.append("secret", turnstileSecret);
  verifyForm.append("response", body.captchaToken);
  const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: verifyForm,
  });
  const verify = (await verifyRes.json()) as { success?: boolean };
  if (!verify.success) return json({ error: { message: "Captcha check failed. Please try again." } }, 400);

  const signupUrl = `${supabaseUrl}/auth/v1/signup${
    body.redirectTo ? `?redirect_to=${encodeURIComponent(body.redirectTo)}` : ""
  }`;
  const signupRes = await fetch(signupUrl, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password, data: body.data ?? {} }),
  });
  const result = await signupRes.json();
  if (!signupRes.ok) {
    return json({ error: { message: result.msg ?? result.message ?? "Sign up failed." } }, 200);
  }
  return json({ user: result.user ?? result, session: result.session ?? null });
});
