-- Module 11: Returns, Module 12: Coupons/Promotions

create type public.return_status as enum (
  'requested',
  'approved',
  'rejected',
  'processing',
  'resolved'
);

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid references public.order_items (id) on delete set null,
  customer_id uuid not null references public.profiles (id),
  reason text not null,
  status public.return_status not null default 'requested',
  admin_notes text,
  created_at timestamptz not null default now()
);

create index returns_order_id_idx on public.returns (order_id);
create index returns_customer_id_idx on public.returns (customer_id);

alter table public.returns enable row level security;

create policy "returns_customer_select_own"
  on public.returns for select
  using (customer_id = auth.uid());

create policy "returns_customer_insert"
  on public.returns for insert
  with check (
    customer_id = auth.uid()
    and exists (select 1 from public.orders o where o.id = returns.order_id and o.customer_id = auth.uid())
  );

create policy "returns_vendor_select"
  on public.returns for select
  using (
    exists (
      select 1 from public.orders o
      join public.vendors v on v.id = o.vendor_id
      where o.id = returns.order_id and v.owner_id = auth.uid()
    )
  );

-- Returns are managed by KMO, not vendors (PRD §10) — only admins can change status.
create policy "returns_admin_all"
  on public.returns for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── coupons ─────────────────────────────────────────────────────────────────
create type public.discount_type as enum ('percentage', 'fixed');
create type public.coupon_status as enum ('active', 'disabled');

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  code text not null,
  description text,
  discount_type public.discount_type not null default 'percentage',
  amount numeric(12, 2) not null,
  expires_at date,
  status public.coupon_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (vendor_id, code)
);

create index coupons_vendor_id_idx on public.coupons (vendor_id);

alter table public.coupons enable row level security;

create policy "coupons_vendor_all"
  on public.coupons for all
  using (exists (select 1 from public.vendors v where v.id = coupons.vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = coupons.vendor_id and v.owner_id = auth.uid()));

create policy "coupons_admin_all"
  on public.coupons for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Public/customers: read active, unexpired coupons only (needed to validate
-- a code at checkout).
create policy "coupons_public_select_active"
  on public.coupons for select
  using (status = 'active' and (expires_at is null or expires_at >= current_date));
