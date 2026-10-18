import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCourier,
  createCourierRateSlab,
  deleteCourier,
  deleteCourierRateSlab,
  listCourierRateSlabs,
  listCouriers,
  listVendors,
  setCourierActive,
  updateCourierRateSlab,
} from "@kmo/shared/api";
import { calculateCourierCharge, DELIVERY_CITY_OPTIONS, findMatchingSlab, slabsForCity } from "@kmo/shared/lib";
import { ConfirmDialog, SearchableSelect } from "@kmo/shared/ui";
import type { Database } from "@kmo/shared/types";
import { supabase } from "../lib/supabase";

type CourierRow = Database["public"]["Tables"]["couriers"]["Row"];
type SlabRow = Database["public"]["Tables"]["courier_rate_slabs"]["Row"];

export function CouriersPage() {
  const queryClient = useQueryClient();
  const { data: couriers, isLoading } = useQuery({
    queryKey: ["couriers"],
    queryFn: () => listCouriers(supabase),
  });

  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: () => createCourier(supabase, name),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["couriers"] });
      setName("");
      setSelectedId(created.id);
    },
  });

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCourier(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["couriers"] });
      setPendingDelete(null);
      setSelectedId((cur) => (cur === pendingDelete?.id ? null : cur));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setCourierActive(supabase, id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["couriers"] }),
  });

  const selected = couriers?.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <input
            placeholder="New courier name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-border px-[14px] py-[10px] text-[13px] outline-none focus:border-primary-light"
          />
          <button
            type="button"
            disabled={!name.trim() || addMutation.isPending}
            onClick={() => addMutation.mutate()}
            className="rounded-lg bg-accent px-[16px] py-[10px] text-[13px] font-bold text-white disabled:opacity-60"
          >
            + Add
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          {isLoading ? (
            <p className="p-5 text-sm text-muted">Loading…</p>
          ) : !couriers || couriers.length === 0 ? (
            <p className="p-5 text-sm text-muted">No couriers yet.</p>
          ) : (
            couriers.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 border-t border-[#F5F0EE] px-4 py-3 text-[13px] first:border-t-0"
                style={
                  c.id === selectedId
                    ? { background: "var(--color-accent-tint)" }
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className="min-w-0 flex-1 truncate text-left font-bold text-ink-dark"
                >
                  {c.name}
                  {!c.is_active ? (
                    <span className="ml-2 text-[10.5px] font-semibold text-muted-table">
                      (inactive)
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => toggleActiveMutation.mutate({ id: c.id, isActive: !c.is_active })}
                  className="shrink-0 text-[11px] font-bold text-primary"
                >
                  {c.is_active ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete({ id: c.id, name: c.name })}
                  className="shrink-0 text-[11px] font-bold text-danger"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        {selected ? (
          <CourierRatesPanel key={selected.id} courier={selected} />
        ) : (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
            Select a courier to manage its rate slabs.
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Remove "${pendingDelete?.name}"?`}
        message="This also removes every rate slab (default and vendor-specific) set up for this courier."
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(pendingDelete!.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function CourierRatesPanel({ courier }: { courier: CourierRow }) {
  const courierId = courier.id;
  const courierName = courier.name;
  const [vendorId, setVendorId] = useState<string>("");

  const { data: vendors } = useQuery({
    queryKey: ["all-vendors-for-couriers"],
    queryFn: () => listVendors(supabase, { status: "approved" }),
  });

  return (
    <div className="flex flex-col gap-5">
      <SlabTable
        title={`${courierName} — default rates`}
        hint="Applies to every vendor unless a vendor-specific override below matches."
        courierId={courierId}
        vendorId={null}
      />

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="mb-3 text-[15px] font-bold text-ink">Vendor-specific override</p>
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="w-full max-w-[360px] rounded-lg border border-border px-3 py-2 text-[13px] text-ink-dark"
        >
          <option value="">Select a vendor…</option>
          {vendors?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.store_name}
            </option>
          ))}
        </select>
      </div>

      {vendorId ? (
        <SlabTable
          title={`Override for ${vendors?.find((v) => v.id === vendorId)?.store_name ?? "vendor"}`}
          hint="Takes priority over the default rates above for this vendor only."
          courierId={courierId}
          vendorId={vendorId}
        />
      ) : null}
    </div>
  );
}

function SlabTable({
  title,
  hint,
  courierId,
  vendorId,
}: {
  title: string;
  hint: string;
  courierId: string;
  vendorId: string | null;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["courier-rate-slabs", courierId, vendorId];

  const { data: slabs, isLoading } = useQuery({
    queryKey,
    queryFn: () => listCourierRateSlabs(supabase, courierId, vendorId),
  });

  const [pricingMode, setPricingMode] = useState<"weight" | "flat">("weight");
  const [city, setCity] = useState("");
  const [minWeight, setMinWeight] = useState("0");
  const [maxWeight, setMaxWeight] = useState("1");
  const [fee, setFee] = useState("");
  const [additionalPerKg, setAdditionalPerKg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  function switchMode(mode: "weight" | "flat") {
    setPricingMode(mode);
    if (mode === "flat") {
      setMinWeight("0");
      setMaxWeight("");
      setAdditionalPerKg("");
    } else {
      setMinWeight("0");
      setMaxWeight("1");
    }
  }

  // GST/tax and fuel charge are set once for this whole list (default, or
  // this one vendor's override — admin can give different vendors different
  // rates, or none) instead of per slab. New slabs pick these up
  // automatically; "Apply to all" retroactively updates existing ones.
  const [groupTaxPercent, setGroupTaxPercent] = useState("0");
  const [groupFuelChargePercent, setGroupFuelChargePercent] = useState("0");
  useEffect(() => {
    if (slabs && slabs.length > 0) {
      setGroupTaxPercent(String(slabs[0].tax_percent));
      setGroupFuelChargePercent(String(slabs[0].fuel_charge_percent));
    }
  }, [slabs]);

  const applyRatesMutation = useMutation({
    mutationFn: async () => {
      const patch = {
        tax_percent: Number(groupTaxPercent) || 0,
        fuel_charge_percent: Number(groupFuelChargePercent) || 0,
      };
      await Promise.all((slabs ?? []).map((s) => updateCourierRateSlab(supabase, s.id, patch)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  function resetForm() {
    setEditingId(null);
    setPricingMode("weight");
    setCity("");
    setMinWeight("0");
    setMaxWeight("1");
    setFee("");
    setAdditionalPerKg("");
  }

  function startEdit(s: NonNullable<typeof slabs>[number]) {
    setEditingId(s.id);
    setCity(s.city);
    setMinWeight(String(s.min_weight_kg));
    setMaxWeight(s.max_weight_kg != null ? String(s.max_weight_kg) : "");
    setFee(String(s.fee));
    setAdditionalPerKg(s.additional_per_kg != null ? String(s.additional_per_kg) : "");
    const isFlat = s.min_weight_kg === 0 && s.max_weight_kg == null && s.additional_per_kg == null;
    setPricingMode(isFlat ? "flat" : "weight");
  }

  const slabPayload = {
    city: city.trim(),
    min_weight_kg: Number(minWeight),
    max_weight_kg: maxWeight.trim() === "" ? null : Number(maxWeight),
    fee: fee.trim() === "" ? 0 : Number(fee),
    additional_per_kg: additionalPerKg.trim() === "" ? null : Number(additionalPerKg),
    tax_percent: Number(groupTaxPercent) || 0,
    fuel_charge_percent: Number(groupFuelChargePercent) || 0,
  };

  const addMutation = useMutation({
    mutationFn: () =>
      createCourierRateSlab(supabase, { courier_id: courierId, vendor_id: vendorId, ...slabPayload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateCourierRateSlab(supabase, editingId!, slabPayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      resetForm();
    },
  });

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCourierRateSlab(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setPendingDelete(null);
    },
  });

  const saving = addMutation.isPending || updateMutation.isPending;
  const canAdd =
    city.trim() &&
    (fee.trim() !== "" || additionalPerKg.trim() !== "") &&
    (maxWeight.trim() === "" || Number(maxWeight) > Number(minWeight)) &&
    !saving;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mb-3 text-[12px] text-muted">{hint}</p>

      <div className="mb-3 flex gap-1.5">
        <button
          type="button"
          onClick={() => switchMode("weight")}
          className="rounded-full px-3.5 py-1.5 text-[12px] font-bold"
          style={
            pricingMode === "weight"
              ? { background: "var(--color-primary)", color: "#fff", border: "1px solid var(--color-primary)" }
              : { background: "#fff", color: "var(--color-primary)", border: "1px solid var(--color-border)" }
          }
        >
          Weight-based (kg slabs)
        </button>
        <button
          type="button"
          onClick={() => switchMode("flat")}
          className="rounded-full px-3.5 py-1.5 text-[12px] font-bold"
          style={
            pricingMode === "flat"
              ? { background: "var(--color-primary)", color: "#fff", border: "1px solid var(--color-primary)" }
              : { background: "#fff", color: "var(--color-primary)", border: "1px solid var(--color-border)" }
          }
        >
          Flat rate (any weight)
        </button>
      </div>

      {pricingMode === "weight" ? (
        <p className="mb-3 text-[12px] text-muted">
          Leave <span className="font-semibold text-ink-dark">Max kg</span> blank to make an open-ended slab
          (&ldquo;this weight and above&rdquo;) — set wherever you want fixed slabs to stop, then fill{" "}
          <span className="font-semibold text-ink-dark">Additional Rs./kg</span> to charge extra for every kg beyond
          it.
        </p>
      ) : (
        <p className="mb-3 text-[12px] text-muted">
          One price for this city, whatever the parcel weighs — no kg slabs at all.
        </p>
      )}

      <div className={`mb-3 grid grid-cols-2 gap-2.5 ${pricingMode === "weight" ? "sm:grid-cols-6" : "sm:grid-cols-3"}`}>
        <SearchableSelect
          options={DELIVERY_CITY_OPTIONS}
          value={city}
          onChange={setCity}
          placeholder="City…"
          className="col-span-2 sm:col-span-1"
        />
        {pricingMode === "weight" ? (
          <>
            <input
              type="number"
              step="0.1"
              autoComplete="off"
              placeholder="Min kg"
              value={minWeight}
              onChange={(e) => setMinWeight(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
            />
            <input
              type="number"
              step="0.1"
              autoComplete="off"
              placeholder="Max kg (blank = and above)"
              value={maxWeight}
              onChange={(e) => setMaxWeight(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
            />
          </>
        ) : null}
        <input
          type="number"
          autoComplete="off"
          placeholder="Fee (Rs.)"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
        />
        {pricingMode === "weight" ? (
          <input
            type="number"
            autoComplete="off"
            placeholder="Additional Rs./kg"
            value={additionalPerKg}
            onChange={(e) => setAdditionalPerKg(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
          />
        ) : null}
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => (editingId ? updateMutation.mutate() : addMutation.mutate())}
          className="rounded-lg bg-accent px-3 py-2 text-[12.5px] font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : editingId ? "Save changes" : pricingMode === "flat" ? "+ Add flat rate" : "+ Add slab"}
        </button>
      </div>
      {pricingMode === "weight" && maxWeight.trim() !== "" && Number(maxWeight) <= Number(minWeight) ? (
        <p className="mb-3 text-[12px] font-semibold text-danger">
          Max kg ({maxWeight}) must be greater than Min kg ({minWeight}) — or clear the Max kg field to make this
          an open-ended slab. That&rsquo;s why Add/Save is disabled.
        </p>
      ) : null}
      {editingId ? (
        <button type="button" onClick={resetForm} className="mb-3 w-fit text-[12px] font-bold text-muted">
          Cancel editing
        </button>
      ) : null}

      <div className="mb-3 flex flex-wrap items-end gap-2.5 rounded-lg border border-dashed border-border p-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted">GST/tax % — for this list</span>
          <input
            type="number"
            autoComplete="off"
            value={groupTaxPercent}
            onChange={(e) => setGroupTaxPercent(e.target.value)}
            className="w-[110px] rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted">Fuel charge %</span>
          <input
            type="number"
            autoComplete="off"
            value={groupFuelChargePercent}
            onChange={(e) => setGroupFuelChargePercent(e.target.value)}
            className="w-[110px] rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
          />
        </label>
        <button
          type="button"
          disabled={!slabs?.length || applyRatesMutation.isPending}
          onClick={() => applyRatesMutation.mutate()}
          className="rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-bold text-primary disabled:opacity-60"
        >
          {applyRatesMutation.isPending ? "Applying…" : "Apply to all slabs below"}
        </button>
        <p className="w-full text-[11px] text-muted">
          New slabs you add here pick these up automatically. GST/tax is on product price, fuel charge is on
          delivery fee.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="grid min-w-[620px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_100px] bg-surface-alt px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-table">
          <span>City</span>
          <span>Weight (kg)</span>
          <span>Fee</span>
          <span>GST/tax</span>
          <span>Fuel charge</span>
          <span />
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted">Loading…</p>
        ) : !slabs || slabs.length === 0 ? (
          <p className="p-4 text-sm text-muted">No slabs yet.</p>
        ) : (
          slabs.map((s) => (
            <div
              key={s.id}
              className="grid min-w-[620px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_100px] items-center border-t border-[#F5F0EE] px-3.5 py-2.5 text-[12.5px]"
              style={s.id === editingId ? { background: "var(--color-primary-tint)" } : undefined}
            >
              <span className="font-bold text-ink-dark">{s.city}</span>
              <span className="text-muted">
                {s.min_weight_kg === 0 && s.max_weight_kg == null && s.additional_per_kg == null
                  ? "Any weight (flat)"
                  : `${s.min_weight_kg}–${s.max_weight_kg != null ? s.max_weight_kg : "∞"}`}
              </span>
              <span className="min-w-0 break-words text-ink-dark">
                Rs. {s.fee.toLocaleString()}
                {s.additional_per_kg != null ? (
                  <span className="block text-muted">+ Rs. {s.additional_per_kg}/kg</span>
                ) : null}
              </span>
              <span className="text-muted">{s.tax_percent}%</span>
              <span className="text-muted">{s.fuel_charge_percent}%</span>
              <div className="flex shrink-0 justify-end gap-2">
                <button type="button" onClick={() => startEdit(s)} className="text-[11px] font-bold text-primary">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(s.id)}
                  className="text-[11px] font-bold text-danger"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove this rate slab?"
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(pendingDelete!)}
        onCancel={() => setPendingDelete(null)}
      />

      {slabs && slabs.length > 0 ? <PriceCalculator slabs={slabs} /> : null}
    </div>
  );
}

/** Works out the exact charge for a given weight (and optionally the
 *  product's price, for GST) from this list's slabs — the same math that
 *  invoicing/bookkeeping will use. */
function PriceCalculator({ slabs }: { slabs: SlabRow[] }) {
  const cities = Array.from(new Set(slabs.map((s) => s.city))).sort();
  const [city, setCity] = useState(cities[0] ?? "");
  const [weight, setWeight] = useState("");
  const [productPrice, setProductPrice] = useState("");

  const citySlabs = slabsForCity(slabs, city || cities[0] || "");
  const weightKg = Number(weight);
  const matched = weight.trim() !== "" && weightKg > 0 ? findMatchingSlab(citySlabs, weightKg) : null;
  const result = matched ? calculateCourierCharge(matched, weightKg, Number(productPrice) || 0) : null;

  return (
    <div className="mt-5 rounded-xl border border-dashed border-border p-5">
      <p className="text-[15px] font-bold text-ink">Calculate price</p>
      <p className="mb-3 text-[12px] text-muted">
        Enter a weight to see the exact charge from the slabs above — the same figure invoicing will use.
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-[13px] text-ink-dark"
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.1"
          autoComplete="off"
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
        />
        <input
          type="number"
          autoComplete="off"
          placeholder="Product price (Rs., optional)"
          value={productPrice}
          onChange={(e) => setProductPrice(e.target.value)}
          className="col-span-2 sm:col-span-2 rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
        />
      </div>

      {weight.trim() !== "" && !matched ? (
        <p className="mt-3 text-[12.5px] text-danger">No slab covers {weight}kg for {city || "this city"}.</p>
      ) : null}

      {result ? (
        <div className="mt-3 flex flex-col gap-1 rounded-lg bg-surface-alt p-3.5 text-[13px]">
          <div className="flex justify-between">
            <span className="text-muted">Base fee ({result.slab.min_weight_kg}–{result.slab.max_weight_kg ?? "∞"}kg)</span>
            <span className="font-semibold text-ink-dark">Rs. {result.slab.fee.toLocaleString()}</span>
          </div>
          {result.extraBrackets > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted">
                {result.extraBrackets} extra kg (started) × Rs. {result.slab.additional_per_kg}/kg
              </span>
              <span className="font-semibold text-ink-dark">Rs. {result.extraCharge.toLocaleString()}</span>
            </div>
          ) : null}
          {result.gstAmount > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted">GST/tax ({result.slab.tax_percent}% of product price)</span>
              <span className="font-semibold text-ink-dark">Rs. {result.gstAmount.toLocaleString()}</span>
            </div>
          ) : null}
          {result.fuelAmount > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted">Fuel charge ({result.slab.fuel_charge_percent}% of delivery fee)</span>
              <span className="font-semibold text-ink-dark">Rs. {result.fuelAmount.toLocaleString()}</span>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between border-t border-border pt-1.5">
            <span className="font-bold text-ink">Total</span>
            <span className="font-bold text-accent">Rs. {result.total.toLocaleString()}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
