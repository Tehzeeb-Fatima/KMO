/**
 * Computes the actual courier charge for a parcel from the admin-entered
 * rate slabs (see Admin > Couriers), so this is also what invoicing/
 * bookkeeping uses — not just a reference table a human reads by eye.
 */

export interface CourierSlabForPricing {
  city: string;
  min_weight_kg: number;
  /** null = open-ended ("this weight and above"). */
  max_weight_kg: number | null;
  fee: number;
  /** Only meaningful on an open-ended slab: charged per kg above min_weight_kg. */
  additional_per_kg: number | null;
  tax_percent: number;
  fuel_charge_percent: number;
}

/** Exact-city slabs if any exist, else the "Other" fallback — same
 *  precedence used everywhere else in KMO. */
export function slabsForCity<T extends CourierSlabForPricing>(slabs: T[], city: string): T[] {
  const exact = slabs.filter((s) => s.city.toLowerCase() === city.trim().toLowerCase());
  if (exact.length > 0) return exact;
  return slabs.filter((s) => s.city.toLowerCase() === "other");
}

/** The one slab a given weight falls into: a closed slab covering it, else
 *  an open-ended slab starting at or below it. */
export function findMatchingSlab<T extends CourierSlabForPricing>(
  citySlabs: T[],
  weightKg: number,
): T | null {
  const closed = citySlabs.find(
    (s) => s.max_weight_kg != null && weightKg >= s.min_weight_kg && weightKg <= s.max_weight_kg,
  );
  if (closed) return closed;
  const open = citySlabs
    .filter((s) => s.max_weight_kg == null && weightKg >= s.min_weight_kg)
    .sort((a, b) => b.min_weight_kg - a.min_weight_kg)[0];
  return open ?? null;
}

export interface CourierChargeBreakdown {
  slab: CourierSlabForPricing;
  /** Number of extra kg "brackets" charged (0 for a closed slab). Billed
   *  per started kg, not prorated — 2.1kg and 2.9kg both count as 1. */
  extraBrackets: number;
  extraCharge: number;
  /** Base fee + extraCharge — the delivery fee itself, before GST/fuel. */
  deliveryFee: number;
  /** GST/tax is on the product's price, not the delivery fee. */
  gstAmount: number;
  /** Fuel charge is on the delivery fee. */
  fuelAmount: number;
  total: number;
}

/** productPrice is only needed to compute GST (charged on the product, not
 *  the parcel) — pass 0 if you only want the courier's own charge.
 *
 *  An open-ended slab's additional_per_kg is billed per *started* kg above
 *  the whole-kg mark its min_weight_kg sits just above (e.g. min 2.01 →
 *  that mark is 2kg) — not prorated. 2.50kg and 2.99kg both cost one
 *  bracket; 3.01kg costs two. */
export function calculateCourierCharge(
  slab: CourierSlabForPricing,
  weightKg: number,
  productPrice = 0,
): CourierChargeBreakdown {
  let extraBrackets = 0;
  if (slab.max_weight_kg == null) {
    const flooredMark = Math.floor(slab.min_weight_kg);
    extraBrackets = weightKg > flooredMark ? Math.ceil(weightKg - flooredMark) : 0;
  }
  const extraCharge = slab.additional_per_kg != null ? extraBrackets * slab.additional_per_kg : 0;
  const deliveryFee = slab.fee + extraCharge;
  const gstAmount = (productPrice * slab.tax_percent) / 100;
  const fuelAmount = (deliveryFee * slab.fuel_charge_percent) / 100;
  const total = deliveryFee + gstAmount + fuelAmount;
  return { slab, extraBrackets, extraCharge, deliveryFee, gstAmount, fuelAmount, total };
}
