-- Lets a vendor offer free delivery themselves, either unconditionally
-- (fee = 0) or above a spend threshold for a city, instead of only being
-- able to set a flat fee. A vendor's own rate (even 0) already overrides
-- the admin's default per the existing exact > vendor-Other > admin-default
-- > admin-default-Other > free precedence.

alter table public.vendor_delivery_rates
  add column if not exists free_delivery_threshold numeric;
