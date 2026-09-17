import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type ContactMessageRow = Database["public"]["Tables"]["contact_messages"]["Row"];

export async function submitContactMessage(
  supabase: Client,
  input: { firstName: string; lastName: string; phone: string; message: string },
): Promise<void> {
  const { error } = await supabase.from("contact_messages").insert({
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone,
    message: input.message,
  });
  if (error) throw error;
}

export async function listContactMessages(supabase: Client): Promise<ContactMessageRow[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function markContactMessageResolved(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("contact_messages").update({ status: "resolved" }).eq("id", id);
  if (error) throw error;
}
