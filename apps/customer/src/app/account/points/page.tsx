"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getMyLoyalty, listMyLoyaltyLedger, type LoyaltyLedgerEntry } from "@kmo/shared/api";
import { RequireAuth } from "@/components/require-auth";
import { ListSkeleton } from "@/components/page-loader";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import type { TranslationTree } from "@/lib/i18n/translations";
import { fill } from "@/lib/fill";

export default function PointsPage() {
  return (
    <RequireAuth allowedRoles={["customer"]}>
      <PointsContent />
    </RequireAuth>
  );
}

function kindLabel(t: TranslationTree, kind: LoyaltyLedgerEntry["kind"]) {
  return {
    earn: t.loyalty.kindEarn,
    redeem: t.loyalty.kindRedeem,
    reverse_earn: t.loyalty.kindReverse,
    refund_redeem: t.loyalty.kindRefund,
    adjust: t.loyalty.kindAdjust,
  }[kind];
}

function PointsContent() {
  const { t } = useLanguage();
  const { data: loyalty } = useQuery({ queryKey: ["my-loyalty"], queryFn: () => getMyLoyalty(supabase) });
  const { data: ledger, isLoading } = useQuery({ queryKey: ["my-loyalty-ledger"], queryFn: () => listMyLoyaltyLedger(supabase) });

  const balance = loyalty?.balance ?? 0;
  const worth = Math.floor(balance * (loyalty?.point_value ?? 0));

  return (
    <main className="mx-auto w-full max-w-[600px] px-4 py-10 sm:px-6">
      <Link href="/account" className="text-xs font-bold text-accent">
        ← {t.account.title}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">{t.loyalty.title}</h1>

      <div className="mt-5 rounded-xl bg-gradient-to-br from-[#4a2266] to-[#7a2f6c] p-6 text-white">
        <p className="font-mono text-[11px] tracking-[0.14em] text-[#F3D2C2]">{t.loyalty.balance.toUpperCase()}</p>
        <p className="mt-1 text-4xl font-extrabold">{balance.toLocaleString()}</p>
        <p className="mt-1 text-sm text-white/80">
          {t.loyalty.worth} Rs. {worth.toLocaleString()}
        </p>
      </div>

      {loyalty?.rule ? (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-table">{t.loyalty.currentOffer}</p>
          <p className="mt-1 text-sm font-bold text-ink-dark">
            {fill(t.loyalty.offerLine, { points: loyalty.rule.points, spend: loyalty.rule.spend_pkr.toLocaleString() })}
            {loyalty.rule.ends_at ? (
              <span className="font-normal text-muted">
                {" "}
                · {new Date(loyalty.rule.ends_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}{" "}
                {t.loyalty.until}
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-[13px] leading-relaxed text-muted">
        {t.loyalty.howItWorks}
        {loyalty ? (
          <>
            {" "}
            {fill(t.loyalty.redeemRule, { min: loyalty.min_redeem_points, max: loyalty.max_redeem_percent })}
          </>
        ) : null}
      </p>

      <h2 className="mt-7 text-lg font-bold text-ink">{t.loyalty.history}</h2>
      <div className="mt-3">
        {isLoading ? (
          <ListSkeleton rows={3} rowClassName="h-14" />
        ) : !ledger?.length ? (
          <p className="text-sm text-muted">{t.loyalty.noHistory}</p>
        ) : (
          <div className="flex flex-col divide-y divide-[#F1EAE6] rounded-xl border border-border bg-surface">
            {ledger.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-dark">{kindLabel(t, row.kind)}</p>
                  <p className="truncate text-xs text-muted">
                    {new Date(row.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    {row.note ? ` · ${row.note}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-extrabold ${row.points > 0 ? "text-success" : "text-danger"}`} dir="ltr">
                  {row.points > 0 ? "+" : ""}
                  {row.points.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
