"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard, type UserRole } from "@kmo/shared/auth";

export function RequireAuth({
  allowedRoles,
  children,
}: {
  allowedRoles?: UserRole[];
  children: ReactNode;
}) {
  const status = useAuthGuard(allowedRoles);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated" || status === "unauthorized") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authorized") {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
