import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

interface NotificationInput {
  type: string;
  title: string;
  body?: string;
  link?: string;
}

/** Notify one specific user (vendor owner, customer, etc). */
export async function notifyUser(
  supabase: Client,
  recipientId: string,
  input: NotificationInput,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .insert({ recipient_id: recipientId, ...input });
  if (error) throw error;
}

/** Broadcast a notification to every admin. */
export async function notifyAdmins(supabase: Client, input: NotificationInput): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .insert({ recipient_role: "admin", ...input });
  if (error) throw error;
}

/** RLS scopes this to the caller's own notifications (or admin broadcasts, if they're an admin). */
export async function listMyNotifications(supabase: Client, limit = 20): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function countUnreadNotifications(supabase: Client): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(supabase: Client): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}
