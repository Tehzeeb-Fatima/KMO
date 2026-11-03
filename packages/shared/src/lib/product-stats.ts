/** Rating + sold figures for a product card: the admin's starting rating
 *  blended with real customer reviews, and the admin-set sold tag. */
export function cardStats(p: {
  admin_rating?: number | null;
  admin_rating_count?: number | null;
  review_count?: number | null;
  review_sum?: number | null;
  sold_badge?: number | null;
}): { rating: number | undefined; ratingCount: number | undefined; soldBadge: number | null } {
  const adminCount = p.admin_rating && p.admin_rating_count ? p.admin_rating_count : 0;
  const reviewCount = p.review_count ?? 0;
  const total = adminCount + reviewCount;
  const rating = total > 0 ? (Number(p.admin_rating ?? 0) * adminCount + (p.review_sum ?? 0)) / total : undefined;
  return { rating, ratingCount: total > 0 ? total : undefined, soldBadge: p.sold_badge ?? null };
}
