-- ============================================================
-- FILE: 20260915000000_profiles_and_auth.sql
-- ============================================================
-- Module 1: Auth & Role Management
-- Run this in the Supabase SQL Editor (Project: igjrtfgnlvepemdehbdn), or via
-- `supabase db push` once the CLI is logged into this project.

-- â”€â”€ profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ auto-create a profile row whenever a new auth.users row appears â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- ============================================================
-- FILE: 20260915010000_vendors.sql
-- ============================================================
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

-- â”€â”€ Storage: vendor logos/covers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- ============================================================
-- FILE: 20260915020000_catalog.sql
-- ============================================================
-- Module 3: Product & Catalog

create type public.product_status as enum ('draft', 'published', 'pending', 'archived');

-- â”€â”€ categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ product_images â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ product_variants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ full-text search (Module 4 depends on this) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ Storage: product images â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- ============================================================
-- FILE: 20260915030000_cart_and_orders.sql
-- ============================================================
-- Module 5: Cart & Checkout
--
-- `orders`/`order_items` are front-loaded here (minimal shape) because the
-- `place_order` Edge Function needs somewhere to write â€” Module 6 (order
-- management screens) can extend these columns rather than redefine them.

create type public.order_status as enum (
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

create type public.payment_method as enum ('cod', 'card', 'jazzcash', 'easypaisa');

-- â”€â”€ addresses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  address_line text not null,
  area text,
  city text not null default 'Karachi',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index addresses_customer_id_idx on public.addresses (customer_id);

alter table public.addresses enable row level security;

create policy "addresses_owner_all"
  on public.addresses for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "addresses_admin_all"
  on public.addresses for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- â”€â”€ cart_items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (customer_id, product_id, variant_id)
);

create index cart_items_customer_id_idx on public.cart_items (customer_id);

alter table public.cart_items enable row level security;

create policy "cart_items_owner_all"
  on public.cart_items for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- â”€â”€ orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Split one order per vendor (matches the cart's per-vendor grouping and the
-- admin/vendor order tables' single "Vendor" column) â€” a checkout with items
-- from 2 vendors creates 2 order rows sharing a `checkout_group` id.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  checkout_group uuid not null default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.profiles (id),
  vendor_id uuid not null references public.vendors (id),
  address_id uuid references public.addresses (id),
  payment_method public.payment_method not null default 'cod',
  status public.order_status not null default 'pending',
  subtotal numeric(12, 2) not null,
  delivery_fee numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_vendor_id_idx on public.orders (vendor_id);
create index orders_checkout_group_idx on public.orders (checkout_group);

alter table public.orders enable row level security;

create policy "orders_customer_select"
  on public.orders for select
  using (customer_id = auth.uid());

create policy "orders_vendor_select"
  on public.orders for select
  using (exists (select 1 from public.vendors v where v.id = orders.vendor_id and v.owner_id = auth.uid()));

create policy "orders_vendor_update_status"
  on public.orders for update
  using (exists (select 1 from public.vendors v where v.id = orders.vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = orders.vendor_id and v.owner_id = auth.uid()));

create policy "orders_admin_all"
  on public.orders for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- No insert policy for customers/vendors on purpose: orders are only created
-- by the `place_order` Edge Function using the service-role key, so stock
-- checks and order creation stay atomic and server-side.

-- â”€â”€ order_items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  variant_label text,
  unit_price numeric(12, 2) not null,
  quantity integer not null,
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

alter table public.order_items enable row level security;

create policy "order_items_customer_select"
  on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.customer_id = auth.uid()));

create policy "order_items_vendor_select"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      join public.vendors v on v.id = o.vendor_id
      where o.id = order_items.order_id and v.owner_id = auth.uid()
    )
  );

create policy "order_items_admin_all"
  on public.order_items for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));


-- ============================================================
-- FILE: 20260915040000_seed_categories.sql
-- ============================================================
-- Seeds the 13 categories used in the design mockups' "Browse categories" grid
-- and header tabs, so the vendor product form / admin categories list / search
-- filters have real options instead of an empty table.

insert into public.categories (name, slug) values
  ('Electronics', 'electronics'),
  ('Men''s Fashion', 'mens-fashion'),
  ('Women''s Fashion', 'womens-fashion'),
  ('Kids'' Fashion', 'kids-fashion'),
  ('Beauty & Personal Care', 'beauty-personal-care'),
  ('Home & Living', 'home-living'),
  ('Groceries & Essentials', 'groceries-essentials'),
  ('Appliances', 'appliances'),
  ('Sports & Outdoors', 'sports-outdoors'),
  ('Books & Stationery', 'books-stationery'),
  ('Toys & Baby', 'toys-baby'),
  ('Automotive', 'automotive'),
  ('Jewellery & Watches', 'jewellery-watches')
on conflict (slug) do nothing;


-- ============================================================
-- FILE: 20260915050000_order_status_and_commission.sql
-- ============================================================
-- Module 6/9: full order status lifecycle (PRD Â§11) + commission snapshot (PRD Â§8)

alter type public.order_status add value if not exists 'confirmed' before 'processing';
alter type public.order_status add value if not exists 'ready_to_ship' after 'processing';
alter type public.order_status add value if not exists 'out_for_delivery' after 'shipped';
alter type public.order_status add value if not exists 'returned';

-- Historical orders must retain the commission rate applicable at the time
-- of sale (PRD Â§8) â€” snapshot it onto the order row at creation time rather
-- than always reading the vendor's current rate.
alter table public.orders
  add column if not exists commission_rate numeric(5, 2) not null default 8,
  add column if not exists commission_amount numeric(12, 2) not null default 0,
  add column if not exists net_amount numeric(12, 2) not null default 0,
  add column if not exists payout_id uuid;


-- ============================================================
-- FILE: 20260915060000_commission_and_payouts.sql
-- ============================================================
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

-- â”€â”€ payouts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- ============================================================
-- FILE: 20260915070000_reviews_and_wishlist.sql
-- ============================================================
-- Module 7: Reviews & Ratings, Module 8: Wishlist

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  order_item_id uuid references public.order_items (id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  body text,
  vendor_reply text,
  vendor_reply_at timestamptz,
  is_flagged boolean not null default false,
  flag_reason text,
  created_at timestamptz not null default now(),
  unique (product_id, customer_id)
);

create index reviews_product_id_idx on public.reviews (product_id);

alter table public.reviews enable row level security;

-- Public read (reviews are shown on the public PDP) â€” moderation hides
-- flagged reviews from everyone except their author, the product's vendor,
-- and admins.
create policy "reviews_public_select"
  on public.reviews for select
  using (not is_flagged);

create policy "reviews_customer_select_own"
  on public.reviews for select
  using (customer_id = auth.uid());

create policy "reviews_customer_insert"
  on public.reviews for insert
  with check (customer_id = auth.uid());

create policy "reviews_customer_update_own"
  on public.reviews for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "reviews_vendor_select"
  on public.reviews for select
  using (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = reviews.product_id and v.owner_id = auth.uid()
    )
  );

-- Vendors may only touch the reply fields â€” enforced at the application
-- layer (the vendor API only ever sends vendor_reply/vendor_reply_at) since
-- Postgres RLS can't restrict which columns an UPDATE touches.
create policy "reviews_vendor_reply"
  on public.reviews for update
  using (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = reviews.product_id and v.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = reviews.product_id and v.owner_id = auth.uid()
    )
  );

create policy "reviews_admin_all"
  on public.reviews for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- â”€â”€ wishlist_items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create index wishlist_items_customer_id_idx on public.wishlist_items (customer_id);

alter table public.wishlist_items enable row level security;

create policy "wishlist_items_owner_all"
  on public.wishlist_items for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());


-- ============================================================
-- FILE: 20260915080000_returns_and_coupons.sql
-- ============================================================
-- Module 11: Returns, Module 12: Coupons/Promotions

create type public.return_status as enum (
  'requested',
  'approved',
  'rejected',
  'processing',
  'resolved'
);

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid references public.order_items (id) on delete set null,
  customer_id uuid not null references public.profiles (id),
  reason text not null,
  status public.return_status not null default 'requested',
  admin_notes text,
  created_at timestamptz not null default now()
);

create index returns_order_id_idx on public.returns (order_id);
create index returns_customer_id_idx on public.returns (customer_id);

alter table public.returns enable row level security;

create policy "returns_customer_select_own"
  on public.returns for select
  using (customer_id = auth.uid());

create policy "returns_customer_insert"
  on public.returns for insert
  with check (
    customer_id = auth.uid()
    and exists (select 1 from public.orders o where o.id = returns.order_id and o.customer_id = auth.uid())
  );

create policy "returns_vendor_select"
  on public.returns for select
  using (
    exists (
      select 1 from public.orders o
      join public.vendors v on v.id = o.vendor_id
      where o.id = returns.order_id and v.owner_id = auth.uid()
    )
  );

-- Returns are managed by KMO, not vendors (PRD Â§10) â€” only admins can change status.
create policy "returns_admin_all"
  on public.returns for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- â”€â”€ coupons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create type public.discount_type as enum ('percentage', 'fixed');
create type public.coupon_status as enum ('active', 'disabled');

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  code text not null,
  description text,
  discount_type public.discount_type not null default 'percentage',
  amount numeric(12, 2) not null,
  expires_at date,
  status public.coupon_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (vendor_id, code)
);

create index coupons_vendor_id_idx on public.coupons (vendor_id);

alter table public.coupons enable row level security;

create policy "coupons_vendor_all"
  on public.coupons for all
  using (exists (select 1 from public.vendors v where v.id = coupons.vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = coupons.vendor_id and v.owner_id = auth.uid()));

create policy "coupons_admin_all"
  on public.coupons for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Public/customers: read active, unexpired coupons only (needed to validate
-- a code at checkout).
create policy "coupons_public_select_active"
  on public.coupons for select
  using (status = 'active' and (expires_at is null or expires_at >= current_date));


-- ============================================================
-- FILE: 20260915090000_gap_fill.sql
-- ============================================================
-- Fills gaps flagged after Modules 1-15: coupon-at-checkout tracking, richer
-- product fields (brand/tags/weight/SEO/low-stock), admin audit logs,
-- vendor<->customer messaging, and a persisted contact form.

-- â”€â”€ coupons applied at checkout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists discount_amount numeric(12, 2) not null default 0;

-- â”€â”€ richer product fields (PRD Â§5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table public.products
  add column if not exists brand text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists weight_grams integer,
  add column if not exists low_stock_threshold integer not null default 15,
  add column if not exists seo_title text,
  add column if not exists seo_description text;

-- â”€â”€ audit_logs (admin actions) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id),
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

create policy "audit_logs_admin_select"
  on public.audit_logs for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "audit_logs_admin_insert"
  on public.audit_logs for insert
  with check (
    actor_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- â”€â”€ messaging (vendor <-> customer) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, vendor_id)
);

alter table public.conversations enable row level security;

create policy "conversations_customer_all"
  on public.conversations for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "conversations_vendor_all"
  on public.conversations for all
  using (exists (select 1 from public.vendors v where v.id = conversations.vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = conversations.vendor_id and v.owner_id = auth.uid()));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id);

alter table public.messages enable row level security;

create policy "messages_participant_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      left join public.vendors v on v.id = c.vendor_id
      where c.id = messages.conversation_id
        and (c.customer_id = auth.uid() or v.owner_id = auth.uid())
    )
  );

create policy "messages_participant_insert"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      left join public.vendors v on v.id = c.vendor_id
      where c.id = messages.conversation_id
        and (c.customer_id = auth.uid() or v.owner_id = auth.uid())
    )
  );

create policy "messages_participant_update_read"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      left join public.vendors v on v.id = c.vendor_id
      where c.id = messages.conversation_id
        and (c.customer_id = auth.uid() or v.owner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      left join public.vendors v on v.id = c.vendor_id
      where c.id = messages.conversation_id
        and (c.customer_id = auth.uid() or v.owner_id = auth.uid())
    )
  );

-- â”€â”€ contact form submissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Anyone (including a signed-out visitor) can submit the contact form.
create policy "contact_messages_public_insert"
  on public.contact_messages for insert
  with check (true);

create policy "contact_messages_admin_select"
  on public.contact_messages for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "contact_messages_admin_update"
  on public.contact_messages for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));


-- ============================================================
-- FILE: 20260916000000_product_questions.sql
-- ============================================================
-- PDP "Questions" tab (Karachi Mart Online - Desktop.html): customers ask a
-- question on a product, the vendor answers it â€” distinct from reviews.

create table public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  question text not null,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index product_questions_product_id_idx on public.product_questions (product_id);

alter table public.product_questions enable row level security;

create policy "product_questions_public_select"
  on public.product_questions for select
  using (true);

create policy "product_questions_customer_insert"
  on public.product_questions for insert
  with check (customer_id = auth.uid());

create policy "product_questions_vendor_answer"
  on public.product_questions for update
  using (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_questions.product_id and v.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_questions.product_id and v.owner_id = auth.uid()
    )
  );

create policy "product_questions_admin_all"
  on public.product_questions for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));


-- ============================================================
-- FILE: 20260916010000_fix_rls_recursion.sql
-- ============================================================
-- CRITICAL FIX: every "is this user an admin?" RLS policy checked by running
-- `exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')`
-- directly inside a policy ON public.profiles itself (profiles_admin_all).
-- Postgres has to re-apply profiles' own RLS to evaluate that subquery, which
-- re-triggers the same policy â€” infinite recursion (42P17) â€” and since almost
-- every other table's admin policy also queries profiles, this one bug broke
-- reads/writes on nearly every table in the schema.
--
-- Fix: a SECURITY DEFINER helper function. Functions created here are owned
-- by the migration-running role (postgres), which has BYPASSRLS in Supabase,
-- so the query inside the function skips RLS entirely instead of recursing.

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

create or replace function public.get_user_role(uid uuid)
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = uid;
$$;

-- â”€â”€ profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = public.get_user_role(auth.uid()));

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ vendors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "vendors_admin_all" on public.vendors;
create policy "vendors_admin_all"
  on public.vendors for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write"
  on public.categories for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all"
  on public.products for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ product_images â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "product_images_admin_all" on public.product_images;
create policy "product_images_admin_all"
  on public.product_images for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ product_variants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "product_variants_admin_all" on public.product_variants;
create policy "product_variants_admin_all"
  on public.product_variants for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ addresses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "addresses_admin_all" on public.addresses;
create policy "addresses_admin_all"
  on public.addresses for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all"
  on public.orders for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ order_items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all"
  on public.order_items for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ platform_settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "platform_settings_admin_write" on public.platform_settings;
create policy "platform_settings_admin_write"
  on public.platform_settings for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ payouts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "payouts_admin_all" on public.payouts;
create policy "payouts_admin_all"
  on public.payouts for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ reviews â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "reviews_admin_all" on public.reviews;
create policy "reviews_admin_all"
  on public.reviews for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ returns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "returns_admin_all" on public.returns;
create policy "returns_admin_all"
  on public.returns for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ coupons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all"
  on public.coupons for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ audit_logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select"
  on public.audit_logs for select
  using (public.is_admin(auth.uid()));

drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
create policy "audit_logs_admin_insert"
  on public.audit_logs for insert
  with check (actor_id = auth.uid() and public.is_admin(auth.uid()));

-- â”€â”€ contact_messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "contact_messages_admin_select" on public.contact_messages;
create policy "contact_messages_admin_select"
  on public.contact_messages for select
  using (public.is_admin(auth.uid()));

drop policy if exists "contact_messages_admin_update" on public.contact_messages;
create policy "contact_messages_admin_update"
  on public.contact_messages for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- â”€â”€ product_questions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "product_questions_admin_all" on public.product_questions;
create policy "product_questions_admin_all"
  on public.product_questions for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));


-- ============================================================
-- FILE: 20260918000000_vendor_signup_provisioning.sql
-- ============================================================
-- Vendor signup gap-fill: the vendor app's /signup form (apps/vendor/src/pages/signup-page.tsx)
-- calls supabase.auth.signUp() with store metadata (store_name, area, phone), but nothing
-- ever inserted a row into public.vendors â€” a freshly-signed-up vendor had a profiles row
-- (role='vendor', pending_vendor=true) with no matching vendors row, so getMyVendor() would
-- return null forever even after admin approval.
--
-- Email confirmation is ON for this project (mailer_autoconfirm=false), so signUp() never
-- returns a live session client-side â€” a client-side insert governed by the
-- `vendors_owner_insert` RLS policy (owner_id = auth.uid()) can't run at signup time. The
-- fix has to happen server-side, in the same SECURITY DEFINER trigger that already creates
-- the profiles row on auth.users insert, so it works regardless of confirmation state.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_store_name text;
  v_base_slug text;
  v_slug text;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'customer');

  insert into public.profiles (id, full_name, phone, role, pending_vendor)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    v_role,
    coalesce((new.raw_user_meta_data ->> 'pending_vendor')::boolean, false)
  );

  if v_role = 'vendor' then
    v_store_name := nullif(trim(new.raw_user_meta_data ->> 'store_name'), '');
    if v_store_name is not null then
      v_base_slug := trim(both '-' from lower(regexp_replace(v_store_name, '[^a-zA-Z0-9]+', '-', 'g')));
      if v_base_slug = '' or v_base_slug is null then
        v_base_slug := 'store';
      end if;
      -- new.id is always unique, so appending its first 8 hex chars guarantees a unique
      -- slug even when two applicants pick the same store name.
      v_slug := v_base_slug || '-' || substr(replace(new.id::text, '-', ''), 1, 8);

      insert into public.vendors (owner_id, store_name, slug, phone, area, verification_status)
      values (
        new.id,
        v_store_name,
        v_slug,
        coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
        nullif(trim(new.raw_user_meta_data ->> 'area'), ''),
        'pending'
      );
    end if;
  end if;

  return new;
end;
$$;



