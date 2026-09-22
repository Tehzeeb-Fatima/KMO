import { useEffect } from "react";

const CUSTOMER_URL = import.meta.env.VITE_CUSTOMER_URL ?? "https://karachimartonline.com";

/**
 * The whole platform shares ONE login page — the customer app's /login,
 * which signs everyone in (customer/vendor/admin) and redirects by role.
 * This app lives on its own subdomain, so the session is shared via a cookie
 * scoped to the parent domain (see packages/shared/src/supabase/client.ts)
 * rather than same-origin localStorage.
 */
export function RedirectToLogin() {
  useEffect(() => {
    window.location.href = `${CUSTOMER_URL}/login`;
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted">
      Redirecting to sign in…
    </div>
  );
}
