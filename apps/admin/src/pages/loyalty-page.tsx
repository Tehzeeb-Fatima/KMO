import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adjustLoyaltyPoints,
  deleteLoyaltyRule,
  getPlatformSettings,
  listCustomerLedger,
  listLoyaltyBalances,
  listLoyaltyRules,
  saveLoyaltyRule,
  logAdminAction,
  updatePlatformSettings,
  type LoyaltyRule,
} from "@kmo/shared/api";
import { ConfirmDialog, StatusBadge } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] text-ink-dark outline-none focus:border-primary-light";
const btnPrimary = "rounded-lg bg-primary px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-60";
const btnGhost = "rounded-lg border border-border px-4 py-2.5 text-[13px] font-bold text-ink-dark disabled:opacity-60";

/** Customer reward points (rules, settings, balances) and vendor tier benefits. */
export function LoyaltyPage() {
  return (
    <div className="flex max-w-[1000px] flex-col gap-5">
      <ProgrammeSettings />
      <EarnRules />
      <Balances />
      <VendorTierBenefits />
    </div>
  );
}

// ================================================================ settings

function ProgrammeSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: settings } = useQuery({ queryKey: ["platform-settings"], queryFn: () => getPlatformSettings(supabase) });
  const [enabled, setEnabled] = useState(false);
  const [pointValue, setPointValue] = useState("");
  const [minPoints, setMinPoints] = useState("");
  const [maxPercent, setMaxPercent] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.loyalty_enabled);
    setPointValue(String(settings.loyalty_point_value));
    setMinPoints(String(settings.loyalty_min_redeem_points));
    setMaxPercent(String(settings.loyalty_max_redeem_percent));
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      updatePlatformSettings(supabase, {
        loyalty_enabled: enabled,
        loyalty_point_value: Number(pointValue) || 0,
        loyalty_min_redeem_points: Math.max(0, Math.floor(Number(minPoints) || 0)),
        loyalty_max_redeem_percent: Math.min(100, Math.max(0, Number(maxPercent) || 0)),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (user) void logAdminAction(supabase, user.id, "settings.loyalty", "platform_settings", undefined, { enabled });
    },
  });

  const per100 = Number(pointValue) * 100;

  return (
    <Card
      title="Customer reward points"
      right={
        <StatusBadge variant={settings?.loyalty_enabled ? "success" : "warning"}>
          {settings?.loyalty_enabled ? "On" : "Off"}
        </StatusBadge>
      }
    >
      <label className="flex items-center gap-2 text-[13px] font-bold text-ink-dark">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Programme is on (customers earn and use points)
      </label>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label="Value of 1 point (Rs.)" hint={per100 ? `100 points = Rs. ${per100.toLocaleString()}` : undefined}>
          <input inputMode="decimal" value={pointValue} onChange={(e) => setPointValue(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Minimum points to use">
          <input inputMode="numeric" value={minPoints} onChange={(e) => setMinPoints(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Max discount per order (%)">
          <input inputMode="decimal" value={maxPercent} onChange={(e) => setMaxPercent(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <p className="mt-3 text-[12px] text-muted">
        Points are credited when an order is delivered and taken back if it is cancelled or returned. The points discount is
        paid by KMO — the vendor still gets their full price.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className={btnPrimary}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
        {saved ? <span className="text-[12.5px] font-bold text-success">Saved</span> : null}
      </div>
    </Card>
  );
}

// ================================================================ earning rules

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ruleState(r: LoyaltyRule): { label: string; variant: "success" | "warning" | "danger" | "info" } {
  const now = Date.now();
  if (!r.is_active) return { label: "Off", variant: "info" };
  if (new Date(r.starts_at).getTime() > now) return { label: "Upcoming", variant: "warning" };
  if (r.ends_at && new Date(r.ends_at).getTime() <= now) return { label: "Ended", variant: "danger" };
  return { label: "Live", variant: "success" };
}

type RuleForm = { id?: string; name: string; spend_pkr: string; points: string; starts_at: string; ends_at: string; is_active: boolean };
const emptyRule = (): RuleForm => ({ name: "", spend_pkr: "1000", points: "100", starts_at: toLocalInput(new Date().toISOString()), ends_at: "", is_active: true });

function EarnRules() {
  const queryClient = useQueryClient();
  const { data: rules } = useQuery({ queryKey: ["loyalty-rules"], queryFn: () => listLoyaltyRules(supabase) });
  const [form, setForm] = useState<RuleForm | null>(null);
  const [toDelete, setToDelete] = useState<LoyaltyRule | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (f: RuleForm) => {
      if (!f.name.trim()) throw new Error("Give the rule a name, e.g. Eid offer.");
      if (!(Number(f.spend_pkr) > 0) || !(Number(f.points) > 0)) throw new Error("Enter the amount and the points.");
      if (!f.starts_at) throw new Error("Choose when it starts.");
      if (f.ends_at && new Date(f.ends_at) <= new Date(f.starts_at)) throw new Error("The end must be after the start.");
      await saveLoyaltyRule(supabase, {
        id: f.id,
        name: f.name.trim(),
        spend_pkr: Number(f.spend_pkr),
        points: Math.floor(Number(f.points)),
        starts_at: new Date(f.starts_at).toISOString(),
        ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null,
        is_active: f.is_active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-rules"] });
      setForm(null);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });
  const remove = useMutation({
    mutationFn: () => deleteLoyaltyRule(supabase, toDelete!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-rules"] });
      setToDelete(null);
    },
  });

  return (
    <Card
      title="Earning rules"
      right={
        <button type="button" onClick={() => setForm(emptyRule())} className={btnPrimary}>
          + New rule
        </button>
      }
    >
      <p className="-mt-1 mb-3 text-[12.5px] text-muted">
        Set how many points customers get and for how long. An order earns points by the rule that is live when it is
        placed; if two rules overlap, the better one for the customer is used.
      </p>

      {form ? (
        <div className="mb-4 rounded-lg border border-border bg-surface-alt p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name">
              <input placeholder="e.g. Eid offer" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </Field>
            <Field label="For every (Rs.)">
              <input inputMode="decimal" value={form.spend_pkr} onChange={(e) => setForm({ ...form, spend_pkr: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Customer gets (points)">
              <input inputMode="numeric" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Starts">
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Ends (leave empty for no end)">
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2.5 text-[13px] text-ink-dark">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
          </div>
          {error ? <p className="mt-3 text-[12.5px] text-danger">{error}</p> : null}
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={save.isPending} onClick={() => save.mutate(form)} className={btnPrimary}>
              {save.isPending ? "Saving…" : "Save rule"}
            </button>
            <button type="button" onClick={() => setForm(null)} className={btnGhost}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {!rules?.length ? (
        <p className="text-[13px] text-muted">No rules yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-[#F1EAE6]">
          {rules.map((r) => {
            const st = ruleState(r);
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-[12.5px]">
                <div className="min-w-[220px] flex-1">
                  <p className="font-bold text-ink-dark">
                    {r.name} <span className="ml-1 font-normal text-muted">· Rs. {Number(r.spend_pkr).toLocaleString()} = {r.points} points</span>
                  </p>
                  <p className="text-muted">
                    {new Date(r.starts_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} →{" "}
                    {r.ends_at ? new Date(r.ends_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "no end"}
                  </p>
                </div>
                <StatusBadge variant={st.variant}>{st.label}</StatusBadge>
                <button
                  type="button"
                  className="font-bold text-primary"
                  onClick={() =>
                    setForm({
                      id: r.id,
                      name: r.name,
                      spend_pkr: String(r.spend_pkr),
                      points: String(r.points),
                      starts_at: toLocalInput(r.starts_at),
                      ends_at: toLocalInput(r.ends_at),
                      is_active: r.is_active,
                    })
                  }
                >
                  Edit
                </button>
                <button type="button" className="font-bold text-danger" onClick={() => setToDelete(r)}>
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete rule?"
        message="Orders already placed keep the points they were promised."
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setToDelete(null)}
      />
    </Card>
  );
}

// ================================================================ balances

function Balances() {
  const { data: settings } = useQuery({ queryKey: ["platform-settings"], queryFn: () => getPlatformSettings(supabase) });
  const { data: rows } = useQuery({ queryKey: ["loyalty-balances"], queryFn: () => listLoyaltyBalances(supabase) });
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const outstanding = (rows ?? []).reduce((s, r) => s + Math.max(0, r.balance), 0);
  const value = outstanding * Number(settings?.loyalty_point_value ?? 0);
  const filtered = (rows ?? []).filter((r) =>
    `${r.full_name ?? ""} ${r.phone ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Card title="Customer balances">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[13px]">
        <span className="text-ink-dark">
          Points with customers: <b>{outstanding.toLocaleString()}</b>
        </span>
        <span className="text-ink-dark">
          Worth: <b>Rs. {Math.round(value).toLocaleString()}</b>
        </span>
        <input
          placeholder="Search name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} ml-auto w-full max-w-[260px]`}
        />
      </div>
      <p className="mb-3 text-[12px] text-muted">
        To give or take points for a customer who isn't listed yet, open them from Customers and use the points box there.
      </p>
      {!filtered.length ? (
        <p className="text-[13px] text-muted">No customer has points yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-[#F1EAE6]">
          {filtered.map((r) => (
            <div key={r.customer_id} className="py-2.5">
              <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
                <span className="min-w-[180px] flex-1 font-bold text-ink-dark">
                  {r.full_name ?? "Customer"} <span className="font-normal text-muted">{r.phone ?? ""}</span>
                </span>
                <span className="font-extrabold text-ink-dark">{r.balance.toLocaleString()} pts</span>
                <button type="button" className="font-bold text-primary" onClick={() => setOpen(open === r.customer_id ? null : r.customer_id)}>
                  {open === r.customer_id ? "Close" : "History / adjust"}
                </button>
              </div>
              {open === r.customer_id ? <CustomerPoints customerId={r.customer_id} /> : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Ledger + manual adjustment for one customer (also used on the Customers page). */
export function CustomerPoints({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const { data: ledger } = useQuery({ queryKey: ["loyalty-ledger", customerId], queryFn: () => listCustomerLedger(supabase, customerId) });
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const balance = (ledger ?? []).reduce((s, r) => s + r.points, 0);

  const adjust = useMutation({
    mutationFn: () => adjustLoyaltyPoints(supabase, customerId, Math.trunc(Number(points)), note),
    onSuccess: () => {
      setPoints("");
      setNote("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["loyalty-ledger", customerId] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-balances"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="mt-2 rounded-lg bg-surface-alt p-3">
      <p className="text-[12.5px] text-ink-dark">
        Balance: <b>{balance.toLocaleString()} points</b>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          inputMode="numeric"
          placeholder="+100 or -50"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          className={`${inputClass} w-[130px]`}
        />
        <input placeholder="Reason (required)" value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} min-w-[200px] flex-1`} />
        <button
          type="button"
          disabled={!Number(points) || !note.trim() || adjust.isPending}
          onClick={() => adjust.mutate()}
          className={btnPrimary}
        >
          Adjust
        </button>
      </div>
      {error ? <p className="mt-2 text-[12px] text-danger">{error}</p> : null}
      {ledger?.length ? (
        <div className="mt-3 flex max-h-[240px] flex-col gap-1 overflow-y-auto text-[12px]">
          {ledger.map((l) => (
            <div key={l.id} className="flex justify-between gap-3">
              <span className="text-muted">
                {new Date(l.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                {l.kind.replace("_", " ")}
                {l.note ? ` · ${l.note}` : ""}
              </span>
              <span className={`shrink-0 font-bold ${l.points > 0 ? "text-success" : "text-danger"}`}>
                {l.points > 0 ? "+" : ""}
                {l.points}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ================================================================ vendor tiers

function VendorTierBenefits() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["platform-settings"], queryFn: () => getPlatformSettings(supabase) });
  const [benefits, setBenefits] = useState({ bronze: "", silver: "", gold: "" });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (settings?.vendor_tier_benefits) setBenefits(settings.vendor_tier_benefits);
  }, [settings]);

  const save = useMutation({
    mutationFn: () => updatePlatformSettings(supabase, { vendor_tier_benefits: benefits }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <Card title="Vendor tiers">
      <p className="-mt-1 mb-3 text-[12.5px] text-muted">
        Non-cash benefits for each tier. Set a vendor's tier on their page under Vendors. Vendors see their tier and these
        benefits in their dashboard; customers don't see tiers.
      </p>
      <div className="flex flex-col gap-3">
        {(["gold", "silver", "bronze"] as const).map((k) => (
          <Field key={k} label={`${k === "gold" ? "🥇 Gold" : k === "silver" ? "🥈 Silver" : "🥉 Bronze"} benefits`}>
            <textarea
              rows={2}
              value={benefits[k]}
              onChange={(e) => setBenefits({ ...benefits, [k]: e.target.value })}
              className={`${inputClass} resize-y font-sans`}
            />
          </Field>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className={btnPrimary}>
          {save.isPending ? "Saving…" : "Save benefits"}
        </button>
        {saved ? <span className="text-[12.5px] font-bold text-success">Saved</span> : null}
      </div>
    </Card>
  );
}

// ================================================================ bits

function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[15px] font-bold text-ink">{title}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold text-ink-dark">{label}</span>
      {children}
      {hint ? <span className="text-[11.5px] text-muted">{hint}</span> : null}
    </label>
  );
}
