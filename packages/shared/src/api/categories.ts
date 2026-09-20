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

export async function updateCategoryImage(
  supabase: Client,
  id: string,
  imageUrl: string,
): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from("categories")
    .update({ image_url: imageUrl })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Upload a category thumbnail to the `category-media` bucket and return its public URL. */
export async function uploadCategoryImage(
  supabase: Client,
  categoryId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${categoryId}/image.${ext}`;

  const { error } = await supabase.storage
    .from("category-media")
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("category-media").getPublicUrl(path);
  return data.publicUrl;
}
