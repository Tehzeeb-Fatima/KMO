import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getVendorCourierAccount, setVendorCourierPassword } from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

/** Lets admin assign (or reset) the one-time password a vendor uses to link
 * their own Courier Fast Service account from the KMO vendor dashboard. */
export function VendorCourierSection({ vendorId, courierConnected }: { vendorId: string; courierConnected: boolean }) {
  const queryClient = useQueryClient();
  const { data: account } = useQuery({
    queryKey: ["vendor-courier-account", vendorId],
    queryFn: () => getVendorCourierAccount(supabase, vendorId),
  });

  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => setVendorCourierPassword(supabase, vendorId, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-courier-account", vendorId] });
      setPassword("");
    },
  });

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-bold text-ink">Courier Fast Service account</span>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={
            courierConnected
              ? { background: "var(--color-success-tint, #e6f6ec)", color: "var(--color-success, #1a7f3c)" }
              : { background: "var(--color-surface-alt)", color: "var(--color-muted)" }
          }
        >
          {courierConnected ? "Connected" : "Not connected"}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-muted">
        Set a password and tell the vendor (outside KMO, e.g. WhatsApp or call) to use it along with their KMO
        email to connect, from a popup that shows on their dashboard. Once they connect, they can log in to
        Courier with that same email + password.
      </p>

      {account?.pending_password ? (
        <p className="mt-3 rounded-md bg-primary-tint px-3 py-2 text-[12.5px] font-semibold text-ink-dark">
          Password waiting to be used: <span className="font-mono">{account.pending_password}</span>
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={courierConnected ? "Set a new password to reconnect" : "Set a password"}
          autoComplete="off"
          className="flex-1 rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
        />
        <button
          type="button"
          disabled={!password.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="rounded-lg bg-accent px-3 py-2 text-[12.5px] font-bold text-white disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : "Set password"}
        </button>
      </div>
    </div>
  );
}
