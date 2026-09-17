-- CRITICAL FIX: every "is this user an admin?" RLS policy checked by running
-- `exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')`
-- directly inside a policy ON public.profiles itself (profiles_admin_all).
-- Postgres has to re-apply profiles' own RLS to evaluate that subquery, which
-- re-triggers the same policy — infinite recursion (42P17) — and since almost
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

-- ── profiles ────────────────────────────────────────────────────────────────
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

-- ── vendors ─────────────────────────────────────────────────────────────────
drop policy if exists "vendors_admin_all" on public.vendors;
create policy "vendors_admin_all"
  on public.vendors for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── categories ──────────────────────────────────────────────────────────────
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write"
  on public.categories for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── products ────────────────────────────────────────────────────────────────
drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all"
  on public.products for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── product_images ──────────────────────────────────────────────────────────
drop policy if exists "product_images_admin_all" on public.product_images;
create policy "product_images_admin_all"
  on public.product_images for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── product_variants ────────────────────────────────────────────────────────
drop policy if exists "product_variants_admin_all" on public.product_variants;
create policy "product_variants_admin_all"
  on public.product_variants for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── addresses ───────────────────────────────────────────────────────────────
drop policy if exists "addresses_admin_all" on public.addresses;
create policy "addresses_admin_all"
  on public.addresses for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── orders ──────────────────────────────────────────────────────────────────
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all"
  on public.orders for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── order_items ─────────────────────────────────────────────────────────────
drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all"
  on public.order_items for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── platform_settings ───────────────────────────────────────────────────────
drop policy if exists "platform_settings_admin_write" on public.platform_settings;
create policy "platform_settings_admin_write"
  on public.platform_settings for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── payouts ─────────────────────────────────────────────────────────────────
drop policy if exists "payouts_admin_all" on public.payouts;
create policy "payouts_admin_all"
  on public.payouts for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── reviews ─────────────────────────────────────────────────────────────────
drop policy if exists "reviews_admin_all" on public.reviews;
create policy "reviews_admin_all"
  on public.reviews for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── returns ─────────────────────────────────────────────────────────────────
drop policy if exists "returns_admin_all" on public.returns;
create policy "returns_admin_all"
  on public.returns for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── coupons ─────────────────────────────────────────────────────────────────
drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all"
  on public.coupons for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── audit_logs ──────────────────────────────────────────────────────────────
drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select"
  on public.audit_logs for select
  using (public.is_admin(auth.uid()));

drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
create policy "audit_logs_admin_insert"
  on public.audit_logs for insert
  with check (actor_id = auth.uid() and public.is_admin(auth.uid()));

-- ── contact_messages ────────────────────────────────────────────────────────
drop policy if exists "contact_messages_admin_select" on public.contact_messages;
create policy "contact_messages_admin_select"
  on public.contact_messages for select
  using (public.is_admin(auth.uid()));

drop policy if exists "contact_messages_admin_update" on public.contact_messages;
create policy "contact_messages_admin_update"
  on public.contact_messages for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── product_questions ───────────────────────────────────────────────────────
drop policy if exists "product_questions_admin_all" on public.product_questions;
create policy "product_questions_admin_all"
  on public.product_questions for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
