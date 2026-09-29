-- Lets an admin scope a promotion to specific products (one or many, across
-- any vendor) instead of only "all of a vendor" / "all of a category". When a
-- promotion has rows here, that becomes the sole match rule for it — the
-- product page and checkout both use this list as the single source of truth
-- for what discount actually applies, instead of a vendor's own unrelated
-- compare_at_price field.

create table if not exists public.promotion_products (
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (promotion_id, product_id)
);

create index if not exists promotion_products_product_idx
  on public.promotion_products (product_id);

alter table public.promotion_products enable row level security;

-- Same visibility rule as the promotion itself: only rows belonging to a
-- promotion that's live right now are public.
drop policy if exists "promotion_products_public_select" on public.promotion_products;
create policy "promotion_products_public_select"
  on public.promotion_products for select
  using (
    exists (
      select 1 from public.promotions p
      where p.id = promotion_products.promotion_id
        and p.is_active and p.starts_at <= now() and p.ends_at > now()
    )
  );

drop policy if exists "promotion_products_admin_all" on public.promotion_products;
create policy "promotion_products_admin_all"
  on public.promotion_products for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
