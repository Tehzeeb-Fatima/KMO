import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdminUsers, setUserRole } from "@kmo/shared/api";
import { ConfirmDialog } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

type Role = "customer" | "vendor" | "admin" | "staff";

const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  vendor: "Vendor",
  admin: "Admin",
  staff: "Staff",
};

/** Dashboard sections an admin can hand to a staff user. Keys match dashboard-nav.ts. */
const STAFF_MODULES: { key: string; label: string }[] = [
  { key: "vendors", label: "Vendors" },
  { key: "orders", label: "Orders" },
  { key: "products", label: "Products" },
  { key: "customers", label: "Customers" },
  { key: "payouts", label: "Payouts" },
  { key: "categories", label: "Categories" },
  { key: "couriers", label: "Couriers" },
  { key: "promotions", label: "Promotions" },
  { key: "banners", label: "Banners" },
  { key: "returns", label: "Returns" },
  { key: "reviews", label: "Reviews" },
  { key: "contact", label: "Contact requests" },
  { key: "audit-log", label: "Audit log" },
  { key: "settings", label: "Settings" },
];

type Target = { id: string; name: string; role: Role; modules: string[] };
type Pending =
  | { kind: "role"; target: Target; to: Role }
  | { kind: "modules"; target: Target; modules: string[] };

export function UsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Pending | null>(null);
  const [staffEdit, setStaffEdit] = useState<{ target: Target; modules: string[] } | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listAdminUsers(supabase),
  });

  const save = useMutation({
    mutationFn: (p: Pending) => {
      if (p.kind === "role") {
        return setUserRole(supabase, p.target.id, p.to, p.to === "staff" ? p.target.modules : []);
      }
      return setUserRole(supabase, p.target.id, "staff", p.modules);
    },
    onSuccess: async () => {
      setPending(null);
      setStaffEdit(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  function requestRoleChange(target: Target, to: Role) {
    if (to === "staff") {
      setStaffEdit({ target: { ...target, role: to }, modules: target.modules });
      return;
    }
    setPending({ kind: "role", target, to });
  }

  function confirmMessage(p: Pending): string {
    if (p.kind === "modules") {
      return `${p.target.name} will be able to open: ${p.modules.length ? p.modules.join(", ") : "only Overview"}.`;
    }
    const from = ROLE_LABELS[p.target.role];
    const to = ROLE_LABELS[p.to];
    return `${p.target.name} will move from ${from} to ${to}. Access changes the next time they sign in.`;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Customer uses the store, Vendor uses the vendor dashboard, Admin has full access to this dashboard, and Staff
        only sees the sections you choose.
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-[1.3fr_1.4fr_1.2fr_1fr] bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Joined</span>
        </div>
        {isLoading ? (
          <p className="p-5 text-sm text-muted">Loading…</p>
        ) : !users || users.length === 0 ? (
          <p className="p-5 text-sm text-muted">No users yet.</p>
        ) : (
          users.map((u) => {
            const role = u.role as Role;
            const isSelf = u.id === user?.id;
            const target: Target = {
              id: u.id,
              name: u.full_name ?? u.email ?? "this user",
              role,
              modules: u.admin_modules ?? [],
            };
            return (
              <div key={u.id} className="grid grid-cols-[1.3fr_1.4fr_1.2fr_1fr] items-center border-t border-[#F5F0EE] px-5 py-4 text-[13px]">
                <span className="font-bold text-ink-dark">
                  {u.full_name ?? "User"}
                  {isSelf ? <span className="ml-2 text-xs font-normal text-muted">(you)</span> : null}
                </span>
                <span className="truncate text-ink-dark">{u.email ?? "-"}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <select
                    value={role}
                    disabled={isSelf}
                    onChange={(e) => {
                      const to = e.target.value as Role;
                      if (to !== role) requestRoleChange(target, to);
                    }}
                    className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] text-ink-dark disabled:opacity-60"
                  >
                    {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  {role === "staff" && !isSelf ? (
                    <button
                      type="button"
                      onClick={() => setStaffEdit({ target, modules: target.modules })}
                      className="text-xs font-bold text-accent"
                    >
                      Edit access ({target.modules.length})
                    </button>
                  ) : null}
                  {role === "vendor" && u.pending_vendor ? (
                    <span className="text-xs text-muted">pending approval</span>
                  ) : null}
                </span>
                <span className="text-muted">
                  {new Date(u.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {staffEdit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-[480px] rounded-xl bg-surface p-6">
            <p className="text-[17px] font-bold text-ink-dark">Staff access for {staffEdit.target.name}</p>
            <p className="mt-1 text-xs text-muted">Pick the sections this person can open. Overview is always available.</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {STAFF_MODULES.map((m) => {
                const checked = staffEdit.modules.includes(m.key);
                return (
                  <label key={m.key} className="flex items-center gap-2 text-[13px] text-ink-dark">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setStaffEdit({
                          ...staffEdit,
                          modules: checked
                            ? staffEdit.modules.filter((k) => k !== m.key)
                            : [...staffEdit.modules, m.key],
                        })
                      }
                    />
                    {m.label}
                  </label>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStaffEdit(null)}
                className="rounded-md border border-border px-4 py-2 text-[13px] font-semibold text-ink-dark"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const isNew = staffEdit.target.role !== "staff";
                  if (isNew) setPending({ kind: "role", target: { ...staffEdit.target, modules: staffEdit.modules }, to: "staff" });
                  else setPending({ kind: "modules", target: staffEdit.target, modules: staffEdit.modules });
                }}
                className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!pending}
        title="Change access?"
        message={pending ? confirmMessage(pending) : undefined}
        confirmLabel="Save"
        loading={save.isPending}
        onConfirm={() => {
          if (pending) save.mutate(pending);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}