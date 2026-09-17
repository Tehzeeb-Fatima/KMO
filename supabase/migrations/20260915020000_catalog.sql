-- Module 3: Product & Catalog

create type public.product_status as enum ('draft', 'published', 'pending', 'archived');

-- ── categories ──────────────────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

-- Categories are global platform taxonomy: everyone (including anonymous
-- visitors) can read them; only admins manage them.
create policy "categories_public_select"
  on public.categories for select
  using (true);

create policy "categories_admin_write"
  on public.categories for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── products ────────────────────────────────────────────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  price numeric(12, 2) not null,
  compare_at_price numeric(12, 2),
  sku text,
  stock_quantity integer not null default 0,
  status public.product_status not null default 'draft',
  search_vector tsvector,
  created_at timestamptz not null default now(),
  unique (vendor_id, slug)
);

create index products_vendor_id_idx on public.products (vendor_id);
create index products_category_id_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create index products_search_vector_idx on public.products using gin (search_vector);

alter table public.products enable row level security;

create policy "products_vendor_all"
  on public.products for all
  using (
    exists (
      select 1 from public.vendors v
      where v.id = products.vendor_id and v.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.vendors v
      where v.id = products.vendor_id and v.owner_id = auth.uid()
    )
  );

create policy "products_admin_all"
  on public.products for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Public/customers: only published products from approved, non-suspended vendors.
create policy "products_public_select"
  on public.products for select
  using (
    status = 'published'
    and exists (
      select 1 from public.vendors v
      where v.id = products.vendor_id and v.verification_status = 'approved'
    )
  );

-- ── product_images ──────────────────────────────────────────────────────────
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on public.product_images (product_id);

alter table public.product_images enable row level security;

create policy "product_images_vendor_all"
  on public.product_images for all
  using (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_images.product_id and v.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_images.product_id and v.owner_id = auth.uid()
    )
  );

create policy "product_images_admin_all"
  on public.product_images for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "product_images_public_select"
  on public.product_images for select
  using (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_images.product_id
        and pr.status = 'published'
        and v.verification_status = 'approved'
    )
  );

-- ── product_variants ────────────────────────────────────────────────────────
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  option_name text not null,
  option_value text not null,
  price_override numeric(12, 2),
  stock_quantity integer not null default 0,
  sku text,
  created_at timestamptz not null default now()
);

create index product_variants_product_id_idx on public.product_variants (product_id);

alter table public.product_variants enable row level security;

create policy "product_variants_vendor_all"
  on public.product_variants for all
  using (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_variants.product_id and v.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_variants.product_id and v.owner_id = auth.uid()
    )
  );

create policy "product_variants_admin_all"
  on public.product_variants for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "product_variants_public_select"
  on public.product_variants for select
  using (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_variants.product_id
        and pr.status = 'published'
        and v.verification_status = 'approved'
    )
  );

-- ── full-text search (Module 4 depends on this) ────────────────────────────
create or replace function public.products_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B');
  return new;
end;
$$;

create trigger products_search_vector_trigger
  before insert or update of name, description on public.products
  for each row execute function public.products_search_vector_update();

-- ── Storage: product images ────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

create policy "product_media_public_read"
  on storage.objects for select
  using (bucket_id = 'product-media');

-- Vendors can only write inside a folder named after one of their own
-- product ids: product-media/<product_id>/<file>
create policy "product_media_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'product-media'
    and exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where v.owner_id = auth.uid()
        and pr.id::text = (storage.foldername(name))[1]
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
        and pr.id::text = (storage.foldername(name))[1]
    )
  );
