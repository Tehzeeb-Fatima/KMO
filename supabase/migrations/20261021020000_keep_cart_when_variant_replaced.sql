-- When a vendor removes a colour/size option and has re-added the same option,
-- move customers' cart items to the new option instead of letting them vanish
-- (cart_items.variant_id cascades on delete).
create or replace function public.move_cart_items_off_deleted_variant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new uuid;
  r record;
begin
  select id into v_new
  from public.product_variants
  where product_id = old.product_id
    and id <> old.id
    and lower(trim(option_value)) = lower(trim(old.option_value))
  limit 1;

  if v_new is null then
    return old;
  end if;

  for r in select * from public.cart_items where variant_id = old.id loop
    -- the customer may already have the new option in their cart: add the quantities
    update public.cart_items
       set quantity = quantity + r.quantity
     where customer_id = r.customer_id and product_id = r.product_id and variant_id = v_new;
    if found then
      delete from public.cart_items where id = r.id;
    else
      update public.cart_items set variant_id = v_new where id = r.id;
    end if;
  end loop;

  return old;
end;
$$;

drop trigger if exists product_variants_keep_cart on public.product_variants;
create trigger product_variants_keep_cart
  before delete on public.product_variants
  for each row execute function public.move_cart_items_off_deleted_variant();
