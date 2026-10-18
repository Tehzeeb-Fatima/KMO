alter table public.courier_rate_slabs
  add column if not exists fuel_charge_percent numeric not null default 0;
