import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteDeliveryFeeCap, listDeliveryFeeCaps, setDeliveryFeeCap } from "@kmo/shared/api";
import { DELIVERY_CITY_OPTIONS } from "@kmo/shared/lib";
import { ConfirmDialog, SearchableSelect } from "@kmo/shared/ui";
import { supabase } from "../lib/supabase";

/** Caps what a vendor can charge a customer for delivery, per city. Vendors set
 *  their own rate in their dashboard; this stops any vendor from setting it
 *  above what KMO allows for that city. */
export function DeliveryCapsPage() {
  const queryClient = useQueryClient();
  const queryKey = ["delivery-fee-caps"];

  const { data: caps, isLoading } = useQuery({
    queryKey,
    queryFn: () => listDeliveryFeeCaps(supabase),
  });

  const availableCities = DELIVERY_CITY_OPTIONS.filter((c) => !caps?.some((cap) => cap.city === c));
  const [city, setCity] = useState("");
  const [maxFee, setMaxFee] = useState("");
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => setDeliveryFeeCap(supabase, { city: city.trim(), max_fee: Number(maxFee) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
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
      queryClient.invalidateQueries({ queryKey });
      setPendingDelete(null);
    },
  });

  const canSave = city.trim() && maxFee.trim() && Number(maxFee) >= 0 && !saveMutation.isPending;

  return (
    <div className="flex max-w-[640px] flex-col gap-4">
      <p className="text-sm text-muted">
        A vendor cannot charge a customer more than this for delivery to a city they&rsquo;ve set a cap for. Pick{" "}
        <span className="font-semibold text-ink-dark">Other</span> to cap every city that doesn&rsquo;t have its own
        row. Cities without a cap (and no Other cap set) are unrestricted.
      </p>

      <div className="rounded-xl border border-border bg-surface p-5">
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
        {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <div className="grid min-w-[360px] grid-cols-[1fr_1fr_80px] bg-surface-alt px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
          <span>City</span>
          <span>Max delivery fee</span>
          <span />
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted">Loading…</p>
        ) : !caps || caps.length === 0 ? (
          <p className="p-4 text-sm text-muted">No caps set — vendors can charge any delivery fee.</p>
        ) : (
          caps.map((c) => (
            <div
              key={c.id}
              className="grid min-w-[360px] grid-cols-[1fr_1fr_80px] items-center border-t border-[#F5F0EE] px-4 py-3 text-[13px]"
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
        message="Vendors will be able to set any delivery fee for this city again."
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(pendingDelete!.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
