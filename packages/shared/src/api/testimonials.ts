import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
export type TestimonialRow = Database["public"]["Tables"]["testimonials"]["Row"];
type TestimonialInsert = Database["public"]["Tables"]["testimonials"]["Insert"];
type TestimonialUpdate = Database["public"]["Tables"]["testimonials"]["Update"];

/** Live testimonials for the homepage, in the admin's chosen order. */
export async function listActiveTestimonials(supabase: Client): Promise<TestimonialRow[]> {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data;
}

/** Every testimonial, including hidden ones — for the admin list. */
export async function listAllTestimonials(supabase: Client): Promise<TestimonialRow[]> {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function createTestimonial(
  supabase: Client,
  input: TestimonialInsert,
): Promise<TestimonialRow> {
  const { data, error } = await supabase.from("testimonials").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateTestimonial(
  supabase: Client,
  id: string,
  patch: TestimonialUpdate,
): Promise<TestimonialRow> {
  const { data, error } = await supabase
    .from("testimonials")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTestimonial(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) throw error;
}
