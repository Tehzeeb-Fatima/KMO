import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDefaultDeliveryRate,
  getPlatformSettings,
  getPreviewToken,
  listCategories,
  listDefaultDeliveryRates,
  listVendors,
  logAdminAction,
  regeneratePreviewToken,
  setDefaultDeliveryRate,
  updatePlatformSettings,
  uploadPromotionImage,
} from "@kmo/shared/api";
import { ConfirmDialog, SearchableSelect } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { categoryOptions, DELIVERY_CITY_OPTIONS } from "@kmo/shared/lib";
import { supabase } from "../lib/supabase";

const CUSTOMER_URL = import.meta.env.VITE_CUSTOMER_URL ?? "https://karachimartonline.com";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => getPlatformSettings(supabase),
  });

  const [commission, setCommission] = useState("0");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [codCitywide, setCodCitywide] = useState(true);
  const [membershipFee, setMembershipFee] = useState("499");
  const [trialMonths, setTrialMonths] = useState("2");
  const [commissionFreeMonths, setCommissionFreeMonths] = useState("3");
  const [agreementTitle, setAgreementTitle] = useState("");
  const [agreementBody, setAgreementBody] = useState("");
  const [vendorOfWeekId, setVendorOfWeekId] = useState("");
  const [bottomCategoryId, setBottomCategoryId] = useState("");
  const [bottomCategorySaved, setBottomCategorySaved] = useState(false);
  const { data: allCategories } = useQuery({
    queryKey: ["admin-categories-for-bottom"],
    queryFn: () => listCategories(supabase),
  });
  const [vendorOfWeekImage, setVendorOfWeekImage] = useState<string | null>(null);
  const [vendorOfWeekImageUploading, setVendorOfWeekImageUploading] = useState(false);
  const { data: approvedVendors } = useQuery({
    queryKey: ["admin-vendors-for-week"],
    queryFn: () => listVendors(supabase, { status: "approved" }),
  });

  useEffect(() => {
    if (settings) {
      setVendorOfWeekId(settings.vendor_of_week_id ?? "");
      setBottomCategoryId(settings.bottom_category_id ?? "");
      setVendorOfWeekImage(settings.vendor_of_week_image_url ?? null);
      setCommission(String(settings.default_commission_rate));
      setCodCitywide((settings.delivery_zones ?? []).includes("citywide-cod"));
      setMembershipFee(String(settings.vendor_membership_fee));
      setTrialMonths(String(settings.vendor_free_trial_months));
      setCommissionFreeMonths(String(settings.commission_free_months));
      setAgreementTitle(settings.vendor_agreement_title);
      setAgreementBody(settings.vendor_agreement_body);
      setWhatsappNumber(settings.whatsapp_number ?? "");
    }
  }, [settings]);

  const [vendorOfWeekSaved, setVendorOfWeekSaved] = useState(false);
  const saveVendorOfWeek = useMutation({
    mutationFn: () =>
      updatePlatformSettings(supabase, {
        vendor_of_week_id: vendorOfWeekId || null,
        vendor_of_week_image_url: vendorOfWeekImage,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      if (user) void logAdminAction(supabase, user.id, "settings.vendor_of_week", "platform_settings");
      setVendorOfWeekSaved(true);
      setTimeout(() => setVendorOfWeekSaved(false), 2500);
    },
  });

  const saveWhatsapp = useMutation({
    mutationFn: () =>
      updatePlatformSettings(supabase, {
        whatsapp_number: whatsappNumber.trim() === "" ? null : whatsappNumber.replace(/[^\d+]/g, ""),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      setWhatsappNumber(updated.whatsapp_number ?? "");
      if (user) {
        void logAdminAction(supabase, user.id, "settings.whatsapp_number", "platform_settings", undefined, {
          whatsapp_number: updated.whatsapp_number,
        });
      }
    },
  });

  const toggleHeroBoxes = useMutation({
    mutationFn: (next: boolean) => updatePlatformSettings(supabase, { show_hero_boxes: next }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      if (user) void logAdminAction(supabase, user.id, "settings.hero_boxes", "platform_settings");
    },
  });

  const toggleDcReminder = useMutation({
    mutationFn: async (next: boolean) => {
      const updated = await updatePlatformSettings(supabase, { dc_reminder_enabled: next });
      // The popup's meaning changes with this toggle, so every vendor should
      // see the fresh version once more rather than staying dismissed.
      await supabase.from("vendors").update({ dc_reminder_acknowledged: false }).not("id", "is", null);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      if (user) void logAdminAction(supabase, user.id, "settings.dc_reminder", "platform_settings");
    },
  });

  const toggleDcInfoPopup = useMutation({
    mutationFn: async (next: boolean) => {
      const updated = await updatePlatformSettings(supabase, { dc_info_popup_enabled: next });
      await supabase.from("vendors").update({ dc_reminder_acknowledged: false }).not("id", "is", null);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      if (user) void logAdminAction(supabase, user.id, "settings.dc_info_popup", "platform_settings");
    },
  });

  const saveBottomCategory = useMutation({
    mutationFn: () =>
      updatePlatformSettings(supabase, { bottom_category_id: bottomCategoryId || null }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      if (user) void logAdminAction(supabase, user.id, "settings.bottom_category", "platform_settings");
      setBottomCategorySaved(true);
      setTimeout(() => setBottomCategorySaved(false), 2500);
    },
  });

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

  const saveMembership = useMutation({
    mutationFn: () =>
      updatePlatformSettings(supabase, {
        vendor_membership_fee: Number(membershipFee) || 0,
        vendor_free_trial_months: Number(trialMonths) || 0,
        commission_free_months: Number(commissionFreeMonths) || 0,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      if (user) void logAdminAction(supabase, user.id, "settings.membership", "platform_settings");
    },
  });

  const [agreementSaved, setAgreementSaved] = useState(false);
  const saveAgreement = useMutation({
    mutationFn: () =>
      updatePlatformSettings(supabase, {
        vendor_agreement_title: agreementTitle,
        vendor_agreement_body: agreementBody,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      if (user) void logAdminAction(supabase, user.id, "settings.vendor_agreement", "platform_settings");
      setAgreementSaved(true);
      setTimeout(() => setAgreementSaved(false), 2500);
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

  const { data: previewToken } = useQuery({
    queryKey: ["preview-token"],
    queryFn: () => getPreviewToken(supabase),
  });
  const previewLink = previewToken ? `${CUSTOMER_URL}/?preview=${previewToken}` : "";
  const [copied, setCopied] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const regenerateMutation = useMutation({
    mutationFn: () => regeneratePreviewToken(supabase),
    onSuccess: (token) => {
      queryClient.setQueryData(["preview-token"], token);
      if (user) void logAdminAction(supabase, user.id, "settings.preview_link_regenerated", "platform_settings");
      setConfirmRegenerate(false);
    },
  });

  return (
    <div className="flex max-w-[640px] flex-col gap-4">
      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Homepage hero boxes</p>
        <p className="text-xs text-muted">The three boxes under the homepage banner (headline, COD and vendor of the week).</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={settings?.show_hero_boxes ?? true}
            onClick={() => toggleHeroBoxes.mutate(!(settings?.show_hero_boxes ?? true))}
            className="flex h-[23px] w-[42px] shrink-0 items-center rounded-full p-[2px] transition-colors"
            style={{
              background: (settings?.show_hero_boxes ?? true) ? "var(--color-accent)" : "var(--color-border)",
              justifyContent: (settings?.show_hero_boxes ?? true) ? "flex-end" : "flex-start",
            }}
          >
            <span className="h-[19px] w-[19px] rounded-full bg-white" />
          </button>
          <span className="text-[13px] font-semibold text-ink-dark">
            {(settings?.show_hero_boxes ?? true) ? "Shown" : "Hidden"}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Vendor of the week</p>
        <p className="text-xs text-muted">
          The vendor featured in the homepage &ldquo;Vendor of the week&rdquo; card. If none is
          picked, the first approved vendor is shown.
        </p>
        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-bold text-ink-dark">Banner image (optional)</span>
          <div className="flex flex-wrap items-center gap-3">
            {vendorOfWeekImage ? (
              <div
                className="h-[90px] w-[160px] rounded-[9px] border border-border bg-cover bg-center"
                style={{ backgroundImage: `url(${vendorOfWeekImage})` }}
              />
            ) : null}
            <label className="cursor-pointer rounded-lg border border-border bg-white px-4 py-2.5 text-[12.5px] font-bold text-primary">
              {vendorOfWeekImageUploading ? "Uploading…" : vendorOfWeekImage ? "Change image" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={vendorOfWeekImageUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setVendorOfWeekImageUploading(true);
                  try {
                    setVendorOfWeekImage(await uploadPromotionImage(supabase, file));
                  } finally {
                    setVendorOfWeekImageUploading(false);
                  }
                }}
              />
            </label>
            {vendorOfWeekImage ? (
              <button
                type="button"
                onClick={() => setVendorOfWeekImage(null)}
                className="text-[12px] font-bold text-danger"
              >
                Remove image
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={vendorOfWeekId}
            onChange={(e) => setVendorOfWeekId(e.target.value)}
            className="min-w-[240px] rounded-lg border border-border px-3 py-2.5 text-[13px] text-ink-dark"
          >
            <option value="">Automatic (first approved vendor)</option>
            {approvedVendors?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.store_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => saveVendorOfWeek.mutate()}
            disabled={saveVendorOfWeek.isPending}
            className="rounded-[7px] bg-accent px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {saveVendorOfWeek.isPending ? "Saving…" : "Save"}
          </button>
          {vendorOfWeekSaved ? <span className="text-[12px] font-bold text-success">Saved</span> : null}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Homepage bottom category</p>
        <p className="text-xs text-muted">
          Shows one category&rsquo;s products as a slider just below the customer testimonials. Leave
          it on &ldquo;None&rdquo; to hide it.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={bottomCategoryId}
            onChange={(e) => setBottomCategoryId(e.target.value)}
            className="min-w-[240px] rounded-lg border border-border px-3 py-2.5 text-[13px] text-ink-dark"
          >
            <option value="">None (hidden)</option>
            {categoryOptions(allCategories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => saveBottomCategory.mutate()}
            disabled={saveBottomCategory.isPending}
            className="rounded-[7px] bg-accent px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {saveBottomCategory.isPending ? "Saving…" : "Save"}
          </button>
          {bottomCategorySaved ? <span className="text-[12px] font-bold text-success">Saved</span> : null}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Platform commission</p>
        <p className="text-xs text-muted">
          Per the vendor rule book, KMO doesn't charge commission — this stays at 0% and vendors
          keep the full sale amount. Revenue comes from the membership fee below instead.
        </p>
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

      <DefaultDeliveryRatesCard />

      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Delivery charges info popup</p>
        <p className="text-xs text-muted">
          Shows vendors a popup (on every login, until dismissed) telling them delivery is currently free for their
          customers, with a link to review KMO&rsquo;s default delivery charges and a WhatsApp number to discuss.
          Has no effect while &ldquo;Vendor-set delivery charges&rdquo; below is on — that popup takes over instead.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={settings?.dc_info_popup_enabled ?? false}
            onClick={() => toggleDcInfoPopup.mutate(!(settings?.dc_info_popup_enabled ?? false))}
            className="flex h-[23px] w-[42px] shrink-0 items-center rounded-full p-[2px] transition-colors"
            style={{
              background: (settings?.dc_info_popup_enabled ?? false) ? "var(--color-accent)" : "var(--color-border)",
              justifyContent: (settings?.dc_info_popup_enabled ?? false) ? "flex-end" : "flex-start",
            }}
          >
            <span className="h-[19px] w-[19px] rounded-full bg-white" />
          </button>
          <span className="text-[13px] font-semibold text-ink-dark">
            {(settings?.dc_info_popup_enabled ?? false) ? "On" : "Off"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Vendor-set delivery charges</p>
        <p className="text-xs text-muted">
          Off: vendors can&rsquo;t set their own delivery charge (the info popup above, if on, is what they see
          instead). On: vendors can set their own charge from their Shipping page — still capped by whatever you set
          on Delivery Caps — and get a popup (on every login, until dismissed) either asking them to set one, or to
          review what they&rsquo;ve already set.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={settings?.dc_reminder_enabled ?? false}
            onClick={() => toggleDcReminder.mutate(!(settings?.dc_reminder_enabled ?? false))}
            className="flex h-[23px] w-[42px] shrink-0 items-center rounded-full p-[2px] transition-colors"
            style={{
              background: (settings?.dc_reminder_enabled ?? false) ? "var(--color-accent)" : "var(--color-border)",
              justifyContent: (settings?.dc_reminder_enabled ?? false) ? "flex-end" : "flex-start",
            }}
          >
            <span className="h-[19px] w-[19px] rounded-full bg-white" />
          </button>
          <span className="text-[13px] font-semibold text-ink-dark">
            {(settings?.dc_reminder_enabled ?? false) ? "On" : "Off"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">WhatsApp support</p>
        <p className="text-xs text-muted">
          Shown as a floating WhatsApp button on every storefront page. Leave blank to hide it.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            onBlur={() => saveWhatsapp.mutate()}
            placeholder="e.g. +923001234567"
            autoComplete="off"
            className="w-56 rounded-lg border border-border px-3 py-2.5 text-[13.5px] outline-none focus:border-primary-light"
          />
          <span className="text-[13px] text-muted">with country code</span>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Vendor membership</p>
        <p className="text-xs text-muted">
          New vendors get a free trial, then pay this flat monthly fee instead of commission.
        </p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-ink-dark">Monthly fee (Rs.)</span>
            <input
              value={membershipFee}
              onChange={(e) => setMembershipFee(e.target.value)}
              onBlur={() => saveMembership.mutate()}
              className="rounded-lg border border-border px-3 py-2.5 text-[13.5px] outline-none focus:border-primary-light"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-ink-dark">Free trial (months)</span>
            <input
              value={trialMonths}
              onChange={(e) => setTrialMonths(e.target.value)}
              onBlur={() => saveMembership.mutate()}
              className="rounded-lg border border-border px-3 py-2.5 text-[13.5px] outline-none focus:border-primary-light"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-ink-dark">Commission-free period (months)</span>
            <input
              value={commissionFreeMonths}
              onChange={(e) => setCommissionFreeMonths(e.target.value)}
              onBlur={() => saveMembership.mutate()}
              className="rounded-lg border border-border px-3 py-2.5 text-[13.5px] outline-none focus:border-primary-light"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Vendor Rule Book & Seller Guidelines</p>
        <p className="text-xs text-muted">
          Shown publicly at /vendor-agreement, linked from the customer site footer and the
          vendor dashboard. Editing here updates it immediately — no code changes needed.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold text-ink-dark">Title</span>
          <input
            value={agreementTitle}
            onChange={(e) => setAgreementTitle(e.target.value)}
            className="rounded-lg border border-border px-3 py-2.5 text-[13.5px] outline-none focus:border-primary-light"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold text-ink-dark">
            Body — start a line with "# " for a section heading, "- " for a bullet point
          </span>
          <textarea
            value={agreementBody}
            onChange={(e) => setAgreementBody(e.target.value)}
            rows={14}
            className="rounded-lg border border-border px-3 py-2.5 font-mono text-[12.5px] leading-relaxed outline-none focus:border-primary-light"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => saveAgreement.mutate()}
            disabled={saveAgreement.isPending}
            className="w-fit rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saveAgreement.isPending ? "Saving…" : "Save vendor agreement"}
          </button>
          {agreementSaved ? <span className="text-xs font-semibold text-success">Saved.</span> : null}
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
        <div className="flex flex-col gap-[3px]">
          <p className="text-[15px] font-bold text-ink">Preview link</p>
          <p className="text-xs text-muted">
            Share this with vendors or testers to let them browse the full site while maintenance
            mode is on. Anyone with the link gets in for 30 days — make a new link to cut off
            everyone who has the old one.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={previewLink || "Loading…"}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface-alt px-3 py-2.5 font-mono text-[12px] text-ink-dark outline-none"
          />
          <button
            type="button"
            disabled={!previewLink}
            onClick={async () => {
              await navigator.clipboard.writeText(previewLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="rounded-lg bg-accent px-4 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmRegenerate(true)}
            className="rounded-lg border border-border bg-white px-4 py-2.5 text-[12.5px] font-bold text-primary"
          >
            New link
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRegenerate}
        title="Make a new preview link?"
        message="The current link stops working straight away, including for everyone you've already shared it with."
        confirmLabel="Make new link"
        loading={regenerateMutation.isPending}
        onConfirm={() => regenerateMutation.mutate()}
        onCancel={() => setConfirmRegenerate(false)}
      />

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

/** City-wise fallback delivery fee, used when a vendor hasn't set their own
 *  rate for that city. Pick "Other" to cover every city not listed. */
function DefaultDeliveryRatesCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ["default-delivery-rates"];

  const { data: rates, isLoading } = useQuery({
    queryKey,
    queryFn: () => listDefaultDeliveryRates(supabase),
  });

  const availableCities = DELIVERY_CITY_OPTIONS.filter((c) => !rates?.some((r) => r.city === c));
  const [city, setCity] = useState("");
  const [fee, setFee] = useState("");
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      setDefaultDeliveryRate(supabase, {
        city,
        fee: Number(fee),
        free_delivery_threshold: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (user) void logAdminAction(supabase, user.id, "settings.default_delivery_rate", "platform_settings");
      setCity("");
      setFee("");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const [pendingDelete, setPendingDelete] = useState<{ id: string; city: string } | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDefaultDeliveryRate(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setPendingDelete(null);
    },
  });

  const canSave = city.trim() && fee.trim() && Number(fee) >= 0 && !saveMutation.isPending;

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
      <p className="text-[15px] font-bold text-ink">Default delivery fee</p>
      <p className="text-xs text-muted">
        Used only when a vendor hasn&rsquo;t set their own delivery charge for a customer&rsquo;s city (vendors set
        theirs on their Shipping page). Pick <span className="font-semibold text-ink-dark">Other</span> to cover
        every city you haven&rsquo;t listed individually. A city with no row here and no Other row is free.
      </p>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
        <SearchableSelect
          options={availableCities}
          value={city}
          onChange={(c) => {
            setCity(c);
            setError(null);
          }}
          placeholder="City…"
          className="col-span-2 sm:col-span-1"
        />
        <input
          value={fee}
          onChange={(e) => {
            setFee(e.target.value);
            setError(null);
          }}
          placeholder="Fee (Rs.)"
          autoComplete="off"
          className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
        />
        <button
          type="button"
          disabled={!canSave}
          onClick={() => saveMutation.mutate()}
          className="rounded-lg bg-accent px-4 py-2 text-[12.5px] font-bold text-white disabled:opacity-60"
        >
          Save
        </button>
      </div>
      {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="grid min-w-[320px] grid-cols-[1fr_1fr_60px] bg-surface-alt px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-table">
          <span>City</span>
          <span>Fee</span>
          <span />
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted">Loading…</p>
        ) : !rates || rates.length === 0 ? (
          <p className="p-4 text-sm text-muted">No rows yet — delivery is free everywhere until you add one.</p>
        ) : (
          rates.map((r) => (
            <div
              key={r.id}
              className="grid min-w-[320px] grid-cols-[1fr_1fr_60px] items-center border-t border-[#F5F0EE] px-3.5 py-2.5 text-[12.5px]"
            >
              <span className="font-bold text-ink-dark">{r.city}</span>
              <span className="text-ink-dark">Rs. {r.fee.toLocaleString()}</span>
              <button
                type="button"
                onClick={() => setPendingDelete({ id: r.id, city: r.city })}
                className="text-right text-[11px] font-bold text-danger"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Remove the default for ${pendingDelete?.city}?`}
        message="Vendors who haven't set their own rate for this city will charge no delivery fee until you add it back."
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(pendingDelete!.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
