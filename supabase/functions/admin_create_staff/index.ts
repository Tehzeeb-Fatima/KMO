// Supabase Edge Function: admin_create_staff
//
// Lets a signed-in admin create a staff login with an email, a password and
// the dashboard modules that person may open.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Keep in step with STAFF_MODULES in apps/admin/src/pages/users-page.tsx.
const ALLOWED_MODULES = new Set([
  "vendors", "orders", "products", "customers", "payouts", "categories", "couriers", "courier",
  "delivery-caps", "promotions", "loyalty", "banners", "testimonials", "returns", "reviews",
  "contact", "messages", "audit-log", "settings",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user) return json({ error: "Please sign in again." }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (callerProfile?.role !== "admin") return json({ error: "Only admins can add staff." }, 403);

    const body = (await req.json().catch(() => null)) as {
      fullName?: string;
      email?: string;
      password?: string;
      modules?: unknown;
    } | null;
    const fullName = body?.fullName?.trim() ?? "";
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";
    const rawModules = Array.isArray(body?.modules) ? body.modules : [];

    if (!fullName) return json({ error: "Enter the staff member's name." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
    if (rawModules.length === 0) return json({ error: "Give access to at least one section." }, 400);
    if (!rawModules.every((m) => typeof m === "string" && ALLOWED_MODULES.has(m))) {
      return json({ error: "Unknown section selected." }, 400);
    }
    const modules = [...new Set(rawModules as string[])];

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError || !created.user) {
      const exists = /already|registered|exists/i.test(createError?.message ?? "");
      return json(
        {
          error: exists
            ? "This email already has an account. Change its role to Staff in the table below instead."
            : (createError?.message ?? "Couldn't create the account."),
        },
        exists ? 409 : 400,
      );
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({ role: "staff", admin_modules: modules, full_name: fullName })
      .eq("id", created.user.id);
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: "Couldn't set staff access, so the account was not created." }, 500);
    }

    await admin.from("audit_logs").insert({
      actor_id: userData.user.id,
      action: "user.staff_created",
      target_type: "profile",
      target_id: created.user.id,
      metadata: { email, modules },
    });

    return json({ ok: true, id: created.user.id });
  } catch {
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
