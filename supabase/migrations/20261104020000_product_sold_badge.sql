-- Admin-set "N sold" tag shown on a product's card and page. Only an admin
-- may set it; a vendor editing the product keeps whatever the admin chose.
alter table public.products
  add column if not exists sold_badge integer check (sold_badge is null or sold_badge > 0);

create or replace function public.products_sold_badge_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.sold_badge := case when tg_op = 'UPDATE' then old.sold_badge else null end;
  end if;
  return new;
end;
$$;
drop trigger if exists products_sold_badge_guard on public.products;
create trigger products_sold_badge_guard before insert or update on public.products
  for each row execute function public.products_sold_badge_guard();
