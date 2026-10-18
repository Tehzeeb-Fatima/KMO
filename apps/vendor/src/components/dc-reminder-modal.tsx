import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { getMyVendor, getPlatformSettings, listVendorDeliveryRates, updateMyVendor } from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

/** Two independent admin toggles, one popup slot. Shows on every login
 *  until the vendor dismisses it for good (dc_reminder_acknowledged); the
 *  × just closes it for this visit — it comes back next login.
 *   - dc_reminder_enabled on, no rates   → "set your delivery charge" (action)
 *   - dc_reminder_enabled on, has rates  → "review your delivery charges"
 *   - dc_reminder_enabled off, dc_info_popup_enabled on → info + WhatsApp
 *   - both off → nothing shows */
export function DcReminderModal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [closedForNow, setClosedForNow] = useState(false);

  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });
  const { data: settings } = useQuery({ queryKey: ["platform-settings"], queryFn: () => getPlatformSettings(supabase) });
  const { data: rates } = useQuery({
    queryKey: ["vendor-delivery-rates", vendor?.id],
    queryFn: () => listVendorDeliveryRates(supabase, vendor!.id),
    enabled: !!vendor,
  });

  const acknowledge = useMutation({
    mutationFn: () => updateMyVendor(supabase, vendor!.id, { dc_reminder_acknowledged: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-vendor"] }),
  });

  if (!vendor || !settings || !rates || vendor.dc_reminder_acknowledged || closedForNow) return null;

  const dcAllowed = settings.dc_reminder_enabled;
  const showInfoPopup = !dcAllowed && settings.dc_info_popup_enabled;
  if (!dcAllowed && !showInfoPopup) return null;

  const hasRates = rates.length > 0;
  const whatsappNumber = settings.whatsapp_number?.replace(/[^\d]/g, "");

  function dismissForGood(goToShipping: boolean) {
    acknowledge.mutate();
    if (goToShipping) navigate("/shipping");
  }

  let title: string;
  let body: React.ReactNode;
  let buttonLabel: string;
  let goToShipping: boolean;

  if (!dcAllowed) {
    title = "Delivery is free for your customers";
    body = (
      <>
        <p>
          KMO hasn&rsquo;t turned on vendor-set delivery charges yet — right now, delivery is{" "}
          <span className="font-semibold text-ink-dark">free</span> for all your customers.
        </p>
        <p className="mt-2">
          Click <span className="font-semibold text-ink-dark">Review</span> to see KMO&rsquo;s current delivery
          charges.
        </p>
        {whatsappNumber ? (
          <p className="mt-2">
            Want to discuss this?{" "}
            <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary">
              Message us on WhatsApp
            </a>
            .
          </p>
        ) : null}
      </>
    );
    buttonLabel = "Review";
    goToShipping = true;
  } else if (!hasRates) {
    title = "Set your delivery charge";
    body = (
      <p>
        You haven&rsquo;t set a delivery charge for your products yet. Until you do, customers get{" "}
        <span className="font-semibold text-ink-dark">free (Rs. 0) delivery</span> on your products.
      </p>
    );
    buttonLabel = "Set delivery charge now";
    goToShipping = true;
  } else {
    title = "Your delivery charges have been added";
    body = <p>Review the delivery charges you&rsquo;ve set, to make sure they&rsquo;re still right.</p>;
    buttonLabel = "Review";
    goToShipping = true;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-[420px] rounded-xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={() => setClosedForNow(true)}
          aria-label="Close for now"
          className="absolute right-4 top-4 text-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="pr-6 text-[16px] font-bold text-ink">{title}</p>
        <div className="mt-1.5 text-[13px] text-muted">{body}</div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={acknowledge.isPending}
            onClick={() => dismissForGood(goToShipping)}
            className="flex-1 rounded-[9px] bg-primary px-3 py-3 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {acknowledge.isPending ? "Opening…" : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
