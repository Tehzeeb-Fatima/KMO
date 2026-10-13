import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatformSettings, getVendorPerformance, logAdminAction, updateMyVendor, VENDOR_TIER_LABEL } from "@kmo/shared/api";
import type { VendorTier } from "@kmo/shared/types";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

/** Admin-assigned vendor tier (non-cash benefits) with the numbers to decide it. */
export function VendorTierSection({ vendorId, tier }: { vendorId: string; tier: VendorTier | null }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: perf } = useQuery({ queryKey: ["vendor-performance", vendorId], queryFn: () => getVendorPerformance(supabase, vendorId) });
  const { data: settings } = useQuery({ queryKey: ["platform-settings"], queryFn: () => getPlatformSettings(supabase) });

  const save = useMutation({
    mutationFn: (next: VendorTier | null) => updateMyVendor(supabase, vendorId, { loyalty_tier: next }),
    onSuccess: (updated, next) => {
      queryClient.setQueryData(["admin-vendor", vendorId], updated);
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      if (user) void logAdminAction(supabase, user.id, "vendor.tier", "vendor", vendorId, { tier: next });
    },
  });

  const finished = perf ? perf.orders_delivered + perf.orders_cancelled + perf.orders_returned : 0;
  const cancelPct = perf && finished ? Math.round(((perf.orders_cancelled + perf.orders_returned) / finished) * 100) : null;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[15px] font-bold text-ink">Vendor tier</span>
        <select
          value={tier ?? ""}
          disabled={save.isPending}
          onChange={(e) => save.mutate((e.target.value || null) as VendorTier | null)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-ink-dark"
        >
          <option value="">No tier</option>
          <option value="bronze">🥉 Bronze</option>
          <option value="silver">🥈 Silver</option>
          <option value="gold">🥇 Gold</option>
        </select>
      </div>
      {tier && settings?.vendor_tier_benefits ? (
        <p className="mt-2 text-[12.5px] text-muted">
          {VENDOR_TIER_LABEL[tier]} benefits: {settings.vendor_tier_benefits[tier]}
        </p>
      ) : (
        <p className="mt-2 text-[12.5px] text-muted">Only KMO sets this. The vendor sees it in their dashboard; customers don't.</p>
      )}

      {perf ? (
        <div className="mt-4 grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-4">
          <Stat label="Delivered orders" value={perf.orders_delivered.toLocaleString()} />
          <Stat label="Cancelled / returned" value={cancelPct === null ? "—" : `${cancelPct}%`} />
          <Stat label="Open orders" value={perf.orders_open.toLocaleString()} />
          <Stat label="Live products" value={perf.active_products.toLocaleString()} />
          <Stat label="Delivered sales" value={`Rs. ${Math.round(perf.delivered_sales).toLocaleString()}`} />
          <Stat
            label="Last order"
            value={perf.last_order_at ? new Date(perf.last_order_at).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—"}
          />
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-alt px-3 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="font-bold text-ink-dark">{value}</p>
    </div>
  );
}
