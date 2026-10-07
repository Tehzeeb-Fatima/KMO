-- Admin and vendor delivery-fee screens now use a Pakistan-city dropdown plus
-- an "Other" catch-all option. This makes the cap check fall back to the
-- admin's "Other" cap when the vendor's city has no cap of its own.

create or replace function public.enforce_delivery_fee_cap()
returns trigger
language plpgsql
as $$
declare
  cap numeric;
begin
  select max_fee into cap from public.delivery_fee_caps where lower(city) = lower(new.city);
  if cap is null and lower(new.city) <> 'other' then
    select max_fee into cap from public.delivery_fee_caps where lower(city) = 'other';
  end if;
  if cap is not null and new.fee > cap then
    raise exception 'Delivery fee for % cannot exceed the platform cap of Rs. %', new.city, cap;
  end if;
  return new;
end;
$$;
