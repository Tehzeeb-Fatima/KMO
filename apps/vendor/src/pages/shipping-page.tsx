import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyVendor, listCourierRateSlabs, listCouriers, updateMyVendor } from "@kmo/shared/api";
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
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4 text-[15px] font-bold text-ink">
            Your shipping rates
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] bg-surface-alt px-5 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
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
                className="grid grid-cols-[1fr_1fr_1fr_1fr] items-center border-t border-[#F5F0EE] px-5 py-3 text-[12.5px]"
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
