-- 1. Fix vendor product-image uploads failing RLS.
--
-- The original product_media_owner_write/delete policies parsed the
-- storage path with storage.foldername(name)[1] and compared it as text
-- to products.id::text inside a join to vendors. Live testing (service-role
-- upload succeeded, the same vendor's own token got "new row violates
-- row-level security policy" on insert) confirms this check was never
-- actually matching for a real vendor upload. Rewritten with split_part
-- and a direct uuid comparison, which is unambiguous. Also adds admin
-- write/delete access, since the new admin "add product" screen uploads
-- images for products it doesn't own.

drop policy if exists "product_media_owner_write" on storage.objects;
drop policy if exists "product_media_owner_delete" on storage.objects;

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

create policy "product_media_admin_write"
  on storage.objects for insert
  with check (
    bucket_id = 'product-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "product_media_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 2. Let a product belong to more than one of the vendor's assigned
-- categories. products.category_id stays as the "primary" category (every
-- existing query - search filters, the admin moderation list, sitemap -
-- keeps working unchanged); this table adds the rest, and the product
-- form now writes both.
create table public.product_categories (
  product_id uuid not null references public.products (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create index product_categories_category_id_idx on public.product_categories (category_id);

alter table public.product_categories enable row level security;

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

create policy "product_categories_admin_all"
  on public.product_categories for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

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
