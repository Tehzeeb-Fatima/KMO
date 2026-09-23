-- Optional 360° product view: 8 photos taken around the product, played back
-- as an interactive spin on the product detail page. Kept in its own table so
-- the normal `product_images` gallery is completely untouched.

alter table public.products add column has_360_view boolean not null default false;

create table public.product_360_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- 1 = Front, 2 = Front Right, 3 = Right, 4 = Back Right,
  -- 5 = Back, 6 = Back Left, 7 = Left, 8 = Front Left
  angle_index smallint not null check (angle_index between 1 and 8),
  url text not null,
  created_at timestamptz not null default now(),
  unique (product_id, angle_index)
);

create index product_360_images_product_id_idx
  on public.product_360_images (product_id, angle_index);

alter table public.product_360_images enable row level security;

create policy "product_360_images_vendor_all"
  on public.product_360_images for all
  using (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_360_images.product_id and v.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_360_images.product_id and v.owner_id = auth.uid()
    )
  );

create policy "product_360_images_admin_all"
  on public.product_360_images for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "product_360_images_public_select"
  on public.product_360_images for select
  using (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_360_images.product_id
        and pr.status = 'published'
        and v.verification_status = 'approved'
    )
  );
