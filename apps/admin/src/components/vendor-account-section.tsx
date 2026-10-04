import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/** Login email of the vendor's account, plus an admin-only password reset. */
export function VendorAccountSection({ vendorId, ownerId }: { vendorId: string; ownerId: string }) {
  const { data: email, isLoading } = useQuery({
    queryKey: ["vendor-owner-email", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_vendor_owner_email", { p_vendor_id: vendorId });
      if (error) throw error;
      return data as string | null;
    },
  });

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setSaving(true);
    const { data, error: invokeError } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
      "admin-set-user-password",
      { body: { userId: ownerId, password } },
    );
    setSaving(false);
    if (invokeError || data?.error) {
      setError(data?.error ?? invokeError?.message ?? "Could not change the password.");
      return;
    }
    setPassword("");
    setConfirm("");
    setOpen(false);
    setMessage("Password updated. Share it with the vendor securely.");
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
      <span className="text-[15px] font-bold text-ink">Account</span>
      <p className="text-[13px] text-ink-dark">
        Login email:{" "}
        <span className="font-semibold">{isLoading ? "Loading…" : email ?? "Not available"}</span>
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setMessage(null);
          }}
          className="self-start text-[13px] font-bold text-accent"
        >
          Change password
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex max-w-[360px] flex-col gap-3">
          <input
            type="password"
            placeholder="New password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save password"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="rounded-md border border-border px-4 py-2 text-[13px] font-semibold text-ink-dark"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {message ? <p className="text-xs text-success">{message}</p> : null}
    </div>
  );
}
