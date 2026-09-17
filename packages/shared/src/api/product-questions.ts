import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type QuestionRow = Database["public"]["Tables"]["product_questions"]["Row"];

export interface QuestionWithCustomer extends QuestionRow {
  profiles: { full_name: string | null } | null;
}

export async function listProductQuestions(
  supabase: Client,
  productId: string,
): Promise<QuestionWithCustomer[]> {
  const { data, error } = await supabase
    .from("product_questions")
    .select("*, profiles(full_name)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as QuestionWithCustomer[];
}

export async function askProductQuestion(
  supabase: Client,
  productId: string,
  customerId: string,
  question: string,
): Promise<QuestionRow> {
  const { data, error } = await supabase
    .from("product_questions")
    .insert({ product_id: productId, customer_id: customerId, question })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export interface VendorQuestionRow extends QuestionRow {
  profiles: { full_name: string | null } | null;
  products: { name: string; vendor_id: string };
}

/** Questions across every product owned by this vendor, for the vendor inbox. */
export async function listVendorQuestions(
  supabase: Client,
  vendorId: string,
): Promise<VendorQuestionRow[]> {
  const { data, error } = await supabase
    .from("product_questions")
    .select("*, profiles(full_name), products!inner(name, vendor_id)")
    .eq("products.vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as VendorQuestionRow[];
}

export async function answerProductQuestion(
  supabase: Client,
  id: string,
  answer: string,
): Promise<QuestionRow> {
  const { data, error } = await supabase
    .from("product_questions")
    .update({ answer, answered_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
