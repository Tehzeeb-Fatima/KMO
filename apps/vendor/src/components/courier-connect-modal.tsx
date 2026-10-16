import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { connectVendorToCourier, getMyVendor, getVendorCourierStatus } from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

/** One-time popup: a vendor links their Courier Fast Service account using
 * the password admin assigned them. Only shows once admin has set a
 * password AND marked the vendor "ready" — not for every unconnected vendor. */
export function CourierConnectModal() {
  const queryClient = useQueryClient();
  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });
  const { data: status } = useQuery({
    queryKey: ["vendor-courier-status", vendor?.id],
    queryFn: () => getVendorCourierStatus(supabase, vendor!.id),
    enabled: !!vendor,
  });

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const mutation = useMutation({
    mutationFn: () => connectVendorToCourier(supabase, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-courier-status", vendor?.id] });
      setPassword("");
    },
  });

  if (!vendor || !status || status.connected || !status.popupReady || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[420px] rounded-xl bg-white p-6 shadow-xl">
        <p className="text-[16px] font-bold text-ink">Connect your Courier account</p>
        <p className="mt-1.5 text-[13px] text-muted">
          Your email is <span className="font-semibold text-ink-dark">{vendor.store_name}&rsquo;s KMO login email</span>.
          Enter the password admin gave you for Courier Fast Service to link it — you&rsquo;ll be able to send
          orders there directly from KMO.
        </p>

        <div className="relative mt-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Courier password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            className="w-full rounded-lg border border-border px-[14px] py-[11px] pr-10 text-[13.5px] outline-none focus:border-primary-light"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {mutation.isError ? (
          <p className="mt-2 text-[12.5px] text-danger">{(mutation.error as Error).message}</p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={!password.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex-1 rounded-[9px] bg-primary px-3 py-3 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {mutation.isPending ? "Connecting…" : "Connect"}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-[9px] border border-border bg-white px-4 py-3 text-[13px] font-bold text-muted"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
