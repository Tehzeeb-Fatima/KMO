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

-- Public read (reviews are shown on the public PDP) — moderation hides
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

-- Vendors may only touch the reply fields — enforced at the application
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

-- ── wishlist_items ──────────────────────────────────────────────────────────
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
