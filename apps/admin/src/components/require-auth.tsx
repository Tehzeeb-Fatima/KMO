import type { ReactNode } from "react";
import { useAuthGuard, type UserRole } from "@kmo/shared/auth";
import { RedirectToLogin } from "./redirect-to-login";

export function RequireAuth({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: ReactNode;
}) {
  const status = useAuthGuard(allowedRoles);

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

  return <>{children}</>;
}
