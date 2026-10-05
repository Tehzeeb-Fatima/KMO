import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;

/** Admin only: the current secret that unlocks the site during maintenance. */
export async function getPreviewToken(supabase: Client): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_preview_token");
  if (error) throw error;
  return data;
}

/** Admin only: issue a new secret; anyone holding the old link loses access. */
export async function regeneratePreviewToken(supabase: Client): Promise<string> {
  const { data, error } = await supabase.rpc("regenerate_preview_token");
  if (error) throw error;
  return data;
}
