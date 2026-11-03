-- Super admin can hide test orders. A deleted order keeps its rows but RLS hides
-- it from every app screen, list and report; it can be brought back as cancelled.
alter table public.orders add column if not exists deleted_at timestamptz;

create policy "orders_hide_deleted" on public.orders
  as restrictive for select using (deleted_at is null);

create policy "order_items_hide_deleted" on public.order_items
  as restrictive for select
  using (exists (select 1 from public.orders o where o.id = order_items.order_id));

-- Cancels first, so the existing triggers refund wallet and points, then returns
-- the stock. Orders with money or a courier already involved can't be deleted.
create or replace function public.admin_soft_delete_order(p_order uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_order public.orders;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only an admin can delete orders.';
  end if;
  select * into v_order from public.orders where id = p_order and deleted_at is null for update;
  if v_order.id is null then
    raise exception 'Order not found.';
  end if;
  if v_order.status in ('delivered', 'returned') or v_order.payout_id is not null then
    raise exception 'Delivered, returned or paid-out orders can''t be deleted.';
  end if;
  if v_order.courier_tracking_id is not null then
    raise exception 'This order is booked with a courier, so it can''t be deleted.';
  end if;

  if v_order.status <> 'cancelled' then
    update public.orders set status = 'cancelled' where id = p_order;

    update public.products p set stock_quantity = p.stock_quantity + i.quantity
    from public.order_items i
    where i.order_id = p_order and i.variant_id is null
      and p.id = i.product_id and p.stock_quantity is not null;

    update public.product_variants v set stock_quantity = v.stock_quantity + i.quantity
    from public.order_items i
    where i.order_id = p_order and v.id = i.variant_id and v.stock_quantity is not null;
  end if;

  update public.orders set deleted_at = now() where id = p_order;
end;
$$;

-- Comes back as cancelled: refunds and stock from the delete stay as they are.
create or replace function public.admin_restore_order(p_order uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only an admin can restore orders.';
  end if;
  update public.orders set deleted_at = null where id = p_order;
end;
$$;

create or replace function public.admin_deleted_orders()
returns table(id uuid, order_number text, total numeric, ship_name text, store_name text, created_at timestamptz, deleted_at timestamptz)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only an admin can see deleted orders.';
  end if;
  return query
    select o.id, o.order_number::text, o.total, o.ship_name, v.store_name, o.created_at, o.deleted_at
    from public.orders o
    left join public.vendors v on v.id = o.vendor_id
    where o.deleted_at is not null
    order by o.deleted_at desc;
end;
$$;

revoke all on function public.admin_soft_delete_order(uuid) from public, anon;
revoke all on function public.admin_restore_order(uuid) from public, anon;
revoke all on function public.admin_deleted_orders() from public, anon;
grant execute on function public.admin_soft_delete_order(uuid) to authenticated;
grant execute on function public.admin_restore_order(uuid) to authenticated;
grant execute on function public.admin_deleted_orders() to authenticated;

-- These run past RLS, so they skip deleted orders themselves.
create or replace function public.top_categories(limit_count integer default 3)
returns table(id uuid, name text, slug text, image_url text, sold_count bigint, product_count bigint)
language sql
stable security definer
set search_path to 'public'
as $$
  select
    c.id,
    c.name,
    c.slug,
    c.image_url,
    coalesce(sum(oi.quantity) filter (where o.deleted_at is null), 0)::bigint as sold_count,
    count(distinct p.id)::bigint as product_count
  from categories c
  join products p on p.category_id = c.id and p.status = 'published'
  join vendors v on v.id = p.vendor_id and v.verification_status = 'approved'
  left join order_items oi on oi.product_id = p.id
  left join orders o on o.id = oi.order_id
  group by c.id, c.name, c.slug, c.image_url
  order by sold_count desc, product_count desc, c.name
  limit greatest(1, least(coalesce(limit_count, 3), 12));
$$;

create or replace function public.track_order(p_order_number text, p_email text)
returns table(order_number text, status order_status, total numeric, payment_method text, created_at timestamptz)
language sql
stable security definer
set search_path to 'public', 'auth'
as $$
  select o.order_number, o.status, o.total, o.payment_method::text, o.created_at
  from public.orders o
  join auth.users u on u.id = o.customer_id
  where upper(o.order_number) = upper(trim(p_order_number))
    and lower(u.email) = lower(trim(p_email))
    and o.deleted_at is null
  limit 1;
$$;

create or replace function public.vendor_performance(p_vendor uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_owner uuid;
  out jsonb;
begin
  select owner_id into v_owner from public.vendors where id = p_vendor;
  if not (public.is_admin(auth.uid()) or public.staff_can('vendors') or v_owner = auth.uid()) then
    raise exception 'Not allowed.';
  end if;
  select jsonb_build_object(
    'orders_total', count(*),
    'orders_delivered', count(*) filter (where status = 'delivered'),
    'orders_cancelled', count(*) filter (where status = 'cancelled'),
    'orders_returned', count(*) filter (where status = 'returned'),
    'orders_open', count(*) filter (where status not in ('delivered', 'cancelled', 'returned')),
    'delivered_sales', coalesce(sum(subtotal) filter (where status = 'delivered'), 0),
    'last_order_at', max(created_at),
    'active_products', (select count(*) from public.products where vendor_id = p_vendor and status = 'published')
  ) into out
  from public.orders where vendor_id = p_vendor and deleted_at is null;
  return out;
end;
$$;
