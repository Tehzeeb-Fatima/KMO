import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { connectVendorToCourier, getMyVendor, getVendorCourierConnected } from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

/** One-time popup: a vendor links their Courier Fast Service account using
 * the password admin assigned them. Shows on every page until connected. */
export function CourierConnectModal() {
  const queryClient = useQueryClient();
  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });
  const { data: connected } = useQuery({
    queryKey: ["vendor-courier-connected", vendor?.id],
    queryFn: () => getVendorCourierConnected(supabase, vendor!.id),
    enabled: !!vendor,
  });

  const [password, setPassword] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const mutation = useMutation({
    mutationFn: () => connectVendorToCourier(supabase, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-courier-connected", vendor?.id] });
      setPassword("");
    },
  });

  if (!vendor || connected !== false || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[420px] rounded-xl bg-white p-6 shadow-xl">
        <p className="text-[16px] font-bold text-ink">Connect your Courier account</p>
        <p className="mt-1.5 text-[13px] text-muted">
          Your email is <span className="font-semibold text-ink-dark">{vendor.store_name}&rsquo;s KMO login email</span>.
          Enter the password admin gave you for Courier Fast Service to link it — you&rsquo;ll be able to send
          orders there directly from KMO.
        </p>

        <input
          type="password"
          placeholder="Courier password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
          className="mt-4 w-full rounded-lg border border-border px-[14px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
        />

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
