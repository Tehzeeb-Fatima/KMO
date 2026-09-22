import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

/**
 * The customer, vendor and admin apps live on three different subdomains
 * (karachimartonline.com, vendor.karachimartonline.com, admin.karachimartonline.com)
 * but share one login. localStorage is origin-scoped and wouldn't carry a
 * session across those, so the session is stored in a cookie scoped to the
 * shared parent domain instead — every subdomain reads/writes the same cookie.
 */
function sharedCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname;
  return host.endsWith("karachimartonline.com") ? ".karachimartonline.com" : undefined;
}

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

  const domain = sharedCookieDomain();

  // @supabase/ssr re-declares its own SupabaseClient generic shape, which
  // TS treats as nominally distinct from @supabase/supabase-js's even
  // though it's the same class at runtime — cast across that gap here so
  // every caller keeps using the one SupabaseClient<Database> type.
  return createBrowserClient<Database>(url, publishableKey, {
    cookieOptions: domain
      ? { domain, path: "/", sameSite: "lax", secure: true }
      : { path: "/", sameSite: "lax" },
  }) as unknown as SupabaseClient<Database>;
}
