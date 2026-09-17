import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useAuthGuard, type UserRole } from "@kmo/shared/auth";
import { getMyVendor } from "@kmo/shared/api";
import { supabase } from "../lib/supabase";
import { RedirectToLogin } from "./redirect-to-login";

export function RequireAuth({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: ReactNode;
}) {
  const status = useAuthGuard(allowedRoles);
  const { profile, signOut } = useAuth();

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ["my-vendor"],
    queryFn: () => getMyVendor(supabase),
    enabled: status === "authorized",
  });

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (status === "unauthenticated" || status === "unauthorized") {
    return <RedirectToLogin />;
  }

  if (profile?.pending_vendor) {
    return (
      <BlockedScreen
        eyebrow="Pending approval"
        title="Your store is under review"
        body="An admin needs to approve your vendor account before you can access the dashboard. We'll email you once it's approved."
        onSignOut={signOut}
      />
    );
  }

  if (!vendorLoading && vendor?.verification_status === "suspended") {
    return (
      <BlockedScreen
        eyebrow="Account suspended"
        title="Your store has been suspended"
        body="Contact Karachi Mart support if you believe this is a mistake."
        onSignOut={signOut}
      />
    );
  }

  if (!vendorLoading && vendor?.verification_status === "rejected") {
    return (
      <BlockedScreen
        eyebrow="Application rejected"
        title="Your vendor application wasn't approved"
        body="Contact Karachi Mart support for more details."
        onSignOut={signOut}
      />
    );
  }

  return <>{children}</>;
}

function BlockedScreen({
  eyebrow,
  title,
  body,
  onSignOut,
}: {
  eyebrow: string;
  title: string;
  body: string;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md rounded-xl border border-border bg-surface p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-warning">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="mt-4 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
