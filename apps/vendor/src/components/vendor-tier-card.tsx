import { useQuery } from "@tanstack/react-query";
import { getPlatformSettings, getVendorPerformance, VENDOR_TIER_LABEL } from "@kmo/shared/api";
import type { VendorTier } from "@kmo/shared/types";
import { supabase } from "../lib/supabase";

const TIER_ICON: Record<VendorTier, string> = { bronze: "🥉", silver: "🥈", gold: "🥇" };

/** The vendor's KMO tier, its benefits, and the numbers KMO looks at. */
export function VendorTierCard({ vendorId, tier }: { vendorId: string; tier: VendorTier | null }) {
  const { data: settings } = useQuery({ queryKey: ["platform-settings"], queryFn: () => getPlatformSettings(supabase) });
  const { data: perf } = useQuery({ queryKey: ["vendor-performance", vendorId], queryFn: () => getVendorPerformance(supabase, vendorId) });

  const finished = perf ? perf.orders_delivered + perf.orders_cancelled + perf.orders_returned : 0;
  const cancelPct = perf && finished ? Math.round(((perf.orders_cancelled + perf.orders_returned) / finished) * 100) : null;

  return (
    <div className="mb-5 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[15px] font-bold text-ink">
          {tier ? `${TIER_ICON[tier]} ${VENDOR_TIER_LABEL[tier]} vendor` : "Your KMO tier"}
        </p>
        <p className="text-[12px] text-muted">Bronze → Silver → Gold</p>
      </div>
      <p className="mt-1.5 text-[13px] text-ink-dark">
        {tier && settings?.vendor_tier_benefits
          ? settings.vendor_tier_benefits[tier]
          : "No tier yet. Deliver orders on time, keep products in stock and avoid cancellations — KMO moves active vendors up to Silver and Gold."}
      </p>
      {perf ? (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted">
          <span>
            Delivered orders: <b className="text-ink-dark">{perf.orders_delivered}</b>
          </span>
          <span>
            Cancelled / returned: <b className="text-ink-dark">{cancelPct === null ? "—" : `${cancelPct}%`}</b>
          </span>
          <span>
            Live products: <b className="text-ink-dark">{perf.active_products}</b>
          </span>
        </div>
      ) : null}
    </div>
  );
}
