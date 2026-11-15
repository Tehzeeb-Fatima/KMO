-- While product discounts are off, a vendor (or a bulk price upload) that sets
-- a new price without a discount drops the parked sale price, so turning
-- discounts back on can't bring back a sale price from the old price list.
create or replace function public.products_discount_pause()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean := coalesce((select product_discounts_enabled from public.platform_settings limit 1), true);
begin
  if current_setting('kmo.discount_switch', true) is distinct from 'on' then
    new.paused_sale_price := case when tg_op = 'UPDATE' then old.paused_sale_price else null end;
  end if;

  if not v_enabled and new.compare_at_price is not null and new.compare_at_price > new.price then
    new.paused_sale_price := new.price;
    new.price := new.compare_at_price;
    new.compare_at_price := null;
  elsif not v_enabled and tg_op = 'UPDATE'
        and current_setting('kmo.discount_switch', true) is distinct from 'on'
        and new.price is distinct from old.price then
    new.paused_sale_price := null;
  end if;
  return new;
end;
$$;
