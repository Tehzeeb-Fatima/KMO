-- Adds the new "Delivery caps" admin section to the list of modules a staff
-- user can be granted, and gives staff with the Vendors module write access
-- to the new delivery-rate tables (mirrors the pattern in staff_module_access).

create or replace function public.admin_set_user_role(
  target_id uuid,
  new_role public.user_role,
  modules text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_role public.user_role;
  admin_count integer;
  clean_modules text[] := '{}';
  allowed_modules text[] := array[
    'vendors', 'orders', 'products', 'customers', 'payouts', 'categories',
    'couriers', 'delivery-caps', 'promotions', 'banners', 'returns', 'reviews',
    'contact', 'audit-log', 'settings'
  ];
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Only admins can change roles.' using errcode = '42501';
  end if;

  if target_id = auth.uid() and new_role <> 'admin' then
    raise exception 'You cannot remove your own admin access.';
  end if;

  select p.role into old_role from public.profiles p where p.id = target_id for update;
  if not found then
    raise exception 'User not found.';
  end if;

  if old_role = 'admin' and new_role <> 'admin' then
    select count(*) into admin_count from public.profiles p where p.role = 'admin';
    if admin_count <= 1 then
      raise exception 'At least one admin must remain.';
    end if;
  end if;

  if new_role = 'staff' then
    clean_modules := coalesce(modules, '{}');
    if exists (select 1 from unnest(clean_modules) m where m <> all (allowed_modules)) then
      raise exception 'Unknown dashboard module.';
    end if;
  end if;

  update public.profiles
  set role = new_role, admin_modules = clean_modules
  where id = target_id;

  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    'user.role_changed',
    'profile',
    target_id::text,
    jsonb_build_object('from', old_role, 'to', new_role, 'modules', clean_modules)
  );
end;
$$;

create policy "delivery_fee_caps_staff_write" on public.delivery_fee_caps for all
  using (public.staff_can('delivery-caps')) with check (public.staff_can('delivery-caps'));
