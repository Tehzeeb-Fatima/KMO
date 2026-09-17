import { useAuth } from "./context";
import type { UserRole } from "./types";

export type AuthGuardStatus =
  | "checking"
  | "unauthenticated"
  | "unauthorized"
  | "authorized";

/**
 * Framework-agnostic auth-guard status. Each app's <RequireAuth> wraps this
 * with its own router's redirect (next/navigation for the customer app,
 * react-router-dom for vendor/admin) since the two aren't interchangeable.
 */
export function useAuthGuard(allowedRoles?: UserRole[]): AuthGuardStatus {
  const { user, profile, loading } = useAuth();

  if (loading) return "checking";
  if (!user) return "unauthenticated";
  if (allowedRoles && (!profile || !allowedRoles.includes(profile.role))) {
    return "unauthorized";
  }
  return "authorized";
}
