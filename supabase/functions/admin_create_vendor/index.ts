// Supabase Edge Function: admin_create_vendor
//
// Lets a signed-in admin create a vendor account directly from the admin
// dashboard's "+ Add vendor" button, instead of waiting for a self-signup.
// Runs with the service-role key because creating an auth user (and
// therefore, via the handle_new_user trigger, its profiles/vendors rows)
// requires the Admin API, which must never be called from the browser.
//
// Deploy with: pnpm dlx supabase functions deploy admin_create_vendor

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) return json({ error: "Not authenticated" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .maybeSingle();
  if (callerProfile?.role !== "admin") {
    return json({ error: "Admins only" }, 403);
  }

  let body: {
    full_name?: string;
    email?: string;
    phone?: string;
    store_name?: string;
    area?: string;
    category_ids?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  const storeName = body.store_name?.trim();
  if (!email || !storeName) {
    return json({ error: "email and store_name are required" }, 400);
  }
  const categoryIds = Array.isArray(body.category_ids) ? body.category_ids : [];

  // Creates the auth user AND emails them an invite link to set their own
  // password. The existing handle_new_user trigger fires on this insert
  // just like a self-signup, creating the profiles + vendors rows.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: body.full_name ?? null,
      phone: body.phone ?? null,
      role: "vendor",
      pending_vendor: true,
      store_name: storeName,
      area: body.area ?? null,
    },
  });
  if (inviteError || !invited.user) {
    return json({ error: inviteError?.message ?? "Failed to create the vendor account" }, 400);
  }

  // Give the trigger a moment to run before we look for the row it creates.
  let vendorRow: { id: string; slug: string } | null = null;
  for (let attempt = 0; attempt < 5 && !vendorRow; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300));
    const { data } = await admin
      .from("vendors")
      .select("id, slug")
      .eq("owner_id", invited.user.id)
      .maybeSingle();
    if (data) vendorRow = data;
  }
  if (!vendorRow) {
    return json({ error: "Vendor account created, but its store row did not appear in time." }, 500);
  }

  // Admin-created vendors are approved immediately - there's no separate
  // application to review.
  const { error: updateError } = await admin
    .from("vendors")
    .update({ verification_status: "approved" })
    .eq("id", vendorRow.id);
  if (updateError) return json({ error: updateError.message }, 500);

  await admin.from("profiles").update({ pending_vendor: false }).eq("id", invited.user.id);

  if (categoryIds.length > 0) {
    await admin
      .from("vendor_categories")
      .insert(categoryIds.map((category_id) => ({ vendor_id: vendorRow!.id, category_id })));
  }

  return json({ vendor_id: vendorRow.id, slug: vendorRow.slug, email }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
