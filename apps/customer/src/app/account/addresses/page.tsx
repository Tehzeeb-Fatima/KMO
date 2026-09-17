"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAddress, deleteAddress, listAddresses } from "@kmo/shared/api";
import { Button } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { RequireAuth } from "@/components/require-auth";
import { supabase } from "@/lib/supabase";

export default function AddressesPage() {
  return (
    <RequireAuth allowedRoles={["customer"]}>
      <AddressesContent />
    </RequireAuth>
  );
}

function AddressesContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => listAddresses(supabase),
  });

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("Home");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [area, setArea] = useState("");

  const addMutation = useMutation({
    mutationFn: () =>
      createAddress(supabase, {
        customer_id: user!.id,
        label,
        full_name: fullName,
        phone,
        address_line: addressLine,
        area,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setAdding(false);
      setFullName("");
      setPhone("");
      setAddressLine("");
      setArea("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAddress(supabase, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });

  return (
    <div className="mx-auto w-full max-w-[700px] px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-2xl">
          Your addresses
        </h1>
        {!adding ? (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            + Add address
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {addresses?.map((addr) => (
            <div
              key={addr.id}
              className="flex items-start justify-between rounded-xl border border-border bg-surface p-4"
            >
              <div>
                <p className="text-sm font-bold text-ink-dark">
                  {addr.label} · {addr.full_name} · {addr.phone}
                </p>
                <p className="text-sm text-muted">
                  {addr.address_line}
                  {addr.area ? `, ${addr.area}` : ""}, {addr.city}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(addr.id)}
                className="text-xs font-bold text-danger"
              >
                Remove
              </button>
            </div>
          ))}
          {addresses?.length === 0 && !adding ? (
            <p className="text-sm text-muted">No saved addresses yet.</p>
          ) : null}
        </div>
      )}

      {adding ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              placeholder="Label, e.g. Home"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
            <input
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
          </div>
          <input
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
          <input
            placeholder="Street address, house / flat number"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
          <input
            placeholder="Area / town"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
          <div className="flex gap-2">
            <Button
              disabled={addMutation.isPending || !fullName || !phone || !addressLine}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? "Saving…" : "Save address"}
            </Button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-sm font-bold text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
