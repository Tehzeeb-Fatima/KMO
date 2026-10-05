import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type SettingsRow = Database["public"]["Tables"]["platform_settings"]["Row"];

export async function getPlatformSettings(supabase: Client): Promise<SettingsRow> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlatformSettings(
  supabase: Client,
  patch: Partial<
    Pick<
      SettingsRow,
      | "default_commission_rate"
      | "delivery_zones"
      | "maintenance_mode"
      | "vendor_membership_fee"
      | "vendor_free_trial_months"
      | "vendor_agreement_title"
      | "vendor_agreement_body"
      | "vendor_of_week_id"
      | "vendor_of_week_image_url"
      | "bottom_category_id"
      | "show_hero_boxes"
      | "show_testimonials"
    >
  >,
): Promise<SettingsRow> {
  const { data, error } = await supabase
    .from("platform_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
