-- Vendor category assignment + product approval gate.
--
-- 1. vendor_categories: many-to-many between vendors and categories. Admin
--    assigns these - either when creating a vendor directly, or when
--    approving a self-signed-up vendor's application - and the vendor's
--    "Add product" form only offers categories from this set.
--
-- 2. Products already had a 'pending' status and the admin Products page
--    already has working Approve/Reject actions (Approve -> published,
--    Reject -> archived) - the only gap was that the vendor's own
--    "Published" toggle set status straight to 'published', skipping
--    moderation entirely. That's fixed in application code (the vendor
--    form now submits 'pending' instead), no schema change needed for it.

create table public.vendor_categories (
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (vendor_id, category_id)
);

create index vendor_categories_category_id_idx on public.vendor_categories (category_id);

alter table public.vendor_categories enable row level security;

create policy "vendor_categories_owner_select"
  on public.vendor_categories for select
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_categories.vendor_id and v.owner_id = auth.uid()
    )
  );

-- Storefront-readable: lets a product/category page show which vendors
-- serve a category without needing an admin session.
create policy "vendor_categories_public_select"
  on public.vendor_categories for select
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_categories.vendor_id and v.verification_status = 'approved'
    )
  );

create policy "vendor_categories_admin_all"
  on public.vendor_categories for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
