-- Wires admin promotions into actual checkout pricing (they were homepage
-- marketing only until now — a "20% OFF" badge that didn't change what the
-- customer paid). Adds who funds the discount, so vendor payouts land
-- correctly no matter which model a given promotion uses:
--
--   funded_by = 'kmo'    → vendor payout unaffected, KMO absorbs the discount
--   funded_by = 'vendor' → vendor payout reduced by the full discount
--   funded_by = 'shared' → split by vendor_funded_percent (0-100)
--
-- Commission is always calculated on the PRE-discount price, on every model —
-- a vendor's commission never moves because of a promotion, only their net
-- payout does. This is the one rule that must never vary per-promotion: it's
-- what stops "was commission on Rs.1000 or Rs.800?" disputes before they start.

alter table public.promotions
  add column if not exists funded_by text not null default 'kmo'
    check (funded_by in ('kmo', 'vendor', 'shared')),
  add column if not exists vendor_funded_percent numeric not null default 0
    check (vendor_funded_percent between 0 and 100),
  add column if not exists max_discount_amount numeric check (max_discount_amount is null or max_discount_amount > 0),
  add column if not exists min_order_amount numeric check (min_order_amount is null or min_order_amount > 0);

-- Keep the split meaningful for every model, not just 'shared':
-- vendor-funded = 100% vendor, kmo-funded = 0% vendor, shared = whatever the
-- admin picked. Application code can then read vendor_funded_percent alone.
alter table public.promotions
  drop constraint if exists promotions_funded_percent_consistency;
alter table public.promotions
  add constraint promotions_funded_percent_consistency check (
    (funded_by = 'kmo' and vendor_funded_percent = 0)
    or (funded_by = 'vendor' and vendor_funded_percent = 100)
    or (funded_by = 'shared')
  );

-- ── order-level promotion accounting ────────────────────────────────────
alter table public.orders
  add column if not exists promotion_id uuid references public.promotions (id) on delete set null,
  add column if not exists promotion_discount_amount numeric not null default 0,
  add column if not exists promotion_kmo_funded_amount numeric not null default 0,
  add column if not exists promotion_vendor_funded_amount numeric not null default 0;
