import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getVendorById,
  listCategories,
  listMyProducts,
  listVendorCategories,
  listVendorCategoryNames,
  listVendors,
  logAdminAction,
  setVendorCategories,
  setVendorStatus,
} from "@kmo/shared/api";
import { StatusBadge, type StatusBadgeVariant } from "@kmo/shared/ui";
import type { VendorVerificationStatus } from "@kmo/shared/types";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

const STATUS_META: Record<
  VendorVerificationStatus,
  { label: string; variant: StatusBadgeVariant }
> = {
  approved: { label: "Active", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  suspended: { label: "Suspended", variant: "danger" },
  rejected: { label: "Rejected", variant: "danger" },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type View = { mode: "list" } | { mode: "detail"; id: string } | { mode: "add" };

export function VendorsPage() {
  const [view, setView] = useState<View>({ mode: "list" });

  if (view.mode === "detail") {
    return <VendorDetail vendorId={view.id} onBack={() => setView({ mode: "list" })} />;
  }
  if (view.mode === "add") {
    return <AddVendorForm onBack={() => setView({ mode: "list" })} />;
  }
  return (
    <VendorsList
      onOpen={(id) => setView({ mode: "detail", id })}
      onAdd={() => setView({ mode: "add" })}
    />
  );
}

function VendorsList({
  onOpen,
  onAdd,
}: {
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VendorVerificationStatus | "all">("all");

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: () => listVendors(supabase),
  });

  const { data: categoryNames } = useQuery({
    queryKey: ["admin-vendor-category-names"],
    queryFn: () => listVendorCategoryNames(supabase),
  });

  const filtered = useMemo(() => {
    if (!vendors) return [];
    return vendors.filter((v) => {
      if (statusFilter !== "all" && v.verification_status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return v.store_name.toLowerCase().includes(q) || (v.area ?? "").toLowerCase().includes(q);
    });
  }, [vendors, search, statusFilter]);

  return (
    <div>
      <div className="mb-[18px] flex items-center gap-3">
        <input
          placeholder="Search vendors by name or area…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[340px] flex-1 rounded-lg border border-border px-[14px] py-[10px] text-[13px] outline-none focus:border-primary-light"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VendorVerificationStatus | "all")}
          className="rounded-lg border border-border px-[14px] py-[10px] text-[13px] text-ink"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Active</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg bg-accent px-[18px] py-[10px] text-[13px] font-bold text-white"
        >
          + Add vendor
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-[2fr_1.4fr_1fr_1fr_140px] border-b border-border bg-surface-alt px-5 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
          <span>Vendor</span>
          <span>Category</span>
          <span>Products</span>
          <span>Status</span>
          <span />
        </div>

        {isLoading ? (
          <p className="p-5 text-sm text-muted">Loading vendors…</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-sm text-muted">No vendors found.</p>
        ) : (
          filtered.map((v) => {
            const meta = STATUS_META[v.verification_status];
            const cats = categoryNames?.[v.id] ?? [];
            return (
              <div
                key={v.id}
                className="grid grid-cols-[2fr_1.4fr_1fr_1fr_140px] items-center border-b border-[#F5F0EE] px-5 py-4 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => onOpen(v.id)}
                  className="flex items-center gap-3 text-left"
                >
                  <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
                    {initials(v.store_name)}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13.5px] font-bold text-ink-dark">
                      {v.store_name}
                    </span>
                    <span className="text-[11px] text-muted-table">
                      {v.area || "—"}
                    </span>
                  </span>
                </button>
                <span className="truncate text-[12.5px] text-ink-dark" title={cats.join(", ")}>
                  {cats.length > 0 ? cats.join(", ") : "Not assigned"}
                </span>
                <span className="text-[12.5px] text-ink-dark">—</span>
                <span>
                  <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                </span>
                <RowAction vendorId={v.id} status={v.verification_status} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RowAction({
  vendorId,
  status,
}: {
  vendorId: string;
  status: VendorVerificationStatus;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const mutation = useMutation({
    mutationFn: (next: VendorVerificationStatus) =>
      setVendorStatus(supabase, vendorId, next),
    onSuccess: (_updated, next) => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      if (user) void logAdminAction(supabase, user.id, `vendor.${next}`, "vendor", vendorId);
    },
  });

  if (status === "pending") {
    return (
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => mutation.mutate("approved")}
          className="rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate("rejected")}
          className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-danger"
        >
          Reject
        </button>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <button
        type="button"
        onClick={() => mutation.mutate("suspended")}
        className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-primary"
      >
        Suspend
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => mutation.mutate("approved")}
      className="rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white"
    >
      Reactivate
    </button>
  );
}

function CategoryChecklist({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(supabase),
  });

  if (!categories || categories.length === 0) {
    return (
      <p className="text-[12.5px] text-muted">
        No categories exist yet — add some from the Categories page first.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const isSelected = selected.has(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
            style={
              isSelected
                ? { background: "var(--color-primary)", color: "#fff" }
                : { background: "#fff", border: "1px solid var(--color-border)", color: "var(--color-ink-secondary)" }
            }
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

function VendorDetail({ vendorId, onBack }: { vendorId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["admin-vendor", vendorId],
    queryFn: () => getVendorById(supabase, vendorId),
  });

  const { data: assignedCategories } = useQuery({
    queryKey: ["vendor-categories", vendorId],
    queryFn: () => listVendorCategories(supabase, vendorId),
  });

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string> | null>(null);
  const categorySelection = selectedCategoryIds ?? new Set(assignedCategories?.map((c) => c.id) ?? []);

  function toggleCategory(id: string) {
    const next = new Set(categorySelection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCategoryIds(next);
  }

  const saveCategoriesMutation = useMutation({
    mutationFn: () => setVendorCategories(supabase, vendorId, Array.from(categorySelection)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-categories", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["admin-vendor-category-names"] });
      setSelectedCategoryIds(null);
    },
  });

  const mutation = useMutation({
    mutationFn: (next: VendorVerificationStatus) =>
      setVendorStatus(supabase, vendorId, next),
    onSuccess: (updated, next) => {
      queryClient.setQueryData(["admin-vendor", vendorId], updated);
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      if (user) void logAdminAction(supabase, user.id, `vendor.${next}`, "vendor", vendorId);
    },
  });

  if (isLoading || !vendor) {
    return <p className="text-sm text-muted">Loading vendor…</p>;
  }

  const meta = STATUS_META[vendor.verification_status];
  const joined = new Date(vendor.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const hasCategories = categorySelection.size > 0;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-[12.5px] font-bold text-accent"
      >
        ← Back to vendors
      </button>

      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-5">
        <div className="flex flex-col gap-5">
          <div className="flex gap-[18px] rounded-lg border border-border bg-surface p-6">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] bg-primary text-lg font-extrabold text-white">
              {initials(vendor.store_name)}
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                  {vendor.store_name}
                </span>
                <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
              </div>
              <p className="mt-1 text-[12.5px] text-muted">
                {vendor.area || "Area not set"} · Joined {joined}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold text-ink">Categories</span>
              {selectedCategoryIds !== null ? (
                <button
                  type="button"
                  onClick={() => saveCategoriesMutation.mutate()}
                  disabled={saveCategoriesMutation.isPending}
                  className="rounded-md bg-primary px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-60"
                >
                  {saveCategoriesMutation.isPending ? "Saving…" : "Save categories"}
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-[12px] text-muted">
              This vendor can only list products in the categories assigned here.
            </p>
            <div className="mt-3">
              <CategoryChecklist selected={categorySelection} onToggle={toggleCategory} />
            </div>
          </div>

          <VendorProductsSection vendorId={vendorId} />

          <div className="rounded-lg border border-border bg-surface p-6">
            <span className="text-[15px] font-bold text-ink">Recent orders</span>
            <p className="mt-3 text-sm text-muted">
              No orders yet — order history is built in a later module.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.06em] text-muted-table">
              Performance
            </p>
            {[
              ["Total sales", "—"],
              ["Products listed", "—"],
              ["Rating", "—"],
              ["Commission rate", "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1 text-[13px]">
                <span className="text-muted">{label}</span>
                <span className="font-bold text-ink-dark">{value}</span>
              </div>
            ))}
          </div>

          {vendor.verification_status === "pending" ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => mutation.mutate("approved")}
                disabled={!hasCategories}
                title={hasCategories ? undefined : "Assign at least one category first"}
                className="rounded-[9px] bg-primary px-3 py-3 text-[13px] font-bold text-white disabled:opacity-50"
              >
                Approve vendor
              </button>
              {!hasCategories ? (
                <p className="text-center text-[11.5px] text-muted">
                  Assign a category above before approving.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => mutation.mutate("rejected")}
                className="rounded-[9px] border border-border bg-white px-3 py-3 text-[13px] font-bold text-danger"
              >
                Reject vendor
              </button>
            </div>
          ) : vendor.verification_status === "approved" ? (
            <button
              type="button"
              onClick={() => mutation.mutate("suspended")}
              className="rounded-[9px] bg-accent px-3 py-3 text-[13px] font-bold text-white"
            >
              Suspend vendor
            </button>
          ) : (
            <button
              type="button"
              onClick={() => mutation.mutate("approved")}
              className="rounded-[9px] bg-primary px-3 py-3 text-[13px] font-bold text-white"
            >
              Reactivate vendor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function VendorProductsSection({ vendorId }: { vendorId: string }) {
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-vendor-products", vendorId],
    queryFn: () => listMyProducts(supabase, vendorId),
  });

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <span className="text-[15px] font-bold text-ink">
        Products{products ? ` (${products.length})` : ""}
      </span>
      {isLoading ? (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      ) : !products || products.length === 0 ? (
        <p className="mt-3 text-sm text-muted">This vendor hasn&rsquo;t added any products yet.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 border-t border-[#F5F0EE] pt-2.5 text-[13px] first:border-t-0 first:pt-0"
            >
              <span className="truncate font-semibold text-ink-dark">{p.name}</span>
              <span className="shrink-0 text-muted">Rs. {p.price.toLocaleString()}</span>
              <span className="shrink-0 text-[11.5px] capitalize text-muted-table">{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddVendorForm({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  function toggleCategory(id: string) {
    const next = new Set(categoryIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCategoryIds(next);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error: invokeError } = await supabase.functions.invoke("admin_create_vendor", {
        body: {
          full_name: fullName,
          email,
          phone,
          store_name: storeName,
          area,
          category_ids: Array.from(categoryIds),
        },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      return data as { vendor_id: string; slug: string; email: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      queryClient.invalidateQueries({ queryKey: ["admin-vendor-category-names"] });
      setCreatedEmail(data.email);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (createdEmail) {
    return (
      <div className="max-w-[520px]">
        <button type="button" onClick={onBack} className="mb-4 text-[12.5px] font-bold text-accent">
          ← Back to vendors
        </button>
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-[15px] font-bold text-ink">Vendor created</p>
          <p className="mt-2 text-sm text-muted">
            {storeName} is live and approved. We&rsquo;ve emailed {createdEmail} an invite link so
            they can set their own password and sign in.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 rounded-[9px] bg-primary px-4 py-2.5 text-[13px] font-bold text-white"
          >
            Back to vendors
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[560px]">
      <button type="button" onClick={onBack} className="mb-4 text-[12.5px] font-bold text-accent">
        ← Back to vendors
      </button>

      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-6">
        <p className="text-[15px] font-bold text-ink">Add vendor</p>
        <p className="-mt-2 text-[12.5px] text-muted">
          Creates the account directly (already approved) and emails them a link to set a
          password.
        </p>

        <Field label="Owner full name">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Store name">
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
          </Field>
          <Field label="Store location">
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
          </Field>
        </div>
        <Field label="Phone number">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
        </Field>

        <Field label="Categories">
          <CategoryChecklist selected={categoryIds} onToggle={toggleCategory} />
        </Field>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <button
          type="button"
          disabled={!email.trim() || !storeName.trim() || mutation.isPending}
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
          className="mt-1 self-start rounded-[10px] bg-accent px-[26px] py-[13px] text-sm font-bold text-white disabled:opacity-60"
        >
          {mutation.isPending ? "Creating…" : "Create vendor"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[7px]">
      <span className="text-[12.5px] font-bold text-ink-dark">{label}</span>
      {children}
    </div>
  );
}
