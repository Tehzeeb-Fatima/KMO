-- Module 1: Auth & Role Management
-- Run this in the Supabase SQL Editor (Project: igjrtfgnlvepemdehbdn), or via
-- `supabase db push` once the CLI is logged into this project.

-- ── profiles ────────────────────────────────────────────────────────────────
create type public.user_role as enum ('customer', 'vendor', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  -- Vendors are pending (dashboard locked / storefront hidden) until an admin
  -- approves them in Module 2 (see vendors.verification_status).
  pending_vendor boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Customers/vendors/admins can all read + update their own profile row.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- Admins have full read/write access to every profile.
create policy "profiles_admin_all"
  on public.profiles for all
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

-- ── auto-create a profile row whenever a new auth.users row appears ─────────
-- Role/full_name/phone/pending_vendor are read from the signup call's
-- `options.data` (raw_user_meta_data), e.g.:
--   supabase.auth.signUp({ email, password, options: { data: { full_name, role, pending_vendor } } })
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role, pending_vendor)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'customer'),
    coalesce((new.raw_user_meta_data ->> 'pending_vendor')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
