/** KMO offer: when a customer's whole cart (all stores together) reaches this
 *  amount, every order in it is delivered free, for Karachi addresses only.
 *  Keep in step with KARACHI_FREE_DELIVERY_MIN in supabase/functions/place_order. */
export const KARACHI_FREE_DELIVERY_MIN = 1200;

export function isKarachi(city: string | null | undefined): boolean {
  return (city ?? "").trim().toLowerCase() === "karachi";
}
