import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteVendorDeliveryRate,
  getMyVendor,
  listCourierRateSlabs,
  listCouriers,
  listDeliveryFeeCaps,
  listVendorDeliveryRates,
  setVendorDeliveryRate,
  updateMyVendor,
} from "@kmo/shared/api";
import { DELIVERY_CITY_OPTIONS, OTHER_CITY } from "@kmo/shared/lib";
import { ConfirmDialog, SearchableSelect } from "@kmo/shared/ui";
import { supabase } from "../lib/supabase";

export function ShippingPage() {
  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });
  const { data: couriers } = useQuery({
    queryKey: ["active-couriers"],
    queryFn: () => listCouriers(supabase, true),
  });
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (vendor?.preferred_courier_id) setSelectedId(vendor.preferred_courier_id);
  }, [vendor]);

  const mutation = useMutation({
    mutationFn: (courierId: string) =>
      updateMyVendor(supabase, vendor!.id, { preferred_courier_id: courierId }),
    onSuccess: (updated) => queryClient.setQueryData(["my-vendor"], updated),
  });

  function select(id: string) {
    setSelectedId(id);
    mutation.mutate(id);
  }

  const { data: vendorSlabs } = useQuery({
    queryKey: ["courier-rate-slabs", selectedId, vendor?.id],
    queryFn: () => listCourierRateSlabs(supabase, selectedId!, vendor!.id),
    enabled: !!selectedId && !!vendor,
  });
  const { data: defaultSlabs } = useQuery({
    queryKey: ["courier-rate-slabs", selectedId, null],
    queryFn: () => listCourierRateSlabs(supabase, selectedId!, null),
    enabled: !!selectedId,
  });
  const rateSlabs = vendorSlabs && vendorSlabs.length > 0 ? vendorSlabs : defaultSlabs;

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      {vendor ? <CustomerDeliveryChargesSection vendorId={vendor.id} /> : null}

      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Preferred courier</p>
        {!couriers || couriers.length === 0 ? (
          <p className="text-sm text-muted">No couriers available yet — check back soon.</p>
        ) : (
          couriers.map((c) => {
            const isSelected = selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c.id)}
                className="flex items-center gap-3 rounded-[9px] p-3.5 text-left"
                style={{
                  border: isSelected ? "1.5px solid var(--color-accent)" : "1.5px solid var(--color-border)",
                  background: isSelected ? "var(--color-accent-tint)" : "#fff",
                }}
              >
                <span
                  className="h-[18px] w-[18px] shrink-0 rounded-full"
                  style={{ border: isSelected ? "5px solid var(--color-accent)" : "1.5px solid var(--color-border)" }}
                />
                <span className="text-[13.5px] font-bold text-ink-dark">{c.name}</span>
              </button>
            );
          })
        )}
      </div>

      {selectedId ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4 text-[15px] font-bold text-ink">
            Your shipping rates
          </div>
          <div className="grid min-w-[480px] grid-cols-[1fr_1fr_1fr_1fr] bg-surface-alt px-5 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
            <span>City</span>
            <span>Weight (kg)</span>
            <span>Fee</span>
            <span>GST/tax</span>
          </div>
          {!rateSlabs || rateSlabs.length === 0 ? (
            <div className="p-5 text-sm text-muted">
              No rates set up yet for this courier — contact KMO support.
            </div>
          ) : (
            rateSlabs.map((s) => (
              <div
                key={s.id}
                className="grid min-w-[480px] grid-cols-[1fr_1fr_1fr_1fr] items-center border-t border-[#F5F0EE] px-5 py-3 text-[12.5px]"
              >
                <span className="font-bold text-ink-dark">{s.city}</span>
                <span className="text-muted">
                  {s.min_weight_kg}–{s.max_weight_kg}
                </span>
                <span className="text-ink-dark">Rs. {s.fee.toLocaleString()}</span>
                <span className="text-muted">{s.tax_percent}%</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/** What the customer actually pays for delivery on this vendor's orders, by
 *  city — shown at checkout once set. Separate from the courier rates above,
 *  which are what KMO charges the vendor, not the customer. */
function CustomerDeliveryChargesSection({ vendorId }: { vendorId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["vendor-delivery-rates", vendorId];

  const { data: rates, isLoading } = useQuery({
    queryKey,
    queryFn: () => listVendorDeliveryRates(supabase, vendorId),
  });
  const { data: caps } = useQuery({
    queryKey: ["delivery-fee-caps"],
    queryFn: () => listDeliveryFeeCaps(supabase),
  });

  const availableCities = DELIVERY_CITY_OPTIONS.filter((c) => !rates?.some((r) => r.city === c));
  const [city, setCity] = useState("");
  const [fee, setFee] = useState("");
  const [error, setError] = useState<string | null>(null);

  const matchingCap =
    caps?.find((c) => c.city.toLowerCase() === city.toLowerCase()) ??
    (city && city !== OTHER_CITY ? caps?.find((c) => c.city === OTHER_CITY) : undefined);

  const saveMutation = useMutation({
    mutationFn: () => setVendorDeliveryRate(supabase, { vendor_id: vendorId, city: city.trim(), fee: Number(fee) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setCity("");
      setFee("");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const [pendingDelete, setPendingDelete] = useState<{ id: string; city: string } | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVendorDeliveryRate(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setPendingDelete(null);
    },
  });

  const canSave = city.trim() && fee.trim() && Number(fee) >= 0 && !saveMutation.isPending;

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
      <p className="text-[15px] font-bold text-ink">Your delivery charge to customers</p>
      <p className="text-[12.5px] text-muted">
        Set what a customer pays for delivery, per city. Pick <span className="font-semibold text-ink-dark">Other</span>{" "}
        to set one rate for every city you haven&rsquo;t listed individually — otherwise KMO&rsquo;s default applies
        (Rs. 120, free over Rs. 2,500).
      </p>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
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
          placeholder="Fee (Rs.)"
          value={fee}
          onChange={(e) => {
            setFee(e.target.value);
            setError(null);
          }}
          className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
        />
        <button
          type="button"
          disabled={!canSave}
          onClick={() => saveMutation.mutate()}
          className="rounded-lg bg-accent px-4 py-2 text-[12.5px] font-bold text-white disabled:opacity-60"
        >
          Save
        </button>
      </div>
      {matchingCap ? (
        <p className="text-[11.5px] text-muted">
          KMO&rsquo;s cap for {matchingCap.city}: Rs. {matchingCap.max_fee.toLocaleString()}
        </p>
      ) : null}
      {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="grid min-w-[360px] grid-cols-[1fr_1fr_60px] bg-surface-alt px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-table">
          <span>City</span>
          <span>Fee</span>
          <span />
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted">Loading…</p>
        ) : !rates || rates.length === 0 ? (
          <p className="p-4 text-sm text-muted">No custom rates yet — KMO&rsquo;s default applies everywhere.</p>
        ) : (
          rates.map((r) => (
            <div
              key={r.id}
              className="grid min-w-[360px] grid-cols-[1fr_1fr_60px] items-center border-t border-[#F5F0EE] px-3.5 py-2.5 text-[12.5px]"
            >
              <span className="font-bold text-ink-dark">{r.city}</span>
              <span className="text-ink-dark">Rs. {r.fee.toLocaleString()}</span>
              <button
                type="button"
                onClick={() => setPendingDelete({ id: r.id, city: r.city })}
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
        title={`Remove the rate for ${pendingDelete?.city}?`}
        message="This city falls back to KMO's default delivery charge."
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(pendingDelete!.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
