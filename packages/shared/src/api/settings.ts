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
      | "loyalty_spend_tiers"
      | "delivery_zones"
      | "maintenance_mode"
      | "vendor_membership_fee"
      | "vendor_free_trial_months"
      | "commission_free_months"
      | "vendor_agreement_title"
      | "vendor_agreement_body"
      | "vendor_of_week_id"
      | "vendor_of_week_image_url"
      | "bottom_category_id"
      | "show_hero_boxes"
      | "show_testimonials"
      | "default_delivery_fee"
      | "free_delivery_threshold"
      | "whatsapp_number"
      | "dc_reminder_enabled"
      | "dc_info_popup_enabled"
      | "loyalty_enabled"
      | "loyalty_point_value"
      | "loyalty_min_redeem_points"
      | "loyalty_max_redeem_percent"
      | "vendor_tier_benefits"
      | "loyalty_expiry_months"
      | "loyalty_repeat_every"
      | "loyalty_repeat_bonus_points"
      | "loyalty_referrer_points"
      | "loyalty_referee_points"
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

/** Hides (false) or brings back (true) every product discount. Returns how many products changed. */
export async function setProductDiscounts(supabase: Client, enabled: boolean): Promise<number> {
  const { data, error } = await supabase.rpc("admin_set_product_discounts", { p_enabled: enabled });
  if (error) throw error;
  return data;
}
