import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export async function createCategory(
  supabase: Client,
  name: string,
  slug: string,
): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, slug })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
