-- GST/tax and fuel charge are the same across every slab for a given
-- courier, so admin shouldn't have to re-enter them on every slab. Moved
-- up to the courier itself, set once, applied to all its slabs.

alter table public.couriers
  add column if not exists tax_percent numeric not null default 0,
  add column if not exists fuel_charge_percent numeric not null default 0;
