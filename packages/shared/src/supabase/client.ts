import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

/**
 * Browser/client-safe Supabase client factory.
 * Pass the project URL and the PUBLISHABLE (anon) key only — never the secret key.
 *
 * Each app wires this up with its own env vars, e.g.:
 *   // Next.js (apps/customer)
 *   createSupabaseBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
 *
 *   // Vite (apps/vendor, apps/admin)
 *   createSupabaseBrowserClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
 */
export function createSupabaseBrowserClient(
  url: string,
  publishableKey: string,
): SupabaseClient<Database> {
  if (!url || !publishableKey) {
    throw new Error(
      "createSupabaseBrowserClient: missing Supabase url or publishable key",
    );
  }

  return createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
