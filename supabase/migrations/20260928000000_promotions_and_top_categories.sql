-- Homepage additions:
--   1. `top_categories()` — ranks categories by how much they actually sell, so
--      the homepage can lead with the busiest ones instead of a hardcoded list.
--   2. `promotions` — admin-managed deals with a countdown, each optionally
--      scoped to a vendor and/or category.

/* ── top categories ─────────────────────────────────────────────────────────
   security definer because order_items is RLS-locked to each customer's own
   orders — an anonymous visitor would otherwise count zero sales everywhere.
   Only aggregate counts leave the function, never any order or buyer detail. */
create or replace function public.top_categories(limit_count integer default 3)
returns table (
  id uuid,
  name text,
  slug text,
  image_url text,
  sold_count bigint,
  product_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.slug,
    c.image_url,
    coalesce(sum(oi.quantity), 0)::bigint as sold_count,
    count(distinct p.id)::bigint as product_count
  from categories c
  join products p on p.category_id = c.id and p.status = 'published'
  join vendors v on v.id = p.vendor_id and v.verification_status = 'approved'
  left join order_items oi on oi.product_id = p.id
  group by c.id, c.name, c.slug, c.image_url
  order by sold_count desc, product_count desc, c.name
  limit greatest(1, least(coalesce(limit_count, 3), 12));
$$;

grant execute on function public.top_categories(integer) to anon, authenticated;

/* ── promotions ─────────────────────────────────────────────────────────── */

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  vendor_id uuid references public.vendors (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  -- 'percentage' → discount_value is the % off.
  -- 'fixed'      → discount_value is the sale price in rupees.
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint promotions_window_check check (ends_at > starts_at)
);

create index if not exists promotions_window_idx
  on public.promotions (is_active, starts_at, ends_at);

alter table public.promotions enable row level security;

-- Only deals that are live *right now* are public. Without the window check a
-- visitor could read an upcoming promotion's pricing straight off the API
-- before it launches. Admins still see everything via the policy below.
drop policy if exists "promotions_public_select" on public.promotions;
create policy "promotions_public_select"
  on public.promotions for select
  using (is_active and starts_at <= now() and ends_at > now());

drop policy if exists "promotions_admin_all" on public.promotions;
create policy "promotions_admin_all"
  on public.promotions for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

/* ── promotion images ───────────────────────────────────────────────────── */

insert into storage.buckets (id, name, public)
values ('promotion-media', 'promotion-media', true)
on conflict (id) do nothing;

drop policy if exists "promotion_media_public_select" on storage.objects;
create policy "promotion_media_public_select"
  on storage.objects for select
  using (bucket_id = 'promotion-media');

drop policy if exists "promotion_media_admin_write" on storage.objects;
create policy "promotion_media_admin_write"
  on storage.objects for insert
  with check (
    bucket_id = 'promotion-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "promotion_media_admin_update" on storage.objects;
create policy "promotion_media_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'promotion-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "promotion_media_admin_delete" on storage.objects;
create policy "promotion_media_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'promotion-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
