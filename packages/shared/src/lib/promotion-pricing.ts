/**
 * Same matching/discount math as the `place_order` edge function — kept as a
 * pure function so the checkout page can show the customer the exact total
 * they're about to be charged, not just an estimate that then changes once
 * the order is actually created server-side.
 */

export interface PromotionForPricing {
  id: string;
  vendor_id: string | null;
  category_id: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  vendor_funded_percent: number;
  max_discount_amount: number | null;
  min_order_amount: number | null;
}

export interface PricingLineItem {
  vendorId: string;
  categoryId: string | null;
  unitPrice: number;
  quantity: number;
}

function unitDiscount(promo: PromotionForPricing, unitPrice: number): number {
  if (promo.discount_type === "percentage") return unitPrice * (promo.discount_value / 100);
  return Math.max(0, unitPrice - promo.discount_value);
}

/** The best-matching active promotion for one vendor's items in the cart, if any. */
export function bestPromotionForVendor(
  vendorId: string,
  vendorItems: PricingLineItem[],
  vendorSubtotal: number,
  activePromotions: PromotionForPricing[],
): { promotion: PromotionForPricing | null; discountAmount: number } {
  let best: PromotionForPricing | null = null;
  let bestDiscount = 0;

  for (const promo of activePromotions) {
    if (promo.vendor_id && promo.vendor_id !== vendorId) continue;
    if (promo.min_order_amount && vendorSubtotal < promo.min_order_amount) continue;

    let raw = 0;
    for (const item of vendorItems) {
      if (promo.category_id && promo.category_id !== item.categoryId) continue;
      raw += unitDiscount(promo, item.unitPrice) * item.quantity;
    }
    if (raw <= 0) continue;

    const capped = promo.max_discount_amount ? Math.min(raw, promo.max_discount_amount) : raw;
    if (capped > bestDiscount) {
      bestDiscount = capped;
      best = promo;
    }
  }

  return { promotion: best, discountAmount: Math.round(bestDiscount * 100) / 100 };
}
