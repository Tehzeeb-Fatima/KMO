import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Cart/wishlist actions need a `customer_id` even for a first-time visitor
 * who hasn't signed up. If there's no session yet, this silently starts an
 * anonymous one (Supabase's `signInAnonymously`) so `cart_items`/`wishlists`
 * can be written under the normal owner-only RLS policies — no schema or
 * RLS changes needed. The anonymous account becomes a real one at checkout
 * (see checkout/page.tsx), once the guest provides an email.
 */
export async function ensureCustomerId(user: User | null): Promise<string> {
  if (user) return user.id;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error("Couldn't start a session. Please check your connection and try again.");
  }
  return data.user.id;
}
