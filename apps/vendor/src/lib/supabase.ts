import { createSupabaseBrowserClient } from "@kmo/shared/supabase/client";

export const supabase = createSupabaseBrowserClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
