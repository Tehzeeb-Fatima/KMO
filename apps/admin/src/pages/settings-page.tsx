import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatformSettings, logAdminAction, updatePlatformSettings } from "@kmo/shared/api";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => getPlatformSettings(supabase),
  });

  const [commission, setCommission] = useState("8");
  const [codCitywide, setCodCitywide] = useState(true);

  useEffect(() => {
    if (settings) {
      setCommission(String(settings.default_commission_rate));
      setCodCitywide((settings.delivery_zones ?? []).includes("citywide-cod"));
    }
  }, [settings]);

  const saveCommission = useMutation({
    mutationFn: () =>
      updatePlatformSettings(supabase, { default_commission_rate: Number(commission) || 0 }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      if (user) {
        void logAdminAction(supabase, user.id, "settings.commission", "platform_settings", undefined, {
          default_commission_rate: updated.default_commission_rate,
        });
      }
    },
  });

  const toggleCod = useMutation({
    mutationFn: (next: boolean) =>
      updatePlatformSettings(supabase, {
        delivery_zones: next ? ["citywide-cod"] : [],
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      setCodCitywide((updated.delivery_zones ?? []).includes("citywide-cod"));
      if (user) void logAdminAction(supabase, user.id, "settings.delivery_zones", "platform_settings");
    },
  });

  return (
    <div className="flex max-w-[640px] flex-col gap-4">
      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Platform commission</p>
        <div className="flex items-center gap-3">
          <input
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            onBlur={() => saveCommission.mutate()}
            className="w-20 rounded-lg border border-border px-3 py-2.5 text-[13.5px] outline-none focus:border-primary-light"
          />
          <span className="text-[13px] text-muted">% default commission on new vendors</span>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Delivery zones</p>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-ink-dark">Cash on delivery citywide</span>
          <button
            type="button"
            role="switch"
            aria-checked={codCitywide}
            onClick={() => toggleCod.mutate(!codCitywide)}
            className="flex h-5 w-[38px] items-center rounded-full p-[2px]"
            style={{
              background: codCitywide ? "var(--color-accent)" : "var(--color-border)",
              justifyContent: codCitywide ? "flex-end" : "flex-start",
            }}
          >
            <span className="h-4 w-4 rounded-full bg-white" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Admin roles</p>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-ink-dark">Super Admin — full access</span>
          <span className="text-muted">1 user</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-ink-dark">Support Staff — orders &amp; reviews only</span>
          <span className="text-muted">0 users</span>
        </div>
      </div>
    </div>
  );
}
