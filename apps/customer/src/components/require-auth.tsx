"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type UserRole } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";

/**
 * Reads `user`/`profile` directly (rather than the shared `useAuthGuard`
 * status) so it can tell "no session yet" apart from "session exists but the
 * profile row hasn't loaded yet" — the latter briefly looks role-less right
 * after `signInAnonymously()` resolves, and must not bounce to /login.
 */
export function RequireAuth({
  allowedRoles,
  children,
}: {
  allowedRoles?: UserRole[];
  children: ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const allowsGuest = !allowedRoles || allowedRoles.includes("customer");
  const startedGuestSignIn = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // First-time visitor with no cart/account yet — give them a silent
      // anonymous session instead of bouncing to /login. It becomes a real
      // account once they enter an email at checkout.
      if (allowsGuest) {
        if (!startedGuestSignIn.current) {
          startedGuestSignIn.current = true;
          supabase.auth.signInAnonymously();
        }
        return;
      }
      router.replace("/login");
      return;
    }

    if (!profile) return; // profile row still loading — wait, don't redirect

    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      router.replace("/login");
    }
  }, [loading, user, profile, allowedRoles, allowsGuest, router]);

  const ready =
    !loading && !!user && !!profile && (!allowedRoles || allowedRoles.includes(profile.role));

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
