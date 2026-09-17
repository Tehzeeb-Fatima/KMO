-- Vendor signup gap-fill: the vendor app's /signup form (apps/vendor/src/pages/signup-page.tsx)
-- calls supabase.auth.signUp() with store metadata (store_name, area, phone), but nothing
-- ever inserted a row into public.vendors — a freshly-signed-up vendor had a profiles row
-- (role='vendor', pending_vendor=true) with no matching vendors row, so getMyVendor() would
-- return null forever even after admin approval.
--
-- Email confirmation is ON for this project (mailer_autoconfirm=false), so signUp() never
-- returns a live session client-side — a client-side insert governed by the
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
