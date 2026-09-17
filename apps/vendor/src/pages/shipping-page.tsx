import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyVendor, updateMyVendor } from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

const COURIERS = [
  { name: "TCS", desc: "Nationwide courier, 2–4 day delivery" },
  { name: "Leopards Courier", desc: "Karachi same-city, next-day delivery" },
  { name: "M&P Express", desc: "Cash on delivery specialist" },
];

export function ShippingPage() {
  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState("TCS");

  useEffect(() => {
    if (vendor?.preferred_courier) setSelected(vendor.preferred_courier);
  }, [vendor]);

  const mutation = useMutation({
    mutationFn: (courier: string) => updateMyVendor(supabase, vendor!.id, { preferred_courier: courier }),
    onSuccess: (updated) => queryClient.setQueryData(["my-vendor"], updated),
  });

  function select(name: string) {
    setSelected(name);
    mutation.mutate(name);
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Preferred courier</p>
        {COURIERS.map((c) => {
          const isSelected = selected === c.name;
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => select(c.name)}
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
              <span className="flex flex-col">
                <span className="text-[13.5px] font-bold text-ink-dark">{c.name}</span>
                <span className="text-[11.5px] text-muted">{c.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4 text-[15px] font-bold text-ink">
          Shipping invoices
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_100px] bg-surface-alt px-5 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
          <span>Invoice</span>
          <span>Order</span>
          <span>Courier</span>
          <span>Amount</span>
          <span />
        </div>
        <div className="p-5 text-sm text-muted">
          No shipping invoices yet — these appear once a courier picks up an order.
        </div>
      </div>
    </div>
  );
}
