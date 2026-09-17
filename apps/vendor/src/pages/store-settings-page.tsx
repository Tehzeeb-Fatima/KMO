import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVendor,
  getMyVendor,
  updateMyVendor,
  uploadVendorMedia,
} from "@kmo/shared/api";
import { WEEK_DAYS, type BusinessHours, type VendorPolicies } from "@kmo/shared/types";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "store"
  );
}

export function StoreSettingsPage() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["my-vendor"],
    queryFn: () => getMyVendor(supabase),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const storeName =
        (user?.user_metadata?.store_name as string | undefined) ||
        `${profile?.full_name ?? "My"}'s Store`;
      return createVendor(supabase, {
        owner_id: profile!.id,
        store_name: storeName,
        slug: `${slugify(storeName)}-${Math.random().toString(36).slice(2, 6)}`,
      });
    },
    onSuccess: (created) => {
      queryClient.setQueryData(["my-vendor"], created);
    },
  });

  const createTriggered = useRef(false);
  useEffect(() => {
    if (!isLoading && !vendor && profile && !createTriggered.current) {
      createTriggered.current = true;
      createMutation.mutate();
    }
  }, [isLoading, vendor, profile, createMutation]);

  const [storeName, setStoreName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [policies, setPolicies] = useState<VendorPolicies>({});
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  const [vacationOn, setVacationOn] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!vendor) return;
    setStoreName(vendor.store_name ?? "");
    setLocation(vendor.address ?? "");
    setDescription(vendor.description ?? "");
    setPolicies(vendor.policies ?? {});
    setBusinessHours(vendor.business_hours ?? {});
    setVacationOn(vendor.is_on_vacation);
    setLogoUrl(vendor.logo_url);
    setCoverUrl(vendor.cover_url);
  }, [vendor]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateMyVendor(supabase, vendor!.id, {
        store_name: storeName,
        address: location,
        description,
        policies,
        business_hours: businessHours,
        is_on_vacation: vacationOn,
        logo_url: logoUrl,
        cover_url: coverUrl,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["my-vendor"], updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ kind, file }: { kind: "logo" | "cover"; file: File }) =>
      uploadVendorMedia(supabase, vendor!.id, kind, file),
  });

  function handleFileChange(kind: "logo" | "cover") {
    return async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !vendor) return;
      const url = await uploadMutation.mutateAsync({ kind, file });
      if (kind === "logo") setLogoUrl(url);
      else setCoverUrl(url);
    };
  }

  if (isLoading || !vendor) {
    return <p className="text-sm text-muted">Loading your store…</p>;
  }

  return (
    <div className="flex max-w-[680px] flex-col gap-4">
      <SettingsCard title="Store banner & logo">
        <div className="flex gap-3.5">
          <UploadBox
            label="+ Upload banner"
            widthClass="w-[220px]"
            heightClass="h-20"
            imageUrl={coverUrl}
            onChange={handleFileChange("cover")}
          />
          <UploadBox
            label="+ Logo"
            widthClass="w-20"
            heightClass="h-20"
            small
            imageUrl={logoUrl}
            onChange={handleFileChange("logo")}
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Store details">
        <Field label="Store name">
          <input
            className="rounded-md border border-border px-[13px] py-[11px] text-[13.5px] text-ink outline-none focus:border-primary-light"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </Field>
        <Field label="Location">
          <input
            className="rounded-md border border-border px-[13px] py-[11px] text-[13.5px] text-ink outline-none focus:border-primary-light"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>
        <Field label="Store description">
          <textarea
            rows={3}
            className="resize-y rounded-md border border-border px-[13px] py-[11px] font-sans text-[13px] text-ink outline-none focus:border-primary-light"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </SettingsCard>

      <SettingsCard title="Store hours">
        <div className="flex flex-col">
          {WEEK_DAYS.map((day) => (
            <div
              key={day.key}
              className="flex items-center justify-between border-t border-[#F1EAE6] pt-[10px] pb-[10px] text-[13px] first:border-t-0 first:pt-0"
            >
              <span className="text-muted">{day.label}</span>
              <input
                className="w-52 rounded border-none bg-transparent text-right text-[13px] font-medium text-ink-dark outline-none focus:underline"
                placeholder="Closed"
                value={businessHours[day.key] ?? ""}
                onChange={(e) =>
                  setBusinessHours((prev) => ({ ...prev, [day.key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Vacation mode" bare>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-[3px]">
            <span className="text-[15px] font-bold text-ink">Vacation mode</span>
            <span className="text-xs text-muted">
              Pauses new orders while keeping your catalogue visible
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={vacationOn}
            onClick={() => setVacationOn((v) => !v)}
            className="flex h-[23px] w-[42px] items-center rounded-full p-[2px] transition-colors"
            style={{
              background: vacationOn ? "var(--color-accent)" : "var(--color-border)",
              justifyContent: vacationOn ? "flex-end" : "flex-start",
            }}
          >
            <span className="h-[19px] w-[19px] rounded-full bg-white" />
          </button>
        </div>
      </SettingsCard>

      <SettingsCard title="Shipping policy">
        <textarea
          rows={3}
          className="resize-y rounded-md border border-border px-[13px] py-[11px] font-sans text-[13px] text-ink outline-none focus:border-primary-light"
          value={policies.shipping ?? ""}
          onChange={(e) =>
            setPolicies((prev) => ({ ...prev, shipping: e.target.value }))
          }
        />
      </SettingsCard>

      <SettingsCard title="Refund policy">
        <textarea
          rows={3}
          className="resize-y rounded-md border border-border px-[13px] py-[11px] font-sans text-[13px] text-ink outline-none focus:border-primary-light"
          value={policies.refunds ?? ""}
          onChange={(e) =>
            setPolicies((prev) => ({ ...prev, refunds: e.target.value }))
          }
        />
      </SettingsCard>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="self-start rounded-[10px] bg-accent px-[26px] py-[13px] text-sm font-bold text-white disabled:opacity-60"
        >
          {saveMutation.isPending ? "Saving…" : "Save settings"}
        </button>
        {saved ? <span className="text-sm text-success">Saved.</span> : null}
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  children,
  bare = false,
}: {
  title: string;
  children: React.ReactNode;
  bare?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-[22px_24px]">
      {!bare && <span className="text-[15px] font-bold text-ink">{title}</span>}
      {children}
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

function UploadBox({
  label,
  widthClass,
  heightClass,
  small,
  imageUrl,
  onChange,
}: {
  label: string;
  widthClass: string;
  heightClass: string;
  small?: boolean;
  imageUrl: string | null;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[9px] border-[1.5px] border-dashed border-border bg-cover bg-center ${widthClass} ${heightClass} ${small ? "text-[11px]" : "text-xs"}`}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})`, borderStyle: "solid" } : undefined}
    >
      {!imageUrl && <span className="text-muted-table">{label}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
    </button>
  );
}
