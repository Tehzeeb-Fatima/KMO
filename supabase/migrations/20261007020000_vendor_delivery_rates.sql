-- Lets each vendor set their own delivery charge per city, shown to the
-- customer at checkout (replacing the flat Rs. 120 / free-over-2500 default
-- for that vendor+city, once they set a rate). An admin-set cap per city
-- stops a vendor from charging more than the platform allows.

create table public.delivery_fee_caps (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  max_fee numeric(10, 2) not null check (max_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index delivery_fee_caps_city_key on public.delivery_fee_caps (lower(city));

alter table public.delivery_fee_caps enable row level security;

create policy "delivery_fee_caps_public_select"
  on public.delivery_fee_caps for select
  using (true);

create policy "delivery_fee_caps_admin_write"
  on public.delivery_fee_caps for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create table public.vendor_delivery_rates (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  city text not null,
  fee numeric(10, 2) not null check (fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index vendor_delivery_rates_vendor_city_key
  on public.vendor_delivery_rates (vendor_id, lower(city));
create index vendor_delivery_rates_vendor_id_idx on public.vendor_delivery_rates (vendor_id);

alter table public.vendor_delivery_rates enable row level security;

create policy "vendor_delivery_rates_public_select"
  on public.vendor_delivery_rates for select
  using (true);

create policy "vendor_delivery_rates_owner_write"
  on public.vendor_delivery_rates for all
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

create policy "vendor_delivery_rates_admin_write"
  on public.vendor_delivery_rates for all
  using (public.is_admin(auth.uid()) or public.staff_can('vendors'))
  with check (public.is_admin(auth.uid()) or public.staff_can('vendors'));

-- Enforce the per-city cap server-side, no matter which policy let the write through.
create or replace function public.enforce_delivery_fee_cap()
returns trigger
language plpgsql
as $$
declare
  cap numeric;
begin
  select max_fee into cap from public.delivery_fee_caps where lower(city) = lower(new.city);
  if cap is not null and new.fee > cap then
    raise exception 'Delivery fee for % cannot exceed the platform cap of Rs. %', new.city, cap;
  end if;
  return new;
end;
$$;

create trigger vendor_delivery_rates_cap_check
  before insert or update on public.vendor_delivery_rates
  for each row execute function public.enforce_delivery_fee_cap();
