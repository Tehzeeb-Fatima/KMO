import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export interface ConversationWithParty extends ConversationRow {
  profiles: { full_name: string | null } | null;
  vendors: { store_name: string } | null;
  messages: { body: string; created_at: string; sender_id: string; read_at: string | null }[];
}

export async function getOrCreateConversation(
  supabase: Client,
  customerId: string,
  vendorId: string,
): Promise<ConversationRow> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("customer_id", customerId)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ customer_id: customerId, vendor_id: vendorId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Conversations for a vendor's inbox, most recently active first. */
export async function listVendorConversations(
  supabase: Client,
  vendorId: string,
): Promise<ConversationWithParty[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*, profiles(full_name), vendors(store_name), messages(body, created_at, sender_id, read_at)")
    .eq("vendor_id", vendorId);
  if (error) throw error;
  const rows = data as unknown as ConversationWithParty[];
  return rows.sort((a, b) => lastMessageTime(b) - lastMessageTime(a));
}

/** Conversations for a customer, most recently active first. */
export async function listCustomerConversations(
  supabase: Client,
  customerId: string,
): Promise<ConversationWithParty[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*, profiles(full_name), vendors(store_name), messages(body, created_at, sender_id, read_at)")
    .eq("customer_id", customerId);
  if (error) throw error;
  const rows = data as unknown as ConversationWithParty[];
  return rows.sort((a, b) => lastMessageTime(b) - lastMessageTime(a));
}

function lastMessageTime(c: ConversationWithParty): number {
  const last = c.messages.at(-1);
  return last ? new Date(last.created_at).getTime() : new Date(c.created_at).getTime();
}

export async function listMessages(supabase: Client, conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function sendMessage(
  supabase: Client,
  conversationId: string,
  senderId: string,
  body: string,
): Promise<MessageRow> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
