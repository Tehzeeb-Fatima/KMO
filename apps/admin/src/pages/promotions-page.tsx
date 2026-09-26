import { useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPromotion,
  deletePromotion,
  listAllPromotions,
  listCategories,
  listVendors,
  logAdminAction,
  updatePromotion,
  uploadPromotionImage,
  type PromotionWithLinks,
} from "@kmo/shared/api";
import { ConfirmDialog, Countdown } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time, not an ISO string. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultEnd() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return toLocalInput(d.toISOString());
}

export function PromotionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editing, setEditing] = useState<PromotionWithLinks | null | "new">(null);

  const { data: promotions, isLoading } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: () => listAllPromotions(supabase),
  });

  const [pendingDelete, setPendingDelete] = useState<PromotionWithLinks | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePromotion(supabase, id),
    onSuccess: (_void, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      if (user) void logAdminAction(supabase, user.id, "promotion.delete", "promotion", id);
      setPendingDelete(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updatePromotion(supabase, id, { is_active: isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-promotions"] }),
  });

  if (editing !== null) {
    return (
      <PromotionForm
        promotion={editing === "new" ? null : editing}
        onBack={() => setEditing(null)}
      />
    );
  }

  const now = Date.now();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted">
          Deals shown on the homepage with a live countdown.
        </p>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-accent px-[18px] py-[10px] text-[13px] font-bold text-white"
        >
          + Add promotion
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[2fr_1.2fr_1fr_1.2fr_1fr_150px] items-center bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
            <span>Promotion</span>
            <span>Scope</span>
            <span>Discount</span>
            <span>Ends in</span>
            <span>Status</span>
            <span />
          </div>

          {isLoading ? (
            <p className="p-5 text-sm text-muted">Loading…</p>
          ) : !promotions || promotions.length === 0 ? (
            <p className="p-5 text-sm text-muted">
              No promotions yet — add one and it appears on the homepage right away.
            </p>
          ) : (
            promotions.map((promo) => {
              const ended = new Date(promo.ends_at).getTime() <= now;
              const notStarted = new Date(promo.starts_at).getTime() > now;
              const status = !promo.is_active
                ? { label: "Paused", color: "var(--color-muted)" }
                : ended
                  ? { label: "Ended", color: "var(--color-danger)" }
                  : notStarted
                    ? { label: "Scheduled", color: "var(--color-warning)" }
                    : { label: "Live", color: "var(--color-success)" };
              return (
                <div
                  key={promo.id}
                  className="grid grid-cols-[2fr_1.2fr_1fr_1.2fr_1fr_150px] items-center border-t border-[#F5F0EE] px-5 py-4 text-[13px]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-10 w-14 shrink-0 rounded-md bg-surface-alt bg-cover bg-center"
                      style={
                        promo.image_url ? { backgroundImage: `url(${promo.image_url})` } : undefined
                      }
                    />
                    <span className="truncate font-bold text-ink-dark">{promo.title}</span>
                  </div>
                  <span className="truncate text-muted">
                    {promo.vendors?.store_name ?? "All vendors"}
                    {promo.categories ? ` · ${promo.categories.name}` : ""}
                  </span>
                  <span className="text-ink-dark">
                    {promo.discount_type === "percentage"
                      ? `${Number(promo.discount_value)}% off`
                      : `Rs. ${Number(promo.discount_value).toLocaleString()}`}
                    <span className="block text-[10.5px] font-normal text-muted-table">
                      {promo.funded_by === "kmo"
                        ? "KMO-funded"
                        : promo.funded_by === "vendor"
                          ? "Vendor-funded"
                          : `Shared ${promo.vendor_funded_percent}% vendor`}
                    </span>
                  </span>
                  <span className="text-muted">
                    {ended ? (
                      "—"
                    ) : (
                      <Countdown endsAt={promo.ends_at} compact className="text-ink-dark" />
                    )}
                  </span>
                  <span className="font-semibold" style={{ color: status.color }}>
                    {status.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(promo)}
                      className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        toggleMutation.mutate({ id: promo.id, isActive: !promo.is_active })
                      }
                      className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink-dark"
                    >
                      {promo.is_active ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(promo)}
                      className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.title}"?`}
        message="It disappears from the homepage straight away. This can't be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(pendingDelete!.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function PromotionForm({
  promotion,
  onBack,
}: {
  promotion: PromotionWithLinks | null;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: vendors } = useQuery({
    queryKey: ["approved-vendors"],
    queryFn: () => listVendors(supabase, { status: "approved" }),
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(supabase),
  });

  const [title, setTitle] = useState(promotion?.title ?? "");
  const [subtitle, setSubtitle] = useState(promotion?.subtitle ?? "");
  const [imageUrl, setImageUrl] = useState(promotion?.image_url ?? "");
  const [vendorId, setVendorId] = useState(promotion?.vendor_id ?? "");
  const [categoryId, setCategoryId] = useState(promotion?.category_id ?? "");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    promotion?.discount_type ?? "percentage",
  );
  const [discountValue, setDiscountValue] = useState(
    promotion ? String(promotion.discount_value) : "",
  );
  const [startsAt, setStartsAt] = useState(
    promotion ? toLocalInput(promotion.starts_at) : toLocalInput(new Date().toISOString()),
  );
  const [endsAt, setEndsAt] = useState(
    promotion ? toLocalInput(promotion.ends_at) : defaultEnd(),
  );
  const [isActive, setIsActive] = useState(promotion?.is_active ?? true);
  const [fundedBy, setFundedBy] = useState<"kmo" | "vendor" | "shared">(
    promotion?.funded_by ?? "kmo",
  );
  const [vendorFundedPercent, setVendorFundedPercent] = useState(
    String(promotion?.vendor_funded_percent ?? 50),
  );
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(
    promotion?.max_discount_amount ? String(promotion.max_discount_amount) : "",
  );
  const [minOrderAmount, setMinOrderAmount] = useState(
    promotion?.min_order_amount ? String(promotion.min_order_amount) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadPromotionImage(supabase, file),
    onSuccess: (url) => {
      setImageUrl(url);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Give the promotion a title.");
      const value = Number(discountValue);
      if (!value || value <= 0) {
        throw new Error(
          discountType === "percentage"
            ? "Enter the percentage off."
            : "Enter the sale price.",
        );
      }
      if (discountType === "percentage" && value > 90) {
        throw new Error("A percentage that high is probably a typo — keep it at 90 or under.");
      }
      const start = new Date(startsAt);
      const end = new Date(endsAt);
      if (!(end.getTime() > start.getTime())) {
        throw new Error("The end time has to be after the start time.");
      }
      if (fundedBy === "shared") {
        const pct = Number(vendorFundedPercent);
        if (!(pct > 0 && pct < 100)) {
          throw new Error("For a shared split, the vendor's share must be between 1 and 99%.");
        }
      }

      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        image_url: imageUrl || null,
        vendor_id: vendorId || null,
        category_id: categoryId || null,
        discount_type: discountType,
        discount_value: value,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        is_active: isActive,
        funded_by: fundedBy,
        vendor_funded_percent:
          fundedBy === "kmo" ? 0 : fundedBy === "vendor" ? 100 : Number(vendorFundedPercent),
        max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        min_order_amount: minOrderAmount ? Number(minOrderAmount) : null,
      };

      return promotion
        ? updatePromotion(supabase, promotion.id, payload)
        : createPromotion(supabase, payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      if (user) {
        void logAdminAction(
          supabase,
          user.id,
          promotion ? "promotion.update" : "promotion.create",
          "promotion",
          saved.id,
        );
      }
      onBack();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 text-[12.5px] font-bold text-accent">
        ← Back to promotions
      </button>

      <div className="grid max-w-[900px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-6">
          <Field label="Title">
            <input
              placeholder="e.g. Eid Electronics Sale"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
          </Field>

          <Field label="Subtitle (optional)">
            <input
              placeholder="e.g. Top brands, cash on delivery citywide"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Vendor (optional)">
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="rounded-lg border border-border px-3 py-2.5 text-[13px] text-ink-dark"
              >
                <option value="">All vendors</option>
                {vendors?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.store_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category (optional)">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="rounded-lg border border-border px-3 py-2.5 text-[13px] text-ink-dark"
              >
                <option value="">All categories</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Discount shown as">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                className="rounded-lg border border-border px-3 py-2.5 text-[13px] text-ink-dark"
              >
                <option value="percentage">Percentage off</option>
                <option value="fixed">Sale price</option>
              </select>
            </Field>
            <Field
              label={discountType === "percentage" ? "Percentage off" : "Sale price (Rs.)"}
            >
              <input
                type="number"
                min="1"
                placeholder={discountType === "percentage" ? "e.g. 30" : "e.g. 1999"}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
              />
            </Field>
          </div>

          <div className="rounded-lg border border-border bg-surface-alt p-4">
            <Field label="Who funds this discount?">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "kmo", label: "KMO", hint: "Vendor payout unaffected" },
                    { value: "vendor", label: "Vendor", hint: "Vendor payout reduced" },
                    { value: "shared", label: "Shared", hint: "Split by %" },
                  ] as const
                ).map((opt) => {
                  const active = fundedBy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFundedBy(opt.value)}
                      className="rounded-lg px-3.5 py-2.5 text-left text-[12.5px]"
                      style={
                        active
                          ? { border: "1.5px solid var(--color-accent)", background: "var(--color-accent-tint)" }
                          : { border: "1.5px solid var(--color-border)", background: "#fff" }
                      }
                    >
                      <span className="block font-bold text-ink-dark">{opt.label}</span>
                      <span className="block text-[11px] text-muted">{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            {fundedBy === "shared" ? (
              <div className="mt-3">
                <Field label={`Vendor's share of the discount: ${vendorFundedPercent}%`}>
                  <input
                    type="range"
                    min="1"
                    max="99"
                    value={vendorFundedPercent}
                    onChange={(e) => setVendorFundedPercent(e.target.value)}
                    className="w-full"
                  />
                  <span className="text-[11.5px] text-muted">
                    KMO covers the remaining {100 - Number(vendorFundedPercent || 0)}%.
                  </span>
                </Field>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Max discount per order (optional)">
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 300 — caps exposure"
                  value={maxDiscountAmount}
                  onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                />
              </Field>
              <Field label="Minimum order to qualify (optional)">
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 1500"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                />
              </Field>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Commission is always calculated on the full price, before this discount — a
              promotion never changes a vendor's commission, only who covers the discount.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Starts">
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
              />
            </Field>
            <Field label="Ends (the countdown runs to this)">
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
              />
            </Field>
          </div>

          <Field label="Banner image">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={uploadMutation.isPending}
                onClick={() => fileRef.current?.click()}
                className="flex h-[70px] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] border-[1.5px] border-dashed border-border bg-cover bg-center text-[11px] text-muted-table disabled:opacity-60"
                style={
                  imageUrl
                    ? { backgroundImage: `url(${imageUrl})`, borderStyle: "solid" }
                    : undefined
                }
              >
                {uploadMutation.isPending ? "Uploading…" : imageUrl ? "" : "+ Upload"}
              </button>
              {imageUrl ? (
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="text-[12px] font-bold text-danger"
                >
                  Remove image
                </button>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </Field>

          {error ? <p className="text-[12.5px] font-semibold text-danger">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-[10px] bg-accent px-[26px] py-[13px] text-sm font-bold text-white disabled:opacity-60"
            >
              {saveMutation.isPending ? "Saving…" : promotion ? "Save changes" : "Add promotion"}
            </button>
            <label className="flex items-center gap-2 text-[13px] text-ink-dark">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Show on the homepage
            </label>
          </div>
        </div>

        {/* live preview of the homepage card */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
            Homepage preview
          </p>
          <div
            className="flex min-h-[210px] flex-col justify-between overflow-hidden rounded-xl border border-border bg-primary p-5"
            style={
              imageUrl
                ? {
                    backgroundImage: `linear-gradient(to top, rgba(28,10,42,0.92) 0%, rgba(28,10,42,0.55) 55%, rgba(28,10,42,0.25) 100%), url(${imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold text-white">
                  {discountType === "percentage"
                    ? `${Number(discountValue) || 0}% OFF`
                    : `Rs. ${(Number(discountValue) || 0).toLocaleString()}`}
                </span>
                {categoryId ? (
                  <span className="rounded-full bg-white/15 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-white/90">
                    {categories?.find((c) => c.id === categoryId)?.name}
                  </span>
                ) : null}
              </div>
              <h3 className="text-[19px] font-extrabold leading-[1.2] tracking-[-0.02em] text-white">
                {title || "Your promotion title"}
              </h3>
              {subtitle ? (
                <p className="line-clamp-2 text-[13px] leading-[1.5] text-white/80">{subtitle}</p>
              ) : null}
              {vendorId ? (
                <p className="text-[11.5px] font-semibold text-accent-tint">
                  {vendors?.find((v) => v.id === vendorId)?.store_name}
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex flex-col gap-1">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/60">
                Ends in
              </span>
              {endsAt ? <Countdown endsAt={new Date(endsAt).toISOString()} /> : null}
            </div>
          </div>
        </div>
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
