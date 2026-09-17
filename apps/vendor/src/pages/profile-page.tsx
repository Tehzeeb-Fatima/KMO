import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", profile.id);
      if (newPassword) {
        await supabase.auth.updateUser({ password: newPassword });
      }
    },
    onSuccess: async () => {
      await refreshProfile();
      setNewPassword("");
      setCurrentPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <div className="flex max-w-[520px] flex-col gap-4">
      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-6">
        <Field label="First name">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
        </Field>

        <p className="mt-2 text-[15px] font-bold text-ink">Change password</p>
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
        />
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-fit rounded-[10px] bg-accent px-[26px] py-[13px] text-sm font-bold text-white disabled:opacity-60"
        >
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </button>
        {saved ? <span className="text-sm text-success">Saved.</span> : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[7px]">
      <span className="text-[12.5px] font-bold text-ink-dark">{label}</span>
      {children}
    </div>
  );
}
