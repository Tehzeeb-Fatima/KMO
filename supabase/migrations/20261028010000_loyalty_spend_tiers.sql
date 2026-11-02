-- Spend tiers: "shop Rs. 20,000 in one checkout, get 200 points; Rs. 40,000,
-- get 300", up to 3 tiers set by admin. Shown to logged-in customers as a
-- strip under the header. A checkout earns the points of the highest tier it
-- reaches, or the earning-rule points if those are more.
alter table public.platform_settings
  add column loyalty_spend_tiers jsonb not null default '[]'::jsonb;
