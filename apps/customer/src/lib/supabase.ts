import { createSupabaseBrowserClient } from "@kmo/shared/supabase/client";

export const supabase = createSupabaseBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
