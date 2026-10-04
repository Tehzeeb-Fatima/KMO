-- Staff module access: lets a staff user work inside the dashboard modules an
-- admin granted (profiles.admin_modules). Admins keep full access through the
-- existing *_admin_* policies.

create or replace function public.staff_can(module_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (p.role = 'staff' and module_key = any (p.admin_modules))
      )
  );
$$;

revoke all on function public.staff_can(text) from public;
grant execute on function public.staff_can(text) to authenticated;

-- Orders
create policy "orders_staff_all" on public.orders for all
  using (public.staff_can('orders')) with check (public.staff_can('orders'));
create policy "order_items_staff_all" on public.order_items for all
  using (public.staff_can('orders')) with check (public.staff_can('orders'));

-- Products and their media / categories
create policy "products_staff_all" on public.products for all
  using (public.staff_can('products')) with check (public.staff_can('products'));
create policy "product_images_staff_all" on public.product_images for all
  using (public.staff_can('products')) with check (public.staff_can('products'));
create policy "product_variants_staff_all" on public.product_variants for all
  using (public.staff_can('products')) with check (public.staff_can('products'));
create policy "product_categories_staff_all" on public.product_categories for all
  using (public.staff_can('products')) with check (public.staff_can('products'));
create policy "product_360_images_staff_all" on public.product_360_images for all
  using (public.staff_can('products')) with check (public.staff_can('products'));

-- Vendors and payouts
create policy "vendors_staff_all" on public.vendors for all
  using (public.staff_can('vendors')) with check (public.staff_can('vendors'));
create policy "payouts_staff_all" on public.payouts for all
  using (public.staff_can('payouts')) with check (public.staff_can('payouts'));

-- Customers: read only. Staff must not change anyone's role.
create policy "profiles_staff_select" on public.profiles for select
  using (public.staff_can('customers'));