import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMyVendor, getPlatformSettings, listVendorDeliveryRates, updateMyVendor } from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

/** Admin-controlled reminder: shows on every login until the vendor either
 * sets a delivery charge or dismisses it, so they know their delivery is
 * free (Rs. 0) by default until they do. */
export function DcReminderModal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });
  const { data: settings } = useQuery({ queryKey: ["platform-settings"], queryFn: () => getPlatformSettings(supabase) });
  const { data: rates } = useQuery({
    queryKey: ["vendor-delivery-rates", vendor?.id],
    queryFn: () => listVendorDeliveryRates(supabase, vendor!.id),
    enabled: !!vendor,
  });

  const mutation = useMutation({
    mutationFn: () => updateMyVendor(supabase, vendor!.id, { dc_reminder_acknowledged: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-vendor"] });
      navigate("/shipping");
    },
  });

  const shouldShow =
    !!vendor &&
    !!settings?.dc_reminder_enabled &&
    !vendor.dc_reminder_acknowledged &&
    !!rates &&
    rates.length === 0;

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[420px] rounded-xl bg-white p-6 shadow-xl">
        <p className="text-[16px] font-bold text-ink">Set your delivery charge</p>
        <p className="mt-1.5 text-[13px] text-muted">
          You haven&rsquo;t set a delivery charge for your products yet. Until you do, customers get{" "}
          <span className="font-semibold text-ink-dark">free (Rs. 0) delivery</span> on your products — KMO&rsquo;s
          charge for you.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex-1 rounded-[9px] bg-primary px-3 py-3 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {mutation.isPending ? "Opening…" : "Set delivery charge now"}
          </button>
        </div>
      </div>
    </div>
  );
}
