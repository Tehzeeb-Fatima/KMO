"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  claimReferral,
  getMyLoyalty,
  getMyReferralCode,
  getPlatformSettings,
  listMyLoyaltyLedger,
  listMyPointsConversions,
  listMyWalletLedger,
  requestPointsConversion,
  type LoyaltyLedgerEntry,
  type MyLoyalty,
} from "@kmo/shared/api";
import { normalizeSpendTiers } from "@kmo/shared/lib";
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
    milestone: t.loyalty.kindMilestone,
    reverse_milestone: t.loyalty.kindReverseMilestone,
    convert: t.loyalty.kindConvert,
    refund_convert: t.loyalty.kindRefundConvert,
  }[kind] ?? kind;
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
      <Link href="/account" className="text-[13.5px] font-bold text-accent">
        ← {t.account.title}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">{t.loyalty.title}</h1>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-xl bg-gradient-to-br from-[#4a2266] to-[#7a2f6c] p-6 text-white">
          <p className="font-mono text-[12.5px] tracking-[0.14em] text-[#F3D2C2]">{t.loyalty.balance.toUpperCase()}</p>
          <p className="mt-1 text-4xl font-extrabold">{balance.toLocaleString()}</p>
          <p className="mt-1 text-[15.5px] text-white/80">
            {t.loyalty.worth} Rs. {worth.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col justify-center rounded-xl border-2 border-accent-light/60 bg-accent-tint p-6">
          <p className="font-mono text-[12.5px] tracking-[0.14em] text-accent">{t.loyalty.walletTitle.toUpperCase()}</p>
          <p className="mt-1 text-3xl font-extrabold text-ink-dark" dir="ltr">
            Rs. {(loyalty?.wallet_balance ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-[14px] text-muted">{t.loyalty.walletSub}</p>
        </div>
      </div>

      {loyalty?.enabled ? <Milestones loyalty={loyalty} /> : null}
      {loyalty?.enabled ? <ConvertPoints loyalty={loyalty} /> : null}

      {loyalty && loyalty.expiring_soon > 0 ? (
        <p className="mt-3 rounded-lg bg-accent-tint px-4 py-2.5 text-[15px] font-semibold text-accent">
          {fill(t.loyalty.expiringSoon, { points: loyalty.expiring_soon.toLocaleString() })}
        </p>
      ) : null}

      {loyalty?.rule ? (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="text-[13.5px] font-bold uppercase tracking-[0.08em] text-muted-table">{t.loyalty.currentOffer}</p>
          <p className="mt-1 text-[15.5px] font-bold text-ink-dark">
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
          <p className="text-[13.5px] font-bold uppercase tracking-[0.08em] text-muted-table">{t.loyalty.repeatTitle}</p>
          <p className="mt-1 text-[15.5px] font-bold text-ink-dark">
            {fill(t.loyalty.repeatLine, { points: loyalty!.repeat_bonus_points, nth: ordinal(loyalty!.repeat_every) })}
          </p>
          <p className="mt-0.5 text-[14px] text-muted">
            {fill(t.loyalty.repeatProgress, {
              left: loyalty!.repeat_every - (loyalty!.delivered_orders % loyalty!.repeat_every),
            })}
          </p>
        </div>
      ) : null}

      {referralsOn ? <ReferFriend friend={loyalty!.referee_points} you={loyalty!.referrer_points} /> : null}
      {referralsOn && loyalty!.can_claim_referral ? <ClaimCode /> : null}

      <p className="mt-4 text-[15px] leading-relaxed text-muted">
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
          <p className="text-[15.5px] text-muted">{t.loyalty.noHistory}</p>
        ) : (
          <div className="flex flex-col divide-y divide-[#F1EAE6] rounded-xl border border-border bg-surface">
            {ledger.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[15.5px] font-bold text-ink-dark">{kindLabel(t, row.kind)}</p>
                  <p className="truncate text-[13.5px] text-muted">
                    {new Date(row.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    {row.note ? ` · ${row.note}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 text-[15.5px] font-extrabold ${row.points > 0 ? "text-success" : "text-danger"}`} dir="ltr">
                  {row.points > 0 ? "+" : ""}
                  {row.points.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <WalletHistory />
    </main>
  );
}

function Milestones({ loyalty }: { loyalty: MyLoyalty }) {
  const { t } = useLanguage();
  const { data: settings } = useQuery({ queryKey: ["platform-settings"], queryFn: () => getPlatformSettings(supabase) });
  const tiers = normalizeSpendTiers(settings?.loyalty_spend_tiers);
  if (!tiers.length) return null;
  const spend = loyalty.lifetime_spend;
  const top = tiers[tiers.length - 1].spend_pkr;
  const reached = new Set(loyalty.milestones_reached);

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-4">
      <p className="text-[13.5px] font-bold uppercase tracking-[0.08em] text-muted-table">{t.loyalty.milestonesTitle}</p>
      <p className="mt-1 text-[14px] text-muted">
        {fill(t.loyalty.milestonesSub, { spend: Math.floor(spend).toLocaleString() })}
      </p>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-primary-tint">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent-light transition-all"
          style={{ width: `${Math.min(100, (spend / top) * 100)}%` }}
        />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {tiers.map((tier) => {
          const done = reached.has(tier.spend_pkr) || spend >= tier.spend_pkr;
          return (
            <div
              key={tier.spend_pkr}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
                done ? "bg-success-tint" : "bg-surface-alt"
              }`}
            >
              <span className="text-[14.5px] font-semibold text-ink-dark">
                {fill(t.loyalty.milestoneLine, {
                  spend: tier.spend_pkr.toLocaleString(),
                  points: tier.points.toLocaleString(),
                })}
              </span>
              <span className={`shrink-0 text-[13px] font-bold ${done ? "text-success" : "text-muted"}`}>
                {done
                  ? `✓ ${t.loyalty.milestoneDone}`
                  : fill(t.loyalty.milestoneLeft, { left: Math.ceil(tier.spend_pkr - spend).toLocaleString() })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConvertPoints({ loyalty }: { loyalty: MyLoyalty }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [points, setPoints] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const { data: requests } = useQuery({
    queryKey: ["my-points-conversions"],
    queryFn: () => listMyPointsConversions(supabase),
  });

  const n = Math.floor(Number(points) || 0);
  const value = Math.round(n * loyalty.point_value * 100) / 100;
  const valid = n >= loyalty.min_redeem_points && n <= loyalty.balance && loyalty.point_value > 0;

  const submit = useMutation({
    mutationFn: () => requestPointsConversion(supabase, n),
    onSuccess: () => {
      setMessage({ ok: true, text: t.loyalty.convertSent });
      setPoints("");
      queryClient.invalidateQueries({ queryKey: ["my-loyalty"] });
      queryClient.invalidateQueries({ queryKey: ["my-loyalty-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["my-points-conversions"] });
    },
    onError: (e: Error) => setMessage({ ok: false, text: e.message }),
  });

  const pending = loyalty.pending_conversion;

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-4">
      <p className="text-[13.5px] font-bold uppercase tracking-[0.08em] text-muted-table">{t.loyalty.convertTitle}</p>
      <p className="mt-1 text-[14px] text-muted">
        {fill(t.loyalty.convertLine, { value: loyalty.point_value, min: loyalty.min_redeem_points })}
      </p>

      {pending ? (
        <p className="mt-3 rounded-lg bg-warning-tint px-3 py-2.5 text-[14.5px] font-semibold text-warning">
          ⏳ {fill(t.loyalty.convertPending, { points: pending.points.toLocaleString(), value: pending.amount_pkr.toLocaleString() })}
        </p>
      ) : loyalty.balance < loyalty.min_redeem_points ? (
        <p className="mt-3 text-[14px] text-muted">{fill(t.loyalty.convertNeedMore, { min: loyalty.min_redeem_points })}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <label className="text-[13px] font-bold text-ink-dark">{t.loyalty.convertPoints}</label>
          <div className="flex flex-wrap gap-2">
            <input
              inputMode="numeric"
              value={points}
              onChange={(e) => setPoints(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={String(loyalty.balance)}
              dir="ltr"
              className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-[15.5px] outline-none focus:border-primary-light"
            />
            <button
              type="button"
              onClick={() => setPoints(String(loyalty.balance))}
              className="rounded-lg border border-border px-3 py-2 text-[13.5px] font-bold text-primary"
            >
              Max
            </button>
            <button
              type="button"
              disabled={!valid || submit.isPending}
              onClick={() => submit.mutate()}
              className="rounded-lg bg-primary px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-50"
            >
              {t.loyalty.convertSubmit}
            </button>
          </div>
          {n > 0 ? (
            <p className="text-[14px] font-semibold text-success">
              {fill(t.loyalty.convertYouGet, { value: value.toLocaleString() })}
            </p>
          ) : null}
        </div>
      )}
      {message ? <p className={`mt-2 text-[13.5px] ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p> : null}

      {requests?.length ? (
        <div className="mt-4">
          <p className="text-[13px] font-bold text-ink-dark">{t.loyalty.convertHistory}</p>
          <div className="mt-2 flex flex-col divide-y divide-[#F1EAE6]">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2 text-[13.5px]">
                <span className="text-muted">
                  {new Date(r.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  {" · "}
                  {r.points.toLocaleString()} → Rs. {Number(r.amount_pkr).toLocaleString()}
                  {r.status === "rejected" && r.review_note ? ` · ${r.review_note}` : ""}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${
                    r.status === "approved"
                      ? "bg-success-tint text-success"
                      : r.status === "rejected"
                        ? "bg-danger-tint text-danger"
                        : "bg-warning-tint text-warning"
                  }`}
                >
                  {r.status === "approved"
                    ? t.loyalty.statusApproved
                    : r.status === "rejected"
                      ? t.loyalty.statusRejected
                      : t.loyalty.statusPending}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WalletHistory() {
  const { t } = useLanguage();
  const { data: rows } = useQuery({ queryKey: ["my-wallet-ledger"], queryFn: () => listMyWalletLedger(supabase) });
  if (!rows?.length) return null;
  const label = { conversion: t.loyalty.walletConversion, spend: t.loyalty.walletSpend, refund_spend: t.loyalty.walletRefund };
  return (
    <>
      <h2 className="mt-7 text-lg font-bold text-ink">{t.loyalty.walletHistory}</h2>
      <div className="mt-3 flex flex-col divide-y divide-[#F1EAE6] rounded-xl border border-border bg-surface">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[15.5px] font-bold text-ink-dark">{label[row.kind]}</p>
              <p className="truncate text-[13.5px] text-muted">
                {new Date(row.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                {row.note ? ` · ${row.note}` : ""}
              </p>
            </div>
            <span
              className={`shrink-0 text-[15.5px] font-extrabold ${Number(row.amount) > 0 ? "text-success" : "text-danger"}`}
              dir="ltr"
            >
              {Number(row.amount) > 0 ? "+" : "−"} Rs. {Math.abs(Number(row.amount)).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </>
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
      <p className="text-[13.5px] font-bold uppercase tracking-[0.08em] text-muted-table">{t.loyalty.referTitle}</p>
      <p className="mt-1 text-[15px] text-ink-dark">{fill(t.loyalty.referLine, { friend, you })}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-primary-tint px-3 py-2 font-mono text-[17px] font-bold tracking-[0.12em] text-primary" dir="ltr">
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
          className="rounded-lg border border-border px-3 py-2 text-[13.5px] font-bold text-primary"
        >
          {copied ? t.loyalty.copied : t.loyalty.copyLink}
        </button>
        <a
          href={shareText ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#25D366] px-3 py-2 text-[13.5px] font-bold text-white"
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
      <p className="text-[15.5px] font-bold text-ink-dark">{t.loyalty.haveCode}</p>
      <p className="text-[13.5px] text-muted">{t.loyalty.haveCodeSub}</p>
      <div className="mt-2 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t.loyalty.enterCode}
          dir="ltr"
          className="flex-1 rounded-lg border border-border px-3 py-2 font-mono text-[15.5px] uppercase outline-none focus:border-primary-light"
        />
        <button
          type="button"
          disabled={!code.trim() || claim.isPending}
          onClick={() => claim.mutate()}
          className="rounded-lg bg-primary px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-60"
        >
          {t.loyalty.apply}
        </button>
      </div>
      {message ? <p className={`mt-2 text-[13.5px] ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p> : null}
    </div>
  );
}
