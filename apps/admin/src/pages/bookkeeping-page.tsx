import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@kmo/shared/ui";
import {
  LockedError,
  PAID_BY_LABEL,
  PAYMENT_METHODS,
  clearSession,
  deleteCapital,
  deleteCategory,
  deleteExpense,
  deleteRecurring,
  generateRecurring,
  getStatus,
  isSuperAdmin,
  listActivity,
  listCapital,
  listCategories,
  listExpenses,
  listRecurring,
  lock,
  monthKey,
  monthLabel,
  pkr,
  readSession,
  receiptUrl,
  removeReceipt,
  saveCapital,
  saveCategory,
  saveExpense,
  saveRecurring,
  saveSession,
  sendCodes,
  todayIso,
  uploadReceipt,
  usd,
  verifyCode,
  type BkCapital,
  type BkCategory,
  type BkExpense,
  type BkRecurring,
  type BkSession,
  type PaidBy,
  type PartnerKey,
} from "../lib/bookkeeping";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] text-ink-dark outline-none focus:border-primary-light";
const btnPrimary = "rounded-lg bg-primary px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-60";
const btnGhost = "rounded-lg border border-border px-4 py-2.5 text-[13px] font-bold text-ink-dark disabled:opacity-60";

type Tab = "summary" | "expenses" | "monthly" | "partners" | "activity";
const TABS: { key: Tab; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "expenses", label: "Expenses" },
  { key: "monthly", label: "Monthly expenses" },
  { key: "partners", label: "Partners" },
  { key: "activity", label: "Activity" },
];

/** Super-admin-only books. Locked until a code emailed to Tehzeeb or Talha is entered. */
export function BookkeepingPage() {
  const { data: allowed, isLoading } = useQuery({ queryKey: ["is-super-admin"], queryFn: isSuperAdmin });
  const [session, setSession] = useState<BkSession | null>(() => readSession());

  // The server is the source of truth: drop a stored session it no longer accepts.
  useEffect(() => {
    if (!session) return;
    getStatus(session.token)
      .then((s) => {
        if (!s.unlocked) {
          clearSession();
          setSession(null);
        }
      })
      .catch(() => undefined);
  }, [session]);

  if (isLoading) return <p className="text-sm text-muted">Checking access…</p>;
  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        You do not have access to this section.
      </div>
    );
  }

  if (!session) {
    return (
      <LockScreen
        onUnlocked={(s) => {
          saveSession(s);
          setSession(s);
        }}
      />
    );
  }

  return (
    <Workspace
      session={session}
      onLocked={() => {
        clearSession();
        setSession(null);
      }}
    />
  );
}

// ================================================================ lock screen

function LockScreen({ onUnlocked }: { onUnlocked: (s: BkSession) => void }) {
  const [request, setRequest] = useState<{ sentTo: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = useMutation({
    mutationFn: sendCodes,
    onSuccess: (r) => {
      setRequest({ sentTo: r.sentTo });
      setCode("");
      setError(null);
      setCooldown(60);
    },
    onError: (e: Error) => setError(e.message),
  });

  const verify = useMutation({
    mutationFn: () => verifyCode(code),
    onSuccess: (r) => onUnlocked({ token: r.token, personName: r.personName, expiresAt: r.expiresAt }),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="mx-auto mt-6 flex max-w-[420px] flex-col gap-4 rounded-xl border border-border bg-surface p-7">
      <div>
        <p className="font-mono text-[11px] tracking-[0.14em] text-accent">SUPER ADMIN ONLY</p>
        <h2 className="mt-1 text-xl font-extrabold text-ink">Bookkeeping is locked</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          We email a separate code to Tehzeeb and to Talha. Enter your own code to open the books on this device for
          12 hours.
        </p>
      </div>

      {request ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) verify.mutate();
          }}
        >
          <p className="rounded-lg bg-primary-tint px-3 py-2 text-[12.5px] text-primary">
            {request.sentTo.length
              ? `Codes sent to ${request.sentTo.join(" and ")}. Any code from the last 10 minutes works.`
              : "Enter a code from an email sent in the last 10 minutes."}
          </p>
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`${inputClass} text-center font-mono text-xl tracking-[0.5em]`}
          />
          <button type="submit" disabled={code.length !== 6 || verify.isPending} className={btnPrimary}>
            {verify.isPending ? "Checking…" : "Unlock"}
          </button>
          <button
            type="button"
            disabled={cooldown > 0 || send.isPending}
            onClick={() => send.mutate()}
            className="text-[12.5px] font-bold text-accent disabled:text-muted"
          >
            {cooldown > 0 ? `Send new codes in ${cooldown}s` : "Send new codes"}
          </button>
        </form>
      ) : (
        <>
          <button type="button" disabled={send.isPending} onClick={() => send.mutate()} className={btnPrimary}>
            {send.isPending ? "Sending…" : "Email me the codes"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRequest({ sentTo: [] });
              setError(null);
            }}
            className="text-[12.5px] font-bold text-accent"
          >
            I already have a code
          </button>
        </>
      )}

      {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}
    </div>
  );
}

// ================================================================ workspace

function Workspace({ session, onLocked }: { session: BkSession; onLocked: () => void }) {
  const token = session.token;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("summary");

  // Any call that comes back "locked" sends the user to the lock screen.
  function guard<T>(fn: () => Promise<T>) {
    return async () => {
      try {
        return await fn();
      } catch (e) {
        if (e instanceof LockedError) onLocked();
        throw e;
      }
    };
  }

  const { data: generated } = useQuery({
    queryKey: ["bk", "generate", token],
    queryFn: guard(() => generateRecurring(token)),
    staleTime: Infinity,
  });
  const ready = generated !== undefined;
  const categories = useQuery({ queryKey: ["bk", "categories"], queryFn: guard(() => listCategories(token)) });
  const expenses = useQuery({ queryKey: ["bk", "expenses"], queryFn: guard(() => listExpenses(token)), enabled: ready });
  const recurring = useQuery({ queryKey: ["bk", "recurring"], queryFn: guard(() => listRecurring(token)) });
  const capital = useQuery({ queryKey: ["bk", "capital"], queryFn: guard(() => listCapital(token)) });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["bk"] });
  const lockNow = useMutation({
    mutationFn: () => lock(token),
    onSettled: () => {
      queryClient.removeQueries({ queryKey: ["bk"] });
      onLocked();
    },
  });

  const catName = useMemo(() => {
    const m = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? (m.get(id) ?? "—") : "Uncategorised");
  }, [categories.data]);

  const ctx: Ctx = {
    token,
    guard,
    refresh,
    categories: categories.data ?? [],
    catName,
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-5 py-3.5">
        <p className="text-[13px] text-ink-dark">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-success align-middle" />
          Unlocked by <span className="font-bold">{session.personName}</span> until{" "}
          {new Date(session.expiresAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </p>
        <button type="button" onClick={() => lockNow.mutate()} disabled={lockNow.isPending} className={btnGhost}>
          Lock now
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-lg px-4 py-2 text-[13px] font-bold ${
              tab === t.key ? "bg-primary text-white" : "text-ink-dark hover:bg-surface-alt"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {expenses.isLoading || capital.isLoading || !ready ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : tab === "summary" ? (
        <SummaryTab ctx={ctx} expenses={expenses.data ?? []} capital={capital.data ?? []} />
      ) : tab === "expenses" ? (
        <ExpensesTab ctx={ctx} expenses={expenses.data ?? []} />
      ) : tab === "monthly" ? (
        <MonthlyTab ctx={ctx} rows={recurring.data ?? []} />
      ) : tab === "partners" ? (
        <PartnersTab ctx={ctx} capital={capital.data ?? []} expenses={expenses.data ?? []} />
      ) : (
        <ActivityTab ctx={ctx} />
      )}
    </div>
  );
}

interface Ctx {
  token: string;
  guard: <T>(fn: () => Promise<T>) => () => Promise<T>;
  refresh: () => void;
  categories: BkCategory[];
  catName: (id: string | null) => string;
}

// ================================================================ summary

function partnerTotals(capital: BkCapital[], expenses: BkExpense[]) {
  const out: Record<PartnerKey, { invested: number; paid: number; withdrawn: number; net: number }> = {
    tehzeeb: { invested: 0, paid: 0, withdrawn: 0, net: 0 },
    talha: { invested: 0, paid: 0, withdrawn: 0, net: 0 },
  };
  for (const c of capital) {
    if (c.kind === "investment") out[c.partner].invested += Number(c.amount_pkr);
    else out[c.partner].withdrawn += Number(c.amount_pkr);
  }
  for (const e of expenses) {
    if (e.paid_by !== "kmo") out[e.paid_by].paid += Number(e.amount_pkr);
  }
  for (const k of ["tehzeeb", "talha"] as PartnerKey[]) out[k].net = out[k].invested + out[k].paid - out[k].withdrawn;
  return out;
}

function SummaryTab({ ctx, expenses, capital }: { ctx: Ctx; expenses: BkExpense[]; capital: BkCapital[] }) {
  const thisMonth = monthKey(todayIso());
  const total = expenses.reduce((s, e) => s + Number(e.amount_pkr), 0);
  const totalUsd = expenses.reduce((s, e) => s + Number(e.amount_usd ?? 0), 0);
  const monthTotal = expenses.filter((e) => monthKey(e.expense_date) === thisMonth).reduce((s, e) => s + Number(e.amount_pkr), 0);
  const kmoPaid = expenses.filter((e) => e.paid_by === "kmo").reduce((s, e) => s + Number(e.amount_pkr), 0);
  const partners = partnerTotals(capital, expenses);

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    const k = ctx.catName(e.category_id);
    byCategory.set(k, (byCategory.get(k) ?? 0) + Number(e.amount_pkr));
  }
  const catRows = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  const byMonth = new Map<string, number>();
  for (const e of expenses) byMonth.set(monthKey(e.expense_date), (byMonth.get(monthKey(e.expense_date)) ?? 0) + Number(e.amount_pkr));
  const monthRows = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  const maxMonth = Math.max(1, ...monthRows.map((r) => r[1]));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Total spent" value={pkr(total)} sub={totalUsd ? `incl. ${usd(totalUsd)} in USD bills` : undefined} />
        <Tile label="This month" value={pkr(monthTotal)} sub={monthLabel(thisMonth)} />
        <Tile label="Tehzeeb put in" value={pkr(partners.tehzeeb.net)} accent />
        <Tile label="Talha put in" value={pkr(partners.talha.net)} accent />
      </div>
      <p className="-mt-2 text-[12px] text-muted">
        "Put in" = money invested + expenses paid from own pocket − withdrawals. Expenses paid by KMO: {pkr(kmoPaid)}.
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Spending by category">
          {catRows.length === 0 ? (
            <Empty>No expenses yet.</Empty>
          ) : (
            <div className="flex flex-col gap-2.5">
              {catRows.map(([name, amount]) => (
                <BarRow key={name} label={name} value={pkr(amount)} pct={(amount / (catRows[0][1] || 1)) * 100} />
              ))}
            </div>
          )}
        </Card>
        <Card title="Spending by month">
          {monthRows.length === 0 ? (
            <Empty>No expenses yet.</Empty>
          ) : (
            <div className="flex flex-col gap-2.5">
              {monthRows.map(([key, amount]) => (
                <BarRow key={key} label={monthLabel(key)} value={pkr(amount)} pct={(amount / maxMonth) * 100} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function BarRow({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="text-[12.5px]">
      <div className="flex justify-between gap-3">
        <span className="truncate text-ink-dark">{label}</span>
        <span className="shrink-0 font-bold text-ink-dark">{value}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-surface-alt">
        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

// ================================================================ expenses

const emptyExpense = () => ({
  id: "",
  expense_date: todayIso(),
  category_id: "",
  description: "",
  amount_pkr: "",
  amount_usd: "",
  paid_by: "kmo" as PaidBy,
  payment_method: "",
  notes: "",
  receipt_path: "",
});
type ExpenseForm = ReturnType<typeof emptyExpense>;

function ExpensesTab({ ctx, expenses }: { ctx: Ctx; expenses: BkExpense[] }) {
  const [month, setMonth] = useState("all");
  const [category, setCategory] = useState("all");
  const [form, setForm] = useState<ExpenseForm | null>(null);
  const [toDelete, setToDelete] = useState<BkExpense | null>(null);
  const [showCategories, setShowCategories] = useState(false);

  const months = [...new Set(expenses.map((e) => monthKey(e.expense_date)))].sort().reverse();
  const rows = expenses.filter(
    (e) => (month === "all" || monthKey(e.expense_date) === month) && (category === "all" || e.category_id === category),
  );
  const total = rows.reduce((s, e) => s + Number(e.amount_pkr), 0);

  const remove = useMutation({
    mutationFn: ctx.guard(async () => {
      const receipt = await deleteExpense(ctx.token, toDelete!.id);
      if (receipt) await removeReceipt(receipt);
    }),
    onSuccess: () => {
      setToDelete(null);
      ctx.refresh();
    },
  });

  function exportCsv() {
    const head = ["Date", "Category", "Description", "Amount PKR", "Amount USD", "Paid by", "Method", "Notes", "Added by"];
    const lines = rows.map((e) =>
      [
        e.expense_date,
        ctx.catName(e.category_id),
        e.description,
        e.amount_pkr,
        e.amount_usd ?? "",
        PAID_BY_LABEL[e.paid_by],
        e.payment_method ?? "",
        e.notes ?? "",
        e.created_by ? PAID_BY_LABEL[e.created_by] : "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kmo-expenses-${month === "all" ? "all" : month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="all">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="all">All categories</option>
          {ctx.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowCategories((v) => !v)} className={btnGhost}>
            Categories
          </button>
          <button type="button" onClick={exportCsv} disabled={rows.length === 0} className={btnGhost}>
            Download CSV
          </button>
          <button type="button" onClick={() => setForm(emptyExpense())} className={btnPrimary}>
            + Add expense
          </button>
        </div>
      </div>

      {showCategories ? <CategoryManager ctx={ctx} /> : null}
      {form ? <ExpenseEditor ctx={ctx} initial={form} onClose={() => setForm(null)} /> : null}

      <Card title={`${rows.length} expense${rows.length === 1 ? "" : "s"} · ${pkr(total)}`}>
        {rows.length === 0 ? (
          <Empty>No expenses here yet.</Empty>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[12.5px]">
              <thead className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-table">
                <tr>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                  <th className="px-2 py-2">Paid by</th>
                  <th className="px-2 py-2">Added by</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-[#F1EAE6] align-top">
                    <td className="whitespace-nowrap px-2 py-2.5 text-muted">{e.expense_date}</td>
                    <td className="px-2 py-2.5 text-ink-dark">
                      <span className="font-semibold">{e.description}</span>
                      {e.recurring_id ? <span className="ml-1.5 text-[11px] text-accent">monthly</span> : null}
                      {e.notes ? <p className="text-[11.5px] text-muted">{e.notes}</p> : null}
                      {e.receipt_path ? <ReceiptLink path={e.receipt_path} /> : null}
                    </td>
                    <td className="px-2 py-2.5 text-muted">{ctx.catName(e.category_id)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right font-bold text-ink-dark">
                      {pkr(Number(e.amount_pkr))}
                      {e.amount_usd ? <p className="text-[11px] font-normal text-muted">{usd(Number(e.amount_usd))}</p> : null}
                    </td>
                    <td className="px-2 py-2.5 text-ink-dark">
                      {PAID_BY_LABEL[e.paid_by]}
                      {e.payment_method ? <p className="text-[11px] text-muted">{e.payment_method}</p> : null}
                    </td>
                    <td className="px-2 py-2.5 text-muted">{e.created_by ? PAID_BY_LABEL[e.created_by] : "—"}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right">
                      <button
                        type="button"
                        className="mr-3 font-bold text-primary"
                        onClick={() =>
                          setForm({
                            id: e.id,
                            expense_date: e.expense_date,
                            category_id: e.category_id ?? "",
                            description: e.description,
                            amount_pkr: String(e.amount_pkr),
                            amount_usd: e.amount_usd != null ? String(e.amount_usd) : "",
                            paid_by: e.paid_by,
                            payment_method: e.payment_method ?? "",
                            notes: e.notes ?? "",
                            receipt_path: e.receipt_path ?? "",
                          })
                        }
                      >
                        Edit
                      </button>
                      <button type="button" className="font-bold text-danger" onClick={() => setToDelete(e)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete expense?"
        message={toDelete ? `"${toDelete.description}" (${pkr(Number(toDelete.amount_pkr))}) will be removed. This is recorded in Activity.` : ""}
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function ReceiptLink({ path }: { path: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          window.open(await receiptUrl(path), "_blank", "noopener");
        } finally {
          setBusy(false);
        }
      }}
      className="mt-0.5 block text-[11.5px] font-bold text-accent"
    >
      {busy ? "Opening…" : "View receipt"}
    </button>
  );
}

function ExpenseEditor({ ctx, initial, onClose }: { ctx: Ctx; initial: ExpenseForm; onClose: () => void }) {
  const [f, setF] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<ExpenseForm>) => setF((p) => ({ ...p, ...patch }));

  const save = useMutation({
    mutationFn: ctx.guard(async () => {
      if (!f.description.trim()) throw new Error("Enter what the expense was for.");
      if (!(Number(f.amount_pkr) >= 0) || f.amount_pkr === "") throw new Error("Enter the amount in PKR.");
      let receipt = f.receipt_path;
      if (file) {
        const uploaded = await uploadReceipt(file);
        if (receipt) await removeReceipt(receipt);
        receipt = uploaded;
      }
      return saveExpense(ctx.token, { ...f, receipt_path: receipt });
    }),
    onSuccess: () => {
      ctx.refresh();
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Card title={f.id ? "Edit expense" : "Add expense"}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Date">
          <input type="date" value={f.expense_date} onChange={(e) => set({ expense_date: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Category">
          <select value={f.category_id} onChange={(e) => set({ category_id: e.target.value })} className={inputClass}>
            <option value="">Uncategorised</option>
            {ctx.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="What was it for?">
          <input
            placeholder="e.g. Instagram ads, Claude subscription"
            value={f.description}
            onChange={(e) => set({ description: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Amount (PKR)">
          <input inputMode="decimal" placeholder="e.g. 5600" value={f.amount_pkr} onChange={(e) => set({ amount_pkr: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Amount (USD, if billed in dollars)">
          <input inputMode="decimal" placeholder="e.g. 20" value={f.amount_usd} onChange={(e) => set({ amount_usd: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Paid by">
          <PaidBySelect value={f.paid_by} onChange={(v) => set({ paid_by: v })} />
        </Field>
        <Field label="Payment method">
          <MethodSelect value={f.payment_method} onChange={(v) => set({ payment_method: v })} />
        </Field>
        <Field label="Notes (optional)">
          <input value={f.notes} onChange={(e) => set({ notes: e.target.value })} className={inputClass} />
        </Field>
        <Field label={f.receipt_path ? "Replace receipt (optional)" : "Receipt (optional)"}>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-[12.5px] text-ink-dark"
          />
        </Field>
      </div>
      {error ? <p className="mt-3 text-[12.5px] text-danger">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className={btnPrimary}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} className={btnGhost}>
          Cancel
        </button>
      </div>
    </Card>
  );
}

function CategoryManager({ ctx }: { ctx: Ctx }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = useMutation({
    mutationFn: ctx.guard(() => saveCategory(ctx.token, null, name)),
    onSuccess: () => {
      setName("");
      setError(null);
      ctx.refresh();
    },
    onError: (e: Error) => setError(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => ctx.guard(() => deleteCategory(ctx.token, id))(),
    onSuccess: () => {
      setError(null);
      ctx.refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Card title="Expense categories">
      <div className="flex flex-wrap gap-2">
        {ctx.categories.map((c) => (
          <span key={c.id} className="flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1 text-[12.5px] text-ink-dark">
            {c.name}
            <button type="button" aria-label={`Delete ${c.name}`} onClick={() => remove.mutate(c.id)} className="text-muted hover:text-danger">
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex max-w-[420px] gap-2">
        <input placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        <button type="button" disabled={!name.trim() || add.isPending} onClick={() => add.mutate()} className={btnPrimary}>
          Add
        </button>
      </div>
      {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
    </Card>
  );
}

// ================================================================ monthly

const emptyRecurring = () => ({
  id: "",
  description: "",
  category_id: "",
  amount_pkr: "",
  amount_usd: "",
  paid_by: "kmo" as PaidBy,
  payment_method: "",
  day_of_month: "1",
  start_month: todayIso().slice(0, 7),
  end_month: "",
  active: true,
  notes: "",
});
type RecurringForm = ReturnType<typeof emptyRecurring>;

function MonthlyTab({ ctx, rows }: { ctx: Ctx; rows: BkRecurring[] }) {
  const [form, setForm] = useState<RecurringForm | null>(null);
  const [toDelete, setToDelete] = useState<BkRecurring | null>(null);
  const remove = useMutation({
    mutationFn: ctx.guard(() => deleteRecurring(ctx.token, toDelete!.id)),
    onSuccess: () => {
      setToDelete(null);
      ctx.refresh();
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[560px] text-[12.5px] text-muted">
          Bills that repeat every month, like the Claude subscription. An expense is added automatically on the chosen day
          each month (including any months missed since the start month).
        </p>
        <button type="button" onClick={() => setForm(emptyRecurring())} className={btnPrimary}>
          + Add monthly expense
        </button>
      </div>

      {form ? <RecurringEditor ctx={ctx} initial={form} onClose={() => setForm(null)} /> : null}

      <Card title="Monthly expenses">
        {rows.length === 0 ? (
          <Empty>None yet.</Empty>
        ) : (
          <div className="flex flex-col divide-y divide-[#F1EAE6]">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-[12.5px]">
                <div className="min-w-[200px] flex-1">
                  <p className="font-bold text-ink-dark">
                    {r.description}
                    {!r.active ? <span className="ml-2 text-[11px] font-normal text-muted">paused</span> : null}
                  </p>
                  <p className="text-muted">
                    {ctx.catName(r.category_id)} · day {r.day_of_month} · from {monthLabel(r.start_month.slice(0, 7))}
                    {r.end_month ? ` to ${monthLabel(r.end_month.slice(0, 7))}` : ""} · paid by {PAID_BY_LABEL[r.paid_by]}
                  </p>
                </div>
                <p className="font-bold text-ink-dark">
                  {pkr(Number(r.amount_pkr))}
                  {r.amount_usd ? <span className="ml-1 font-normal text-muted">({usd(Number(r.amount_usd))})</span> : null}
                </p>
                <button
                  type="button"
                  className="font-bold text-primary"
                  onClick={() =>
                    setForm({
                      id: r.id,
                      description: r.description,
                      category_id: r.category_id ?? "",
                      amount_pkr: String(r.amount_pkr),
                      amount_usd: r.amount_usd != null ? String(r.amount_usd) : "",
                      paid_by: r.paid_by,
                      payment_method: r.payment_method ?? "",
                      day_of_month: String(r.day_of_month),
                      start_month: r.start_month.slice(0, 7),
                      end_month: r.end_month ? r.end_month.slice(0, 7) : "",
                      active: r.active,
                      notes: r.notes ?? "",
                    })
                  }
                >
                  Edit
                </button>
                <button type="button" className="font-bold text-danger" onClick={() => setToDelete(r)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete monthly expense?"
        message="No new monthly entries will be created. Expenses it already added stay in the books."
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function RecurringEditor({ ctx, initial, onClose }: { ctx: Ctx; initial: RecurringForm; onClose: () => void }) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<RecurringForm>) => setF((p) => ({ ...p, ...patch }));
  const save = useMutation({
    mutationFn: ctx.guard(async () => {
      if (!f.description.trim()) throw new Error("Enter what the monthly expense is for.");
      if (f.amount_pkr === "" || !(Number(f.amount_pkr) >= 0)) throw new Error("Enter the amount in PKR.");
      await saveRecurring(ctx.token, {
        ...f,
        start_month: `${f.start_month}-01`,
        end_month: f.end_month ? `${f.end_month}-01` : "",
      });
      await generateRecurring(ctx.token);
    }),
    onSuccess: () => {
      ctx.refresh();
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Card title={f.id ? "Edit monthly expense" : "Add monthly expense"}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="What is it for?">
          <input placeholder="e.g. Claude subscription" value={f.description} onChange={(e) => set({ description: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Category">
          <select value={f.category_id} onChange={(e) => set({ category_id: e.target.value })} className={inputClass}>
            <option value="">Uncategorised</option>
            {ctx.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Day of the month (1–28)">
          <input inputMode="numeric" value={f.day_of_month} onChange={(e) => set({ day_of_month: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Amount (PKR)">
          <input inputMode="decimal" value={f.amount_pkr} onChange={(e) => set({ amount_pkr: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Amount (USD, optional)">
          <input inputMode="decimal" value={f.amount_usd} onChange={(e) => set({ amount_usd: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Paid by">
          <PaidBySelect value={f.paid_by} onChange={(v) => set({ paid_by: v })} />
        </Field>
        <Field label="Payment method">
          <MethodSelect value={f.payment_method} onChange={(v) => set({ payment_method: v })} />
        </Field>
        <Field label="Start month">
          <input type="month" value={f.start_month} onChange={(e) => set({ start_month: e.target.value })} className={inputClass} />
        </Field>
        <Field label="End month (optional)">
          <input type="month" value={f.end_month} onChange={(e) => set({ end_month: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Notes (optional)">
          <input value={f.notes} onChange={(e) => set({ notes: e.target.value })} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2.5 text-[13px] text-ink-dark">
          <input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} />
          Active
        </label>
      </div>
      {error ? <p className="mt-3 text-[12.5px] text-danger">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className={btnPrimary}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} className={btnGhost}>
          Cancel
        </button>
      </div>
    </Card>
  );
}

// ================================================================ partners

const emptyCapital = () => ({
  id: "",
  entry_date: todayIso(),
  partner: "tehzeeb" as PartnerKey,
  kind: "investment" as "investment" | "withdrawal",
  amount_pkr: "",
  notes: "",
});
type CapitalForm = ReturnType<typeof emptyCapital>;

function PartnersTab({ ctx, capital, expenses }: { ctx: Ctx; capital: BkCapital[]; expenses: BkExpense[] }) {
  const [form, setForm] = useState<CapitalForm | null>(null);
  const [toDelete, setToDelete] = useState<BkCapital | null>(null);
  const totals = partnerTotals(capital, expenses);
  const remove = useMutation({
    mutationFn: ctx.guard(() => deleteCapital(ctx.token, toDelete!.id)),
    onSuccess: () => {
      setToDelete(null);
      ctx.refresh();
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {(["tehzeeb", "talha"] as PartnerKey[]).map((k) => (
          <div key={k} className="rounded-xl border border-border bg-surface p-5">
            <p className="font-mono text-xs uppercase tracking-[0.06em] text-muted-table">{PAID_BY_LABEL[k]}</p>
            <p className="mt-1 text-2xl font-extrabold text-accent">{pkr(totals[k].net)}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[12px] text-muted">
              <span>
                Invested
                <br />
                <b className="text-ink-dark">{pkr(totals[k].invested)}</b>
              </span>
              <span>
                Paid expenses
                <br />
                <b className="text-ink-dark">{pkr(totals[k].paid)}</b>
              </span>
              <span>
                Withdrawn
                <br />
                <b className="text-ink-dark">{pkr(totals[k].withdrawn)}</b>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[560px] text-[12.5px] text-muted">
          Record money a partner puts into KMO (investment) or takes out (withdrawal). Expenses a partner paid from their
          own pocket are counted automatically from the Expenses tab.
        </p>
        <button type="button" onClick={() => setForm(emptyCapital())} className={btnPrimary}>
          + Add entry
        </button>
      </div>

      {form ? <CapitalEditor ctx={ctx} initial={form} onClose={() => setForm(null)} /> : null}

      <Card title="Partner entries">
        {capital.length === 0 ? (
          <Empty>No entries yet.</Empty>
        ) : (
          <div className="flex flex-col divide-y divide-[#F1EAE6]">
            {capital.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 py-3 text-[12.5px]">
                <span className="w-[92px] text-muted">{c.entry_date}</span>
                <span className="min-w-[160px] flex-1 text-ink-dark">
                  <b>{PAID_BY_LABEL[c.partner]}</b> · {c.kind === "investment" ? "invested" : "withdrew"}
                  {c.notes ? <span className="block text-muted">{c.notes}</span> : null}
                </span>
                <span className={`font-bold ${c.kind === "investment" ? "text-success" : "text-danger"}`}>
                  {c.kind === "investment" ? "+" : "−"} {pkr(Number(c.amount_pkr))}
                </span>
                <button
                  type="button"
                  className="font-bold text-primary"
                  onClick={() =>
                    setForm({
                      id: c.id,
                      entry_date: c.entry_date,
                      partner: c.partner,
                      kind: c.kind,
                      amount_pkr: String(c.amount_pkr),
                      notes: c.notes ?? "",
                    })
                  }
                >
                  Edit
                </button>
                <button type="button" className="font-bold text-danger" onClick={() => setToDelete(c)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete partner entry?"
        message="This is recorded in Activity."
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function CapitalEditor({ ctx, initial, onClose }: { ctx: Ctx; initial: CapitalForm; onClose: () => void }) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<CapitalForm>) => setF((p) => ({ ...p, ...patch }));
  const save = useMutation({
    mutationFn: ctx.guard(async () => {
      if (!(Number(f.amount_pkr) > 0)) throw new Error("Enter an amount greater than 0.");
      return saveCapital(ctx.token, f);
    }),
    onSuccess: () => {
      ctx.refresh();
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Card title={f.id ? "Edit entry" : "Add partner entry"}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Date">
          <input type="date" value={f.entry_date} onChange={(e) => set({ entry_date: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Partner">
          <select value={f.partner} onChange={(e) => set({ partner: e.target.value as PartnerKey })} className={inputClass}>
            <option value="tehzeeb">Tehzeeb</option>
            <option value="talha">Talha</option>
          </select>
        </Field>
        <Field label="Type">
          <select value={f.kind} onChange={(e) => set({ kind: e.target.value as CapitalForm["kind"] })} className={inputClass}>
            <option value="investment">Invested (put money in)</option>
            <option value="withdrawal">Withdrew (took money out)</option>
          </select>
        </Field>
        <Field label="Amount (PKR)">
          <input inputMode="decimal" value={f.amount_pkr} onChange={(e) => set({ amount_pkr: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Notes (optional)">
          <input value={f.notes} onChange={(e) => set({ notes: e.target.value })} className={inputClass} />
        </Field>
      </div>
      {error ? <p className="mt-3 text-[12.5px] text-danger">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className={btnPrimary}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} className={btnGhost}>
          Cancel
        </button>
      </div>
    </Card>
  );
}

// ================================================================ activity

function ActivityTab({ ctx }: { ctx: Ctx }) {
  const { data, isLoading } = useQuery({ queryKey: ["bk", "activity"], queryFn: ctx.guard(() => listActivity(ctx.token)) });
  return (
    <Card title="Activity">
      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !data?.length ? (
        <Empty>Nothing yet.</Empty>
      ) : (
        <div className="flex flex-col divide-y divide-[#F1EAE6]">
          {data.map((a) => {
            const d = a.details ?? {};
            const what = (d.description as string) ?? (d.name as string) ?? "";
            return (
              <div key={a.id} className="flex flex-wrap gap-x-3 gap-y-0.5 py-2.5 text-[12.5px]">
                <span className="w-[150px] shrink-0 text-muted">
                  {new Date(a.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <span className="text-ink-dark">
                  <b>{a.person_key ? PAID_BY_LABEL[a.person_key] : "System"}</b> {a.action}
                  {what ? <span className="text-muted"> · {what}</span> : null}
                  {a.action === "codes sent" && Array.isArray(d.sent_to) ? (
                    <span className="text-muted"> · to {(d.sent_to as string[]).join(" and ")}</span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ================================================================ bits

function PaidBySelect({ value, onChange }: { value: PaidBy; onChange: (v: PaidBy) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as PaidBy)} className={inputClass}>
      <option value="kmo">KMO (company money)</option>
      <option value="tehzeeb">Tehzeeb (own pocket)</option>
      <option value="talha">Talha (own pocket)</option>
    </select>
  );
}

function MethodSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">—</option>
      {PAYMENT_METHODS.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold text-ink-dark">{label}</span>
      {children}
    </label>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="mb-3 text-[15px] font-bold text-ink">{title}</p>
      {children}
    </div>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-mono text-xs uppercase tracking-[0.06em] text-muted-table">{label}</p>
      <p className="mt-1 text-2xl font-extrabold" style={{ color: accent ? "var(--color-accent)" : "var(--color-ink-dark)" }}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[11.5px] text-muted">{sub}</p> : null}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-muted">{children}</p>;
}
