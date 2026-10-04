import type { ReactNode } from "react";
import { useAuth, useAuthGuard, type UserRole } from "@kmo/shared/auth";
import { canAccessModule } from "../dashboard-nav";
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

export function ModuleRoute({ module, children }: { module: string; children: ReactNode }) {
  const { profile } = useAuth();

  if (!canAccessModule(profile, module)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        You do not have access to this section. Ask an admin to grant it.
      </div>
    );
  }

  return <>{children}</>;
}