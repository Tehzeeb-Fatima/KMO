import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteDeliveryFeeCap, listDeliveryFeeCaps, listVendors, setDeliveryFeeCap } from "@kmo/shared/api";
import { DELIVERY_CITY_OPTIONS } from "@kmo/shared/lib";
import { ConfirmDialog, SearchableSelect } from "@kmo/shared/ui";
import { supabase } from "../lib/supabase";

/** Caps what a vendor can charge a customer for delivery, per city. Vendors set
 *  their own rate in their dashboard; this stops any vendor from setting it
 *  above what KMO allows for that city — either a platform-wide default, or a
 *  tighter (or looser) cap for one specific vendor. */
export function DeliveryCapsPage() {
  const [vendorId, setVendorId] = useState<string>("");

  const { data: vendors } = useQuery({
    queryKey: ["all-vendors-for-delivery-caps"],
    queryFn: () => listVendors(supabase, { status: "approved" }),
  });

  return (
    <div className="flex max-w-[640px] flex-col gap-5">
      <CapTable
        title="Default caps — every vendor"
        hint="Applies to every vendor unless a vendor-specific override below sets a different cap for that city."
        vendorId={null}
      />

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="mb-3 text-[15px] font-bold text-ink">Vendor-specific override</p>
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="w-full max-w-[360px] rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-ink-dark"
        >
          <option value="">Select a vendor…</option>
          {vendors?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.store_name}
            </option>
          ))}
        </select>
      </div>

      {vendorId ? (
        <CapTable
          title={`Override for ${vendors?.find((v) => v.id === vendorId)?.store_name ?? "vendor"}`}
          hint="Takes priority over the default caps above for this vendor only."
          vendorId={vendorId}
        />
      ) : null}
    </div>
  );
}

function CapTable({ title, hint, vendorId }: { title: string; hint: string; vendorId: string | null }) {
  const queryClient = useQueryClient();
  const queryKey = ["delivery-fee-caps", vendorId];

  const { data: allCaps, isLoading } = useQuery({
    queryKey,
    queryFn: () => listDeliveryFeeCaps(supabase, vendorId ?? undefined),
  });
  // listDeliveryFeeCaps(vendorId) also returns the defaults for context on the
  // vendor panel — this table only edits rows that actually belong to it.
  const caps = allCaps?.filter((c) => (vendorId ? c.vendor_id === vendorId : c.vendor_id === null));

  const availableCities = DELIVERY_CITY_OPTIONS.filter((c) => !caps?.some((cap) => cap.city === c));
  const [city, setCity] = useState("");
  const [maxFee, setMaxFee] = useState("");
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => setDeliveryFeeCap(supabase, { vendor_id: vendorId, city, max_fee: Number(maxFee) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-fee-caps"] });
      setCity("");
      setMaxFee("");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const [pendingDelete, setPendingDelete] = useState<{ id: string; city: string } | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDeliveryFeeCap(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-fee-caps"] });
      setPendingDelete(null);
    },
  });

  const canSave = city.trim() && maxFee.trim() && Number(maxFee) >= 0 && !saveMutation.isPending;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mb-3 text-[12px] text-muted">{hint}</p>

      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
        <SearchableSelect
          options={availableCities}
          value={city}
          onChange={(c) => {
            setCity(c);
            setError(null);
          }}
          placeholder="City…"
          className="col-span-2 sm:col-span-1"
        />
        <input
          type="number"
          min="0"
          autoComplete="off"
          placeholder="Max fee (Rs.)"
          value={maxFee}
          onChange={(e) => {
            setMaxFee(e.target.value);
            setError(null);
          }}
          className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
        />
        <button
          type="button"
          disabled={!canSave}
          onClick={() => saveMutation.mutate()}
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
        >
          Save cap
        </button>
      </div>
      {error ? <p className="mb-2 text-[12.5px] text-danger">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="grid min-w-[360px] grid-cols-[1fr_1fr_80px] bg-surface-alt px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-table">
          <span>City</span>
          <span>Max delivery fee</span>
          <span />
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted">Loading…</p>
        ) : !caps || caps.length === 0 ? (
          <p className="p-4 text-sm text-muted">No caps set here yet.</p>
        ) : (
          caps.map((c) => (
            <div
              key={c.id}
              className="grid min-w-[360px] grid-cols-[1fr_1fr_80px] items-center border-t border-[#F5F0EE] px-3.5 py-2.5 text-[13px]"
            >
              <span className="font-bold text-ink-dark">{c.city}</span>
              <span className="text-ink-dark">Rs. {c.max_fee.toLocaleString()}</span>
              <button
                type="button"
                onClick={() => setPendingDelete({ id: c.id, city: c.city })}
                className="text-right text-[11px] font-bold text-danger"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Remove the cap for ${pendingDelete?.city}?`}
        message="Delivery fees for this city fall back to the next cap that applies (or go unrestricted if none do)."
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(pendingDelete!.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
