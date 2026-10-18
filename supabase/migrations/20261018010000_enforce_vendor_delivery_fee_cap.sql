-- The delivery fee cap was only ever shown to vendors as a hint — nothing
-- stopped them saving a higher fee. This enforces it at the database level
-- (so it can't be bypassed by calling the API directly), using the same
-- precedence the UI already shows: vendor's own cap for the exact city,
-- then vendor's own "Other" cap, then the global cap for the exact city,
-- then the global "Other" cap.

create or replace function public.enforce_vendor_delivery_fee_cap()
returns trigger as $$
declare
  cap numeric;
begin
  select max_fee into cap
  from public.delivery_fee_caps
  where vendor_id = new.vendor_id and lower(city) = lower(new.city);

  if cap is null and lower(new.city) <> 'other' then
    select max_fee into cap
    from public.delivery_fee_caps
    where vendor_id = new.vendor_id and lower(city) = 'other';
  end if;

  if cap is null then
    select max_fee into cap
    from public.delivery_fee_caps
    where vendor_id is null and lower(city) = lower(new.city);
  end if;

  if cap is null and lower(new.city) <> 'other' then
    select max_fee into cap
    from public.delivery_fee_caps
    where vendor_id is null and lower(city) = 'other';
  end if;

  if cap is not null and new.fee > cap then
    raise exception 'Delivery fee for % cannot exceed KMO''s cap of Rs. %', new.city, cap;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_vendor_delivery_fee_cap on public.vendor_delivery_rates;
create trigger trg_enforce_vendor_delivery_fee_cap
  before insert or update on public.vendor_delivery_rates
  for each row execute function public.enforce_vendor_delivery_fee_cap();
