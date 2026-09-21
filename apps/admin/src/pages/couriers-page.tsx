import { useState } from "react";
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
} from "@kmo/shared/api";
import { ConfirmDialog } from "@kmo/shared/ui";
import { supabase } from "../lib/supabase";

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

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
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
          <CourierRatesPanel courierId={selected.id} courierName={selected.name} />
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

function CourierRatesPanel({ courierId, courierName }: { courierId: string; courierName: string }) {
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

  const [city, setCity] = useState("");
  const [minWeight, setMinWeight] = useState("0");
  const [maxWeight, setMaxWeight] = useState("1");
  const [fee, setFee] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");

  const addMutation = useMutation({
    mutationFn: () =>
      createCourierRateSlab(supabase, {
        courier_id: courierId,
        vendor_id: vendorId,
        city: city.trim(),
        min_weight_kg: Number(minWeight),
        max_weight_kg: Number(maxWeight),
        fee: Number(fee),
        tax_percent: Number(taxPercent) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setCity("");
      setMinWeight("0");
      setMaxWeight("1");
      setFee("");
      setTaxPercent("0");
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

  const canAdd =
    city.trim() &&
    fee.trim() &&
    Number(maxWeight) > Number(minWeight) &&
    !addMutation.isPending;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mb-3 text-[12px] text-muted">{hint}</p>

      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-6">
        <input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="col-span-2 rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light sm:col-span-1"
        />
        <input
          type="number"
          step="0.1"
          placeholder="Min kg"
          value={minWeight}
          onChange={(e) => setMinWeight(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
        />
        <input
          type="number"
          step="0.1"
          placeholder="Max kg"
          value={maxWeight}
          onChange={(e) => setMaxWeight(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
        />
        <input
          type="number"
          placeholder="Fee (Rs.)"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
        />
        <input
          type="number"
          placeholder="GST/tax %"
          value={taxPercent}
          onChange={(e) => setTaxPercent(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
        />
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => addMutation.mutate()}
          className="rounded-lg bg-accent px-3 py-2 text-[12.5px] font-bold text-white disabled:opacity-60"
        >
          + Add slab
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_60px] bg-surface-alt px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-table">
          <span>City</span>
          <span>Weight (kg)</span>
          <span>Fee</span>
          <span>GST/tax</span>
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
              className="grid grid-cols-[1fr_1fr_1fr_1fr_60px] items-center border-t border-[#F5F0EE] px-3.5 py-2.5 text-[12.5px]"
            >
              <span className="font-bold text-ink-dark">{s.city}</span>
              <span className="text-muted">
                {s.min_weight_kg}–{s.max_weight_kg}
              </span>
              <span className="text-ink-dark">Rs. {s.fee.toLocaleString()}</span>
              <span className="text-muted">{s.tax_percent}%</span>
              <button
                type="button"
                onClick={() => setPendingDelete(s.id)}
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
        title="Remove this rate slab?"
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(pendingDelete!)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
