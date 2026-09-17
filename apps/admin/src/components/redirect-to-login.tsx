import { useEffect } from "react";

/**
 * The whole platform shares ONE login page — the main site's /login, which
 * signs everyone in (customer/vendor/admin) and redirects by role. This app
 * only ever lives at <main-domain>/admin/* (see vite.config.ts `base` +
 * BrowserRouter basename), so a plain top-level navigation to "/login" (no
 * /admin prefix) lands on that shared page, same-origin, same session store.
 */
export function RedirectToLogin() {
  useEffect(() => {
    window.location.href = "/login";
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted">
      Redirecting to sign in…
    </div>
  );
}
