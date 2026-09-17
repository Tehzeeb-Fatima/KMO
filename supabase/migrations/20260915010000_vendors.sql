-- Module 2: Vendor & Store Management

create extension if not exists pgcrypto;

create type public.vendor_verification_status as enum (
  'pending',
  'approved',
  'rejected',
  'suspended'
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  store_name text not null,
  slug text not null unique,
  logo_url text,
  cover_url text,
  description text,
  phone text,
  address text,
  area text,
  verification_status public.vendor_verification_status not null default 'pending',
  is_on_vacation boolean not null default false,
  vacation_message text,
  -- shipping policy, refund policy, etc: { "shipping": "...", "refunds": "..." }
  policies jsonb not null default '{}'::jsonb,
  -- { "mon": {"open":"09:00","close":"21:00","closed":false}, ... }
  business_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index vendors_owner_id_key on public.vendors (owner_id);
create index vendors_verification_status_idx on public.vendors (verification_status);

alter table public.vendors enable row level security;

-- Vendor owner: read/update their own store row.
create policy "vendors_owner_select"
  on public.vendors for select
  using (owner_id = auth.uid());

create policy "vendors_owner_update"
  on public.vendors for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "vendors_owner_insert"
  on public.vendors for insert
  with check (owner_id = auth.uid());

-- Admins: full access.
create policy "vendors_admin_all"
  on public.vendors for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Customers (and anyone, including anonymous visitors): read approved,
-- non-suspended vendors only. This is what powers the public storefront page.
create policy "vendors_public_select_approved"
  on public.vendors for select
  using (verification_status = 'approved');

-- ── Storage: vendor logos/covers ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('vendor-media', 'vendor-media', true)
on conflict (id) do nothing;

create policy "vendor_media_public_read"
  on storage.objects for select
  using (bucket_id = 'vendor-media');

-- Vendors can only write inside a folder named after their own vendor id:
-- vendor-media/<vendor_id>/logo.jpg, vendor-media/<vendor_id>/cover.jpg
create policy "vendor_media_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'vendor-media'
    and exists (
      select 1 from public.vendors v
      where v.owner_id = auth.uid()
        and v.id::text = (storage.foldername(name))[1]
    )
  );

create policy "vendor_media_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'vendor-media'
    and exists (
      select 1 from public.vendors v
      where v.owner_id = auth.uid()
        and v.id::text = (storage.foldername(name))[1]
    )
  );

create policy "vendor_media_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'vendor-media'
    and exists (
      select 1 from public.vendors v
      where v.owner_id = auth.uid()
        and v.id::text = (storage.foldername(name))[1]
    )
  );
