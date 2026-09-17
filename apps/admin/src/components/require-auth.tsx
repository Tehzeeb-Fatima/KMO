import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthGuard, type UserRole } from "@kmo/shared/auth";

export function RequireAuth({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: ReactNode;
}) {
  const status = useAuthGuard(allowedRoles);
  const location = useLocation();

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (status === "unauthenticated" || status === "unauthorized") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
