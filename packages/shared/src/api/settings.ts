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
  patch: Partial<Pick<SettingsRow, "default_commission_rate" | "delivery_zones">>,
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
