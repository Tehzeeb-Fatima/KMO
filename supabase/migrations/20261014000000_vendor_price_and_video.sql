-- 1) Vendor price: what KMO pays the vendor for a product KMO lists on their
--    behalf. Kept in its own tables so vendors (who can read their products
--    and order items) never see it — only the super admin can.
-- 2) Product video: an optional MP4 per product, public like the photos.

create table if not exists public.product_costs (
  product_id uuid primary key references public.products (id) on delete cascade,
  vendor_price numeric(12, 2) not null check (vendor_price >= 0),
  updated_at timestamptz not null default now()
);
alter table public.product_costs enable row level security;
create policy "product_costs_super_admin_all" on public.product_costs for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Snapshot per order line, written by place_order (service key) when a vendor price exists.
create table if not exists public.order_item_costs (
  order_item_id uuid primary key references public.order_items (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  vendor_unit_price numeric(12, 2) not null,
  unit_price numeric(12, 2) not null,
  quantity integer not null,
  margin_amount numeric(12, 2) not null,
  created_at timestamptz not null default now()
);
alter table public.order_item_costs enable row level security;
create index if not exists order_item_costs_order_idx on public.order_item_costs (order_id);
create policy "order_item_costs_super_admin_select" on public.order_item_costs for select to authenticated
  using (public.is_super_admin());

-- Bookkeeping: KMO margin on delivered orders, by month (Karachi time).
create or replace function public.bk_margin_summary(p_session text)
returns table (month date, delivered_orders bigint, sales numeric, vendor_cost numeric, margin numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.bk_person(p_session);
  return query
    select date_trunc('month', o.created_at at time zone 'Asia/Karachi')::date,
           count(distinct o.id),
           sum(c.unit_price * c.quantity),
           sum(c.vendor_unit_price * c.quantity),
           sum(c.margin_amount)
    from public.order_item_costs c
    join public.orders o on o.id = c.order_id
    where o.status = 'delivered'
    group by 1
    order by 1 desc;
end;
$$;
revoke all on function public.bk_margin_summary(text) from public;
grant execute on function public.bk_margin_summary(text) to authenticated;

-- Video
alter table public.products add column if not exists video_url text;
