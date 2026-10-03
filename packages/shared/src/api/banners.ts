import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
export type BannerRow = Database["public"]["Tables"]["banners"]["Row"];
type BannerInsert = Database["public"]["Tables"]["banners"]["Insert"];
type BannerUpdate = Database["public"]["Tables"]["banners"]["Update"];

/** Live homepage slides, in the admin's chosen order. */
export async function listActiveBanners(supabase: Client): Promise<BannerRow[]> {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data;
}

/** Every banner, including paused ones — for the admin list. */
export async function listAllBanners(supabase: Client): Promise<BannerRow[]> {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function createBanner(supabase: Client, input: BannerInsert): Promise<BannerRow> {
  const { data, error } = await supabase.from("banners").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateBanner(
  supabase: Client,
  id: string,
  patch: BannerUpdate,
): Promise<BannerRow> {
  const { data, error } = await supabase
    .from("banners")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBanner(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) throw error;
}
