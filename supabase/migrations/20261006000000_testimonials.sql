-- Homepage testimonials, managed from the admin panel instead of hardcoded copy.
-- The section stays hidden until an admin turns it on and adds at least one.
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text,
  quote text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

drop policy if exists "testimonials_public_select" on public.testimonials;
create policy "testimonials_public_select"
  on public.testimonials for select
  using (is_active or public.is_admin(auth.uid()) or public.staff_can('testimonials'));

drop policy if exists "testimonials_admin_write" on public.testimonials;
create policy "testimonials_admin_write"
  on public.testimonials for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "testimonials_staff_all" on public.testimonials;
create policy "testimonials_staff_all"
  on public.testimonials for all
  using (public.staff_can('testimonials'))
  with check (public.staff_can('testimonials'));

alter table public.platform_settings
  add column if not exists show_testimonials boolean not null default false;
