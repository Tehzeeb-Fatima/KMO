import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatformSettings, logAdminAction, updatePlatformSettings } from "@kmo/shared/api";
import { ConfirmDialog } from "@kmo/shared/ui";
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

  const [pendingMaintenanceToggle, setPendingMaintenanceToggle] = useState<boolean | null>(null);
  const toggleMaintenance = useMutation({
    mutationFn: (next: boolean) => updatePlatformSettings(supabase, { maintenance_mode: next }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      if (user) {
        void logAdminAction(supabase, user.id, "settings.maintenance_mode", "platform_settings", undefined, {
          maintenance_mode: updated.maintenance_mode,
        });
      }
      setPendingMaintenanceToggle(null);
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

      <div
        className="flex flex-col gap-3.5 rounded-xl border p-[22px_24px]"
        style={
          settings?.maintenance_mode
            ? { borderColor: "var(--color-danger)", background: "var(--color-danger-tint)" }
            : { borderColor: "var(--color-border)", background: "var(--color-surface)" }
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-[3px]">
            <p className="text-[15px] font-bold text-ink">Maintenance mode</p>
            <p className="text-xs text-muted">
              {settings?.maintenance_mode
                ? "Site is DOWN for everyone except you (super admin)."
                : "Site is live. Turning this on takes the storefront offline for shoppers."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!settings?.maintenance_mode}
            onClick={() => setPendingMaintenanceToggle(!settings?.maintenance_mode)}
            className="flex h-[23px] w-[42px] shrink-0 items-center rounded-full p-[2px] transition-colors"
            style={{
              background: settings?.maintenance_mode ? "var(--color-danger)" : "var(--color-border)",
              justifyContent: settings?.maintenance_mode ? "flex-end" : "flex-start",
            }}
          >
            <span className="h-[19px] w-[19px] rounded-full bg-white" />
          </button>
        </div>
        <span
          className="w-fit rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={
            settings?.maintenance_mode
              ? { background: "var(--color-danger)", color: "#fff" }
              : { background: "var(--color-success-tint)", color: "var(--color-success-dark)" }
          }
        >
          {settings?.maintenance_mode ? "MAINTENANCE — ACTIVE" : "LIVE"}
        </span>
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

      <ConfirmDialog
        open={pendingMaintenanceToggle !== null}
        title={
          pendingMaintenanceToggle
            ? "Put the site into maintenance mode?"
            : "Bring the site back live?"
        }
        message={
          pendingMaintenanceToggle
            ? "Shoppers will see a maintenance page and won't be able to browse, sign in, or check out. You (super admin) can still visit and use the site normally while it's on."
            : "The storefront will be visible to everyone again."
        }
        confirmLabel={pendingMaintenanceToggle ? "Turn on maintenance mode" : "Bring site back live"}
        loading={toggleMaintenance.isPending}
        onConfirm={() => toggleMaintenance.mutate(pendingMaintenanceToggle!)}
        onCancel={() => setPendingMaintenanceToggle(null)}
      />
    </div>
  );
}
