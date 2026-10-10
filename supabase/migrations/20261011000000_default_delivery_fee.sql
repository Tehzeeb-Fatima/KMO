-- The platform-wide delivery fee fallback (used when a vendor hasn't set
-- their own rate for a city) is now admin-configured, not a hardcoded
-- Rs. 120 / free-over-2,500. Null means the admin hasn't set it yet, in
-- which case no fallback fee applies (delivery is free) rather than
-- guessing a number nobody configured.
alter table public.platform_settings
  add column if not exists default_delivery_fee numeric(10, 2),
  add column if not exists free_delivery_threshold numeric(10, 2);
