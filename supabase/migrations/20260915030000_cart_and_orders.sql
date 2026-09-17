-- Module 5: Cart & Checkout
--
-- `orders`/`order_items` are front-loaded here (minimal shape) because the
-- `place_order` Edge Function needs somewhere to write — Module 6 (order
-- management screens) can extend these columns rather than redefine them.

create type public.order_status as enum (
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

create type public.payment_method as enum ('cod', 'card', 'jazzcash', 'easypaisa');

-- ── addresses ───────────────────────────────────────────────────────────────
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  address_line text not null,
  area text,
  city text not null default 'Karachi',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index addresses_customer_id_idx on public.addresses (customer_id);

alter table public.addresses enable row level security;

create policy "addresses_owner_all"
  on public.addresses for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "addresses_admin_all"
  on public.addresses for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── cart_items ──────────────────────────────────────────────────────────────
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (customer_id, product_id, variant_id)
);

create index cart_items_customer_id_idx on public.cart_items (customer_id);

alter table public.cart_items enable row level security;

create policy "cart_items_owner_all"
  on public.cart_items for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- ── orders ──────────────────────────────────────────────────────────────────
-- Split one order per vendor (matches the cart's per-vendor grouping and the
-- admin/vendor order tables' single "Vendor" column) — a checkout with items
-- from 2 vendors creates 2 order rows sharing a `checkout_group` id.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  checkout_group uuid not null default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.profiles (id),
  vendor_id uuid not null references public.vendors (id),
  address_id uuid references public.addresses (id),
  payment_method public.payment_method not null default 'cod',
  status public.order_status not null default 'pending',
  subtotal numeric(12, 2) not null,
  delivery_fee numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_vendor_id_idx on public.orders (vendor_id);
create index orders_checkout_group_idx on public.orders (checkout_group);

alter table public.orders enable row level security;

create policy "orders_customer_select"
  on public.orders for select
  using (customer_id = auth.uid());

create policy "orders_vendor_select"
  on public.orders for select
  using (exists (select 1 from public.vendors v where v.id = orders.vendor_id and v.owner_id = auth.uid()));

create policy "orders_vendor_update_status"
  on public.orders for update
  using (exists (select 1 from public.vendors v where v.id = orders.vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = orders.vendor_id and v.owner_id = auth.uid()));

create policy "orders_admin_all"
  on public.orders for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- No insert policy for customers/vendors on purpose: orders are only created
-- by the `place_order` Edge Function using the service-role key, so stock
-- checks and order creation stay atomic and server-side.

-- ── order_items ─────────────────────────────────────────────────────────────
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  variant_label text,
  unit_price numeric(12, 2) not null,
  quantity integer not null,
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

alter table public.order_items enable row level security;

create policy "order_items_customer_select"
  on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.customer_id = auth.uid()));

create policy "order_items_vendor_select"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      join public.vendors v on v.id = o.vendor_id
      where o.id = order_items.order_id and v.owner_id = auth.uid()
    )
  );

create policy "order_items_admin_all"
  on public.order_items for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
