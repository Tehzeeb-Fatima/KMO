import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Save (or refresh) this browser's push subscription for the signed-in user. */
export async function savePushSubscription(supabase: Client, sub: PushSubscriptionKeys): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in");
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: userId, ...sub }, { onConflict: "endpoint" });
  if (error) throw error;
}

/** Remove this browser's push subscription (user turned notifications off). */
export async function deletePushSubscription(supabase: Client, endpoint: string): Promise<void> {
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}

/** Whether this browser already has a saved push subscription for the signed-in user. */
export async function hasPushSubscription(supabase: Client, endpoint: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
