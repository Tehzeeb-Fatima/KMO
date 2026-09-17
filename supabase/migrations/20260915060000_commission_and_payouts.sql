-- Module 9: Commission & Vendor Payouts

-- Global default commission %, overridable per vendor (vendors.commission_rate)
-- and per category (categories.commission_rate); null means "use the default".
create table public.platform_settings (
  id boolean primary key default true,
  default_commission_rate numeric(5, 2) not null default 8,
  delivery_zones jsonb not null default '["Karachi"]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint platform_settings_singleton check (id)
);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

create policy "platform_settings_public_select"
  on public.platform_settings for select
  using (true);

create policy "platform_settings_admin_write"
  on public.platform_settings for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

alter table public.vendors add column if not exists commission_rate numeric(5, 2);
alter table public.categories add column if not exists commission_rate numeric(5, 2);
alter table public.vendors add column if not exists preferred_courier text;

-- ── payouts ─────────────────────────────────────────────────────────────────
create type public.payout_status as enum ('pending', 'paid');

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  amount numeric(12, 2) not null,
  status public.payout_status not null default 'pending',
  transaction_reference text,
  notes text,
  payout_date date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index payouts_vendor_id_idx on public.payouts (vendor_id);

alter table public.payouts enable row level security;

create policy "payouts_vendor_select"
  on public.payouts for select
  using (exists (select 1 from public.vendors v where v.id = payouts.vendor_id and v.owner_id = auth.uid()));

create policy "payouts_admin_all"
  on public.payouts for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

alter table public.orders
  add constraint orders_payout_id_fkey foreign key (payout_id) references public.payouts (id) on delete set null;
