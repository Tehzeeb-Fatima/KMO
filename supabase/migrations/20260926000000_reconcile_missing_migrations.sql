-- Reconciles three earlier migrations that were never actually applied to the
-- live project (found by diffing information_schema/pg_policies against the
-- migration files):
--   20260921000000  product_categories + product-media storage RLS fix
--   20260922000000  categories.image_url + category-media bucket
--   20260922010000  vendor_follows
-- Written idempotently so it is safe to run on any partially-applied state.

/* ── 1. product-media storage RLS ──────────────────────────────────────────
   The original owner policies compared (storage.foldername(name))[1] as text
   against products.id; live testing showed that never matched for a real
   vendor token. split_part(...)::uuid compares uuid = uuid instead. Admins
   had no insert/delete policy at all, so admin image upload was impossible. */

drop policy if exists "product_media_owner_write" on storage.objects;
create policy "product_media_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'product-media'
    and exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where v.owner_id = auth.uid()
        and pr.id = (split_part(storage.objects.name, '/', 1))::uuid
    )
  );

drop policy if exists "product_media_owner_delete" on storage.objects;
create policy "product_media_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-media'
    and exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where v.owner_id = auth.uid()
        and pr.id = (split_part(storage.objects.name, '/', 1))::uuid
    )
  );

drop policy if exists "product_media_admin_write" on storage.objects;
create policy "product_media_admin_write"
  on storage.objects for insert
  with check (
    bucket_id = 'product-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "product_media_admin_delete" on storage.objects;
create policy "product_media_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

/* ── 2. product_categories (a product in more than one category) ────────── */

create table if not exists public.product_categories (
  product_id uuid not null references public.products (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create index if not exists product_categories_category_id_idx
  on public.product_categories (category_id);

alter table public.product_categories enable row level security;

drop policy if exists "product_categories_vendor_all" on public.product_categories;
create policy "product_categories_vendor_all"
  on public.product_categories for all
  using (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_categories.product_id and v.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_categories.product_id and v.owner_id = auth.uid()
    )
  );

drop policy if exists "product_categories_admin_all" on public.product_categories;
create policy "product_categories_admin_all"
  on public.product_categories for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "product_categories_public_select" on public.product_categories;
create policy "product_categories_public_select"
  on public.product_categories for select
  using (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_categories.product_id
        and pr.status = 'published'
        and v.verification_status = 'approved'
    )
  );

/* ── 3. category images ────────────────────────────────────────────────── */

alter table public.categories add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('category-media', 'category-media', true)
on conflict (id) do nothing;

drop policy if exists "category_media_public_select" on storage.objects;
create policy "category_media_public_select"
  on storage.objects for select
  using (bucket_id = 'category-media');

drop policy if exists "category_media_admin_write" on storage.objects;
create policy "category_media_admin_write"
  on storage.objects for insert
  with check (
    bucket_id = 'category-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "category_media_admin_update" on storage.objects;
create policy "category_media_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'category-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "category_media_admin_delete" on storage.objects;
create policy "category_media_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'category-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

/* ── 4. vendor_follows (customer follows a store) ──────────────────────── */

create table if not exists public.vendor_follows (
  customer_id uuid not null references public.profiles (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, vendor_id)
);

create index if not exists vendor_follows_vendor_id_idx
  on public.vendor_follows (vendor_id);

alter table public.vendor_follows enable row level security;

drop policy if exists "vendor_follows_owner_all" on public.vendor_follows;
create policy "vendor_follows_owner_all"
  on public.vendor_follows for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());
