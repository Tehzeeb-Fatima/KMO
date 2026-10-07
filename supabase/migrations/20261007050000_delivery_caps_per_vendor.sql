-- Lets an admin cap a specific vendor's delivery fee separately from the
-- platform-wide default cap for that city — same default/override shape as
-- courier_rate_slabs. vendor_id null = default cap (every vendor), vendor_id
-- set = only that vendor.

alter table public.delivery_fee_caps
  add column if not exists vendor_id uuid references public.vendors (id) on delete cascade;

drop index if exists delivery_fee_caps_city_key;
create unique index delivery_fee_caps_vendor_city_key
  on public.delivery_fee_caps (coalesce(vendor_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(city));
create index delivery_fee_caps_vendor_id_idx on public.delivery_fee_caps (vendor_id);

-- A vendor-specific cap, then that vendor's "Other" cap, then the default cap
-- for the city, then the default "Other" cap — most specific wins.
create or replace function public.enforce_delivery_fee_cap()
returns trigger
language plpgsql
as $$
declare
  cap numeric;
begin
  select max_fee into cap from public.delivery_fee_caps
  where vendor_id = new.vendor_id and lower(city) = lower(new.city);

  if cap is null and lower(new.city) <> 'other' then
    select max_fee into cap from public.delivery_fee_caps
    where vendor_id = new.vendor_id and lower(city) = 'other';
  end if;

  if cap is null then
    select max_fee into cap from public.delivery_fee_caps
    where vendor_id is null and lower(city) = lower(new.city);
  end if;

  if cap is null and lower(new.city) <> 'other' then
    select max_fee into cap from public.delivery_fee_caps
    where vendor_id is null and lower(city) = 'other';
  end if;

  if cap is not null and new.fee > cap then
    raise exception 'Delivery fee for % cannot exceed the platform cap of Rs. %', new.city, cap;
  end if;
  return new;
end;
$$;
