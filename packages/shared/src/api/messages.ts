import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";
import { notifyUser } from "./notifications";

type Client = SupabaseClient<Database>;
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

const CONVERSATION_SELECT =
  "*, profiles(full_name), vendors(store_name), messages(body, created_at, sender_id, read_at)";

export interface ConversationWithParty extends ConversationRow {
  profiles: { full_name: string | null } | null;
  vendors: { store_name: string } | null;
  messages: { body: string; created_at: string; sender_id: string; read_at: string | null }[];
}

function sortByLastMessage(rows: ConversationWithParty[]): ConversationWithParty[] {
  return rows.sort((a, b) => lastMessageTime(b) - lastMessageTime(a));
}

function lastMessageTime(c: ConversationWithParty): number {
  const last = c.messages.at(-1);
  return last ? new Date(last.created_at).getTime() : new Date(c.created_at).getTime();
}

// ── customer <-> vendor ──────────────────────────────────────────────────

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
    .eq("channel", "customer_vendor")
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ customer_id: customerId, vendor_id: vendorId, channel: "customer_vendor" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Conversations for a vendor's inbox (customers only), most recently active first. */
export async function listVendorConversations(
  supabase: Client,
  vendorId: string,
): Promise<ConversationWithParty[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("vendor_id", vendorId)
    .eq("channel", "customer_vendor");
  if (error) throw error;
  return sortByLastMessage(data as unknown as ConversationWithParty[]);
}

/** Conversations for a customer's inbox (vendors only), most recently active first. */
export async function listCustomerConversations(
  supabase: Client,
  customerId: string,
): Promise<ConversationWithParty[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("customer_id", customerId)
    .eq("channel", "customer_vendor");
  if (error) throw error;
  return sortByLastMessage(data as unknown as ConversationWithParty[]);
}

// ── admin <-> customer / admin <-> vendor ────────────────────────────────

/** The customer's thread with KMO support, if either side has started one. */
export async function getCustomerAdminConversation(
  supabase: Client,
  customerId: string,
): Promise<ConversationWithParty | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("customer_id", customerId)
    .eq("channel", "admin_customer")
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ConversationWithParty | null;
}

export async function getOrCreateAdminCustomerConversation(
  supabase: Client,
  customerId: string,
): Promise<ConversationRow> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("customer_id", customerId)
    .eq("channel", "admin_customer")
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ customer_id: customerId, channel: "admin_customer" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** The vendor's thread with KMO support, if either side has started one. */
export async function getVendorAdminConversation(
  supabase: Client,
  vendorId: string,
): Promise<ConversationWithParty | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("vendor_id", vendorId)
    .eq("channel", "admin_vendor")
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ConversationWithParty | null;
}

export async function getOrCreateAdminVendorConversation(
  supabase: Client,
  vendorId: string,
): Promise<ConversationRow> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("channel", "admin_vendor")
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ vendor_id: vendorId, channel: "admin_vendor" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Admin inbox: every customer thread, most recently active first. */
export async function listAdminCustomerConversations(supabase: Client): Promise<ConversationWithParty[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("channel", "admin_customer");
  if (error) throw error;
  return sortByLastMessage(data as unknown as ConversationWithParty[]);
}

/** Admin inbox: every vendor thread, most recently active first. */
export async function listAdminVendorConversations(supabase: Client): Promise<ConversationWithParty[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("channel", "admin_vendor");
  if (error) throw error;
  return sortByLastMessage(data as unknown as ConversationWithParty[]);
}

/** Admin oversight: every customer<->vendor conversation, read-only (admin never sends into these). */
export async function listConversationsForAdminOversight(supabase: Client): Promise<ConversationWithParty[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("channel", "customer_vendor");
  if (error) throw error;
  return sortByLastMessage(data as unknown as ConversationWithParty[]);
}

// ── messages (shared by every channel) ───────────────────────────────────

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

  // Notify the other side's dashboard bell — the vendor when a customer
  // messages them, the customer or vendor when admin messages them. Nobody
  // gets notified when the other side is "admin" (no single bell to ring).
  const { data: convData } = await supabase
    .from("conversations")
    .select("customer_id, channel, vendors(owner_id)")
    .eq("id", conversationId)
    .maybeSingle();
  const conv = convData as unknown as {
    customer_id: string | null;
    channel: ConversationRow["channel"];
    vendors: { owner_id: string } | null;
  } | null;
  if (!conv) return data;

  const ownerId = conv.vendors?.owner_id;
  if (conv.channel === "customer_vendor" && senderId === conv.customer_id && ownerId) {
    await notifyUser(supabase, ownerId, {
      type: "message",
      title: "New customer message",
      body: body.slice(0, 120),
      link: "/messages",
    });
  } else if (conv.channel === "admin_customer" && senderId !== conv.customer_id && conv.customer_id) {
    await notifyUser(supabase, conv.customer_id, {
      type: "message",
      title: "New message from KMO support",
      body: body.slice(0, 120),
      link: "/account/messages",
    });
  } else if (conv.channel === "admin_vendor" && senderId !== ownerId && ownerId) {
    await notifyUser(supabase, ownerId, {
      type: "message",
      title: "New message from KMO support",
      body: body.slice(0, 120),
      link: "/messages",
    });
  }

  return data;
}
