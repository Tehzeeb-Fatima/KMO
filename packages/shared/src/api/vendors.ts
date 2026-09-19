import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];
type VendorUpdate = Database["public"]["Tables"]["vendors"]["Update"];
type VendorInsert = Database["public"]["Tables"]["vendors"]["Insert"];

/** The signed-in vendor's own store row (owner_id = current user).
 *
 * Filters explicitly by owner_id rather than relying on RLS alone: the
 * `vendors` table also has a public-select policy for approved vendors, so
 * an unfiltered select on an approved vendor's own account returns every
 * approved vendor row (Postgres ORs permissive RLS policies together) and
 * `.maybeSingle()` throws "multiple rows returned" — which left the Store
 * Settings page stuck on "Loading your store…" forever. */
export async function getMyVendor(supabase: Client): Promise<VendorRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createVendor(
  supabase: Client,
  input: VendorInsert,
): Promise<VendorRow> {
  const { data, error } = await supabase
    .from("vendors")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateMyVendor(
  supabase: Client,
  vendorId: string,
  patch: VendorUpdate,
): Promise<VendorRow> {
  const { data, error } = await supabase
    .from("vendors")
    .update(patch)
    .eq("id", vendorId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Public storefront lookup — RLS only allows approved, non-suspended rows through. */
export async function getVendorBySlug(
  supabase: Client,
  slug: string,
): Promise<VendorRow | null> {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Admin: every vendor, optionally filtered by status. */
export async function listVendors(
  supabase: Client,
  filter?: { status?: VendorRow["verification_status"]; search?: string },
): Promise<VendorRow[]> {
  let query = supabase.from("vendors").select("*").order("created_at", {
    ascending: false,
  });
  if (filter?.status) query = query.eq("verification_status", filter.status);
  if (filter?.search) query = query.ilike("store_name", `%${filter.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getVendorById(
  supabase: Client,
  id: string,
): Promise<VendorRow | null> {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Sets a vendor's verification status and keeps `profiles.pending_vendor` in
 * sync (true only while awaiting the first decision) so the vendor app's
 * "pending approval" gate from Module 1 unlocks as soon as an admin decides.
 */
export async function setVendorStatus(
  supabase: Client,
  vendorId: string,
  status: VendorRow["verification_status"],
): Promise<VendorRow> {
  const { data, error } = await supabase
    .from("vendors")
    .update({ verification_status: status })
    .eq("id", vendorId)
    .select("*")
    .single();
  if (error) throw error;

  await supabase
    .from("profiles")
    .update({ pending_vendor: status === "pending" })
    .eq("id", data.owner_id);

  return data;
}

/** Upload a logo/cover image to the `vendor-media` bucket and return its public URL. */
export async function uploadVendorMedia(
  supabase: Client,
  vendorId: string,
  kind: "logo" | "cover",
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${vendorId}/${kind}.${ext}`;

  const { error } = await supabase.storage
    .from("vendor-media")
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("vendor-media").getPublicUrl(path);
  return data.publicUrl;
}

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

/** Categories an admin has assigned to a vendor — the only categories that
 *  vendor's "Add product" form may offer. */
export async function listVendorCategories(
  supabase: Client,
  vendorId: string,
): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("vendor_categories")
    .select("categories(*)")
    .eq("vendor_id", vendorId);
  if (error) throw error;
  return (data as unknown as { categories: CategoryRow }[])
    .map((row) => row.categories)
    .filter(Boolean);
}

/** Admin: every vendor's assigned category names in one query, for the
 *  vendors list table's Category column. */
export async function listVendorCategoryNames(
  supabase: Client,
): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from("vendor_categories")
    .select("vendor_id, categories(name)");
  if (error) throw error;
  const map: Record<string, string[]> = {};
  for (const row of data as unknown as { vendor_id: string; categories: CategoryRow | null }[]) {
    if (!row.categories) continue;
    (map[row.vendor_id] ??= []).push(row.categories.name);
  }
  return map;
}

/** Admin only (RLS): replaces a vendor's full category assignment with
 *  exactly this set. */
export async function setVendorCategories(
  supabase: Client,
  vendorId: string,
  categoryIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("vendor_categories")
    .delete()
    .eq("vendor_id", vendorId);
  if (deleteError) throw deleteError;

  if (categoryIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("vendor_categories")
    .insert(categoryIds.map((category_id) => ({ vendor_id: vendorId, category_id })));
  if (insertError) throw insertError;
}
