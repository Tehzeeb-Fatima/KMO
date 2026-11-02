"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, Gift } from "lucide-react";
import { getMyLoyalty, getPlatformSettings } from "@kmo/shared/api";
import { normalizeSpendTiers } from "@kmo/shared/lib";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";

/** One-line shopping-milestones strip for logged-in customers. */
export function LoyaltyStrip() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const loggedIn = !!user && !user.is_anonymous && profile?.role === "customer";

  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => getPlatformSettings(supabase),
    enabled: loggedIn,
  });
  const tiers = normalizeSpendTiers(settings?.loyalty_spend_tiers);
  const show = loggedIn && settings?.loyalty_enabled === true && tiers.length > 0;

  const { data: loyalty } = useQuery({
    queryKey: ["my-loyalty"],
    queryFn: () => getMyLoyalty(supabase),
    enabled: show,
  });

  if (!show) return null;
  const spend = loyalty?.lifetime_spend ?? 0;
  const nextIndex = tiers.findIndex((tier) => spend < tier.spend_pkr);

  return (
    <div className="bg-gradient-to-r from-primary-dark via-primary to-primary-light text-white">
      <div className="mx-auto flex h-10 max-w-[1280px] items-center gap-3 px-4">
        <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-light">
            <Gift className="h-3.5 w-3.5" />
          </span>
          <span className="hidden md:inline">{t.loyaltyStrip.title}</span>
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tiers.map((tier, i) => {
            const done = spend >= tier.spend_pkr;
            const next = i === nextIndex;
            return (
              <span
                key={tier.spend_pkr}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[12px] ${
                  done
                    ? "bg-success text-white"
                    : next
                      ? "bg-accent-light font-bold text-white ring-2 ring-white/40"
                      : "bg-white/15 text-white/95"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : null}
                <span className="font-bold">Rs. {tier.spend_pkr.toLocaleString()}</span>
                <span className="text-white/70">→</span>
                <span className="font-extrabold">
                  {tier.points.toLocaleString()} {t.loyaltyStrip.pts}
                </span>
              </span>
            );
          })}
        </div>

        <Link
          href="/account/points"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-bold text-primary transition-colors hover:bg-primary-tint"
        >
          <span>{(loyalty?.balance ?? 0).toLocaleString()} {t.loyaltyStrip.pts}</span>
          <span className="hidden text-muted sm:inline">·</span>
          <span className="hidden sm:inline">
            {t.loyaltyStrip.wallet} Rs. {(loyalty?.wallet_balance ?? 0).toLocaleString()}
          </span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
