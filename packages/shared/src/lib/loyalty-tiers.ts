import type { LoyaltySpendTier } from "../types";

export const MAX_LOYALTY_SPEND_TIERS = 3;

/** Valid tiers only, lowest spend first. */
export function normalizeSpendTiers(tiers: LoyaltySpendTier[] | null | undefined): LoyaltySpendTier[] {
  return (tiers ?? [])
    .map((t) => ({ spend_pkr: Number(t.spend_pkr), points: Math.floor(Number(t.points)) }))
    .filter((t) => t.spend_pkr > 0 && t.points > 0)
    .sort((a, b) => a.spend_pkr - b.spend_pkr)
    .slice(0, MAX_LOYALTY_SPEND_TIERS);
}

/** Points for the highest tier this checkout amount reaches (0 if none). */
export function spendTierPoints(tiers: LoyaltySpendTier[] | null | undefined, amount: number): number {
  let points = 0;
  for (const t of normalizeSpendTiers(tiers)) {
    if (amount >= t.spend_pkr) points = Math.max(points, t.points);
  }
  return points;
}
