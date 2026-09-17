import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCoupon, getMyVendor, listVendorCoupons } from "@kmo/shared/api";
import type { DiscountType } from "@kmo/shared/types";
import { StatusBadge } from "@kmo/shared/ui";
import { supabase } from "../lib/supabase";

export function CouponsPage() {
  const [adding, setAdding] = useState(false);
  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });

  if (!vendor) return <p className="text-sm text-muted">Loading…</p>;

  if (adding) return <AddCoupon vendorId={vendor.id} onBack={() => setAdding(false)} />;
  return <CouponsList vendorId={vendor.id} onAdd={() => setAdding(true)} />;
}

function CouponsList({ vendorId, onAdd }: { vendorId: string; onAdd: () => void }) {
  const { data: coupons, isLoading } = useQuery({
    queryKey: ["vendor-coupons", vendorId],
    queryFn: () => listVendorCoupons(supabase, vendorId),
  });

  return (
    <div>
      <div className="mb-[18px] flex justify-end">
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg bg-accent px-[18px] py-[10px] text-[13px] font-bold text-white"
        >
          + Create coupon
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-[1fr_1.6fr_1fr_1fr_1fr_1fr] bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
          <span>Code</span>
          <span>Description</span>
          <span>Type</span>
          <span>Amount</span>
          <span>Expires</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <p className="p-5 text-sm text-muted">Loading…</p>
        ) : !coupons || coupons.length === 0 ? (
          <p className="p-5 text-sm text-muted">No coupons yet.</p>
        ) : (
          coupons.map((c) => {
            const expired = c.expires_at && new Date(c.expires_at) < new Date();
            return (
              <div
                key={c.id}
                className="grid grid-cols-[1fr_1.6fr_1fr_1fr_1fr_1fr] items-center border-t border-[#F5F0EE] px-5 py-4"
              >
                <span className="font-mono text-[12.5px] font-bold text-primary">{c.code}</span>
                <span className="text-[12.5px] text-ink-dark">{c.description}</span>
                <span className="text-[12.5px] text-muted">
                  {c.discount_type === "percentage" ? "Percentage" : "Fixed"}
                </span>
                <span className="text-[13px] font-bold text-ink-dark">
                  {c.discount_type === "percentage" ? `${c.amount}%` : `Rs. ${c.amount}`}
                </span>
                <span className="text-xs text-muted">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}
                </span>
                <span>
                  <StatusBadge variant={expired || c.status === "disabled" ? "danger" : "success"}>
                    {expired ? "Expired" : c.status === "active" ? "Active" : "Disabled"}
                  </StatusBadge>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AddCoupon({ vendorId, onBack }: { vendorId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [amount, setAmount] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createCoupon(supabase, {
        vendor_id: vendorId,
        code: code.toUpperCase(),
        description,
        discount_type: discountType,
        amount: Number(amount.replace(/[^0-9.]/g, "")) || 0,
        expires_at: expiresAt || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-coupons", vendorId] });
      onBack();
    },
  });

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 text-[12.5px] font-bold text-accent">
        ← Back to coupons
      </button>

      <div className="flex max-w-[520px] flex-col gap-3.5 rounded-xl border border-border bg-surface p-6">
        <Field label="Coupon code">
          <input
            placeholder="e.g. EID2026"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] font-mono text-[13.5px] outline-none focus:border-primary-light"
          />
        </Field>
        <Field label="Description">
          <input
            placeholder="e.g. 15% off on Eid collection"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Discount type">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] text-ink-dark outline-none"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </Field>
          <Field label="Coupon amount">
            <input
              placeholder="e.g. 15 or Rs. 200"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
          </Field>
        </div>
        <Field label="Expiry date">
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
        </Field>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!code || !amount || mutation.isPending}
          className="w-fit rounded-[9px] bg-accent px-[26px] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : "Save coupon"}
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
