-- ── notifications ────────────────────────────────────────────────────────
-- In-app notifications for the vendor and admin dashboards (orders, payments,
-- messages, product approvals, etc). Either recipient_id (a specific user) or
-- recipient_role (a broadcast to every admin) is set, never both.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles (id) on delete cascade,
  recipient_role text check (recipient_role in ('admin')),
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_target_check check (
    (recipient_id is not null and recipient_role is null)
    or (recipient_id is null and recipient_role is not null)
  )
);

create index notifications_recipient_id_idx on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_role_idx on public.notifications (recipient_role, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (
    recipient_id = auth.uid()
    or (
      recipient_role = 'admin'
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

create policy "notifications_update_own"
  on public.notifications for update
  using (
    recipient_id = auth.uid()
    or (
      recipient_role = 'admin'
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  )
  with check (
    recipient_id = auth.uid()
    or (
      recipient_role = 'admin'
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

-- Any signed-in user (including guests) can create a notification for someone
-- else — e.g. a customer messaging a vendor, or a vendor updating an order
-- status and notifying admin. Content is non-sensitive.
create policy "notifications_insert_authenticated"
  on public.notifications for insert
  with check (auth.uid() is not null);

-- ── couriers & rate slabs ───────────────────────────────────────────────

create table public.couriers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.couriers enable row level security;

create policy "couriers_public_select"
  on public.couriers for select
  using (true);

create policy "couriers_admin_write"
  on public.couriers for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

insert into public.couriers (name) values
  ('Leopards'),
  ('TRAX'),
  ('PostEx'),
  ('Courier Fast Service');

-- Weight-banded, per-city fee slabs. vendor_id null = platform default slab
-- for that courier + city; vendor_id set = an admin-assigned override for
-- that specific vendor (takes priority over the default when present).
create table public.courier_rate_slabs (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references public.couriers (id) on delete cascade,
  vendor_id uuid references public.vendors (id) on delete cascade,
  city text not null,
  min_weight_kg numeric not null,
  max_weight_kg numeric not null,
  fee numeric not null,
  tax_percent numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint courier_rate_slabs_weight_check check (max_weight_kg > min_weight_kg)
);

create index courier_rate_slabs_courier_id_idx on public.courier_rate_slabs (courier_id);
create index courier_rate_slabs_vendor_id_idx on public.courier_rate_slabs (vendor_id);

alter table public.courier_rate_slabs enable row level security;

create policy "courier_rate_slabs_public_select"
  on public.courier_rate_slabs for select
  using (true);

create policy "courier_rate_slabs_admin_write"
  on public.courier_rate_slabs for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

alter table public.vendors add column preferred_courier_id uuid references public.couriers (id);
