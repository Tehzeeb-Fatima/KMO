-- Staff module access, part 2: the remaining dashboard modules. Each policy is
-- permissive, so it only adds rows for staff users whose admin_modules include
-- the module. Admin policies are unchanged.

-- Categories (and the vendor category assignments that the admin approves)
create policy "categories_staff_all" on public.categories for all
  using (public.staff_can('categories')) with check (public.staff_can('categories'));
create policy "vendor_categories_staff_all" on public.vendor_categories for all
  using (public.staff_can('vendors')) with check (public.staff_can('vendors'));

-- Vendor membership charges
create policy "vendor_membership_charges_staff_all" on public.vendor_membership_charges for all
  using (public.staff_can('vendors')) with check (public.staff_can('vendors'));

-- Couriers and their rate slabs
create policy "couriers_staff_all" on public.couriers for all
  using (public.staff_can('couriers')) with check (public.staff_can('couriers'));
create policy "courier_rate_slabs_staff_all" on public.courier_rate_slabs for all
  using (public.staff_can('couriers')) with check (public.staff_can('couriers'));

-- Promotions, promotion products and coupons
create policy "promotions_staff_all" on public.promotions for all
  using (public.staff_can('promotions')) with check (public.staff_can('promotions'));
create policy "promotion_products_staff_all" on public.promotion_products for all
  using (public.staff_can('promotions')) with check (public.staff_can('promotions'));
create policy "coupons_staff_all" on public.coupons for all
  using (public.staff_can('promotions')) with check (public.staff_can('promotions'));

-- Homepage banners (public read policy stays as it is)
create policy "banners_staff_all" on public.banners for all
  using (public.staff_can('banners')) with check (public.staff_can('banners'));

-- Returns
create policy "returns_staff_all" on public.returns for all
  using (public.staff_can('returns')) with check (public.staff_can('returns'));

-- Reviews and product questions
create policy "reviews_staff_all" on public.reviews for all
  using (public.staff_can('reviews')) with check (public.staff_can('reviews'));
create policy "product_questions_staff_all" on public.product_questions for all
  using (public.staff_can('reviews')) with check (public.staff_can('reviews'));

-- Contact requests
create policy "contact_messages_staff_select" on public.contact_messages for select
  using (public.staff_can('contact'));
create policy "contact_messages_staff_update" on public.contact_messages for update
  using (public.staff_can('contact')) with check (public.staff_can('contact'));

-- Platform settings (update only, same as admin)
create policy "platform_settings_staff_update" on public.platform_settings for update
  using (public.staff_can('settings')) with check (public.staff_can('settings'));

-- Audit log: staff can read it when granted, and can record their own actions
create policy "audit_logs_staff_select" on public.audit_logs for select
  using (public.staff_can('audit-log'));
create policy "audit_logs_staff_insert" on public.audit_logs for insert
  with check (
    actor_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  );