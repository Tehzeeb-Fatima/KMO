-- One admin switch that hides every product discount (e.g. before a sale) and
-- brings them back later. While off, each discounted product is charged and
-- shown at its actual price; the sale price is parked in paused_sale_price.
alter table public.platform_settings
  add column if not exists product_discounts_enabled boolean not null default true;

alter table public.products
  add column if not exists paused_sale_price numeric;

comment on column public.products.paused_sale_price is
  'Sale price held back while platform_settings.product_discounts_enabled is off; restored when it is turned on.';

-- While discounts are off, any discount a vendor or admin saves is parked
-- instead of going live. Nobody but the switch below may touch the parked price.
create or replace function public.products_discount_pause()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('kmo.discount_switch', true) is distinct from 'on' then
    new.paused_sale_price := case when tg_op = 'UPDATE' then old.paused_sale_price else null end;
  end if;

  if not coalesce((select product_discounts_enabled from public.platform_settings limit 1), true)
     and new.compare_at_price is not null and new.compare_at_price > new.price then
    new.paused_sale_price := new.price;
    new.price := new.compare_at_price;
    new.compare_at_price := null;
  end if;
  return new;
end;
$$;
drop trigger if exists products_discount_pause on public.products;
create trigger products_discount_pause before insert or update on public.products
  for each row execute function public.products_discount_pause();

-- The flag only changes through admin_set_product_discounts, so the products
-- can never be out of step with it.
create or replace function public.platform_settings_discount_guard()
returns trigger
language plpgsql
as $$
begin
  if new.product_discounts_enabled is distinct from old.product_discounts_enabled
     and current_setting('kmo.discount_switch', true) is distinct from 'on' then
    new.product_discounts_enabled := old.product_discounts_enabled;
  end if;
  return new;
end;
$$;
drop trigger if exists platform_settings_discount_guard on public.platform_settings;
create trigger platform_settings_discount_guard before update on public.platform_settings
  for each row execute function public.platform_settings_discount_guard();

create or replace function public.admin_set_product_discounts(p_enabled boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only an admin can change this.';
  end if;

  perform pg_advisory_xact_lock(hashtext('product_discount_switch'));
  perform set_config('kmo.discount_switch', 'on', true);

  update public.platform_settings set product_discounts_enabled = p_enabled where id = true;

  if p_enabled then
    update public.products
       set compare_at_price = price, price = paused_sale_price, paused_sale_price = null
     where paused_sale_price is not null and paused_sale_price > 0 and paused_sale_price < price;
    get diagnostics v_count = row_count;
    update public.products set paused_sale_price = null where paused_sale_price is not null;
  else
    update public.products
       set paused_sale_price = price, price = compare_at_price, compare_at_price = null
     where compare_at_price is not null and compare_at_price > price;
    get diagnostics v_count = row_count;
  end if;

  perform set_config('kmo.discount_switch', 'off', true);

  insert into public.audit_logs (actor_id, action, target_type, metadata)
  values (auth.uid(), case when p_enabled then 'settings.discounts_on' else 'settings.discounts_off' end,
          'platform_settings', jsonb_build_object('products', v_count));

  return v_count;
end;
$$;

revoke all on function public.admin_set_product_discounts(boolean) from public, anon;
grant execute on function public.admin_set_product_discounts(boolean) to authenticated;
