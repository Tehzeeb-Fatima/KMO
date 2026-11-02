-- Only an admin may change which dashboard modules a staff user can open.
create or replace function public.profiles_modules_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.admin_modules := old.admin_modules;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_modules_guard on public.profiles;
create trigger profiles_modules_guard before update on public.profiles
  for each row execute function public.profiles_modules_guard();

-- Signup metadata is written by the client, so it must never grant admin or
-- staff. Those roles are only set afterwards by an admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_role public.user_role;
  v_store_name text;
  v_base_slug text;
  v_slug text;
begin
  v_role := case when new.raw_user_meta_data ->> 'role' = 'vendor'
                 then 'vendor'::public.user_role
                 else 'customer'::public.user_role end;

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
