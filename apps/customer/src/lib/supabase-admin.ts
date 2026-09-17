import "server-only";
import { createSupabaseAdminClient } from "@kmo/shared/supabase/admin";

/**
 * Service-role Supabase client. `server-only` guarantees a build error if
 * this is ever imported from a client component or the browser bundle.
 */
export const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);
