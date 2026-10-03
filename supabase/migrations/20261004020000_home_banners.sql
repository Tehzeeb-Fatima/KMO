-- Homepage banner slider images, managed by the super admin.
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  link_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.banners enable row level security;

create policy "banners_public_select"
  on public.banners for select
  using (is_active or public.is_admin(auth.uid()));

create policy "banners_admin_write"
  on public.banners for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
