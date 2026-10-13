"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claimReferral, getMyLoyalty, getMyReferralCode, listMyLoyaltyLedger, type LoyaltyLedgerEntry } from "@kmo/shared/api";
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
    expire: t.loyalty.kindExpire,
    bonus: t.loyalty.kindBonus,
    reverse_bonus: t.loyalty.kindReverseBonus,
    referral: t.loyalty.kindReferral,
  }[kind];
}

function PointsContent() {
  const { t } = useLanguage();
  const { data: loyalty } = useQuery({ queryKey: ["my-loyalty"], queryFn: () => getMyLoyalty(supabase) });
  const { data: ledger, isLoading } = useQuery({ queryKey: ["my-loyalty-ledger"], queryFn: () => listMyLoyaltyLedger(supabase) });

  const balance = loyalty?.balance ?? 0;
  const worth = Math.floor(balance * (loyalty?.point_value ?? 0));
  const referralsOn = !!loyalty?.enabled && (loyalty.referrer_points > 0 || loyalty.referee_points > 0);
  const repeatOn = !!loyalty?.enabled && loyalty.repeat_every > 0 && loyalty.repeat_bonus_points > 0;

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

      {loyalty && loyalty.expiring_soon > 0 ? (
        <p className="mt-3 rounded-lg bg-accent-tint px-4 py-2.5 text-[13px] font-semibold text-accent">
          {fill(t.loyalty.expiringSoon, { points: loyalty.expiring_soon.toLocaleString() })}
        </p>
      ) : null}

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

      {repeatOn ? (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-table">{t.loyalty.repeatTitle}</p>
          <p className="mt-1 text-sm font-bold text-ink-dark">
            {fill(t.loyalty.repeatLine, { points: loyalty!.repeat_bonus_points, nth: ordinal(loyalty!.repeat_every) })}
          </p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {fill(t.loyalty.repeatProgress, {
              left: loyalty!.repeat_every - (loyalty!.delivered_orders % loyalty!.repeat_every),
            })}
          </p>
        </div>
      ) : null}

      {referralsOn ? <ReferFriend friend={loyalty!.referee_points} you={loyalty!.referrer_points} /> : null}
      {referralsOn && loyalty!.can_claim_referral ? <ClaimCode /> : null}

      <p className="mt-4 text-[13px] leading-relaxed text-muted">
        {t.loyalty.howItWorks}
        {loyalty ? (
          <>
            {" "}
            {fill(t.loyalty.redeemRule, { min: loyalty.min_redeem_points, max: loyalty.max_redeem_percent })}
            {loyalty.expiry_months > 0 ? <> {fill(t.loyalty.expiryRule, { months: loyalty.expiry_months })}</> : null}
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

function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

function ReferFriend({ friend, you }: { friend: number; you: number }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const { data: code } = useQuery({ queryKey: ["my-referral-code"], queryFn: () => getMyReferralCode(supabase) });
  const link = code && typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}` : "";
  const shareText = code ? fill(t.loyalty.shareText, { code, friend, link }) : "";

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-table">{t.loyalty.referTitle}</p>
      <p className="mt-1 text-[13px] text-ink-dark">{fill(t.loyalty.referLine, { friend, you })}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-primary-tint px-3 py-2 font-mono text-base font-bold tracking-[0.12em] text-primary" dir="ltr">
          {code ?? "…"}
        </span>
        <button
          type="button"
          disabled={!link}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // clipboard blocked; the code is on screen
            }
          }}
          className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-primary"
        >
          {copied ? t.loyalty.copied : t.loyalty.copyLink}
        </button>
        <a
          href={shareText ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-white"
        >
          {t.loyalty.shareWhatsApp}
        </a>
      </div>
    </div>
  );
}

function ClaimCode() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const claim = useMutation({
    mutationFn: () => claimReferral(supabase, code),
    onSuccess: () => {
      setMessage({ ok: true, text: t.loyalty.referralAdded });
      queryClient.invalidateQueries({ queryKey: ["my-loyalty"] });
    },
    onError: (e: Error) => setMessage({ ok: false, text: e.message }),
  });

  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-surface p-4">
      <p className="text-sm font-bold text-ink-dark">{t.loyalty.haveCode}</p>
      <p className="text-xs text-muted">{t.loyalty.haveCodeSub}</p>
      <div className="mt-2 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t.loyalty.enterCode}
          dir="ltr"
          className="flex-1 rounded-lg border border-border px-3 py-2 font-mono text-sm uppercase outline-none focus:border-primary-light"
        />
        <button
          type="button"
          disabled={!code.trim() || claim.isPending}
          onClick={() => claim.mutate()}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {t.loyalty.apply}
        </button>
      </div>
      {message ? <p className={`mt-2 text-xs ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p> : null}
    </div>
  );
}
