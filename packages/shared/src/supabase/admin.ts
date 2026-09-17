import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

/**
 * SERVER-ONLY Supabase client using the secret (service role) key.
 * This bypasses Row Level Security — never import this file from client
 * components, browser bundles, or the vendor/admin Vite SPAs.
 *
 * Only use inside trusted server contexts, e.g. Next.js Route Handlers,
 * Server Actions, or a backend service.
 */
export function createSupabaseAdminClient(
  url: string,
  secretKey: string,
): SupabaseClient<Database> {
  if (!url || !secretKey) {
    throw new Error("createSupabaseAdminClient: missing Supabase url or secret key");
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
