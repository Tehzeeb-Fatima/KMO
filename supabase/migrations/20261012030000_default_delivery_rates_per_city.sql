-- The platform-wide delivery fee fallback (used when a vendor hasn't set
-- their own rate for a city) is now city-wise, same shape as vendor_delivery_rates
-- and delivery_fee_caps: pick a city from the dropdown, or "Other" as a
-- catch-all for every city not listed individually.
create table public.default_delivery_rates (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  fee numeric(10, 2) not null check (fee >= 0),
  free_delivery_threshold numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index default_delivery_rates_city_key on public.default_delivery_rates (lower(city));

alter table public.default_delivery_rates enable row level security;

create policy "default_delivery_rates_public_select"
  on public.default_delivery_rates for select
  using (true);

create policy "default_delivery_rates_admin_write"
  on public.default_delivery_rates for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "default_delivery_rates_staff_write"
  on public.default_delivery_rates for all
  using (public.staff_can('settings'))
  with check (public.staff_can('settings'));

-- Migrate any flat default that was already set into an "Other" row, so
-- nothing changes for customers mid-migration.
insert into public.default_delivery_rates (city, fee, free_delivery_threshold)
select 'Other', default_delivery_fee, free_delivery_threshold
from public.platform_settings
where default_delivery_fee is not null
on conflict do nothing;
