-- Staff role: a portal user that an admin limits to chosen dashboard modules.

alter type public.user_role add value if not exists 'staff';

alter table public.profiles
  add column if not exists admin_modules text[] not null default '{}';

drop function if exists public.admin_list_users();
drop function if exists public.admin_set_user_role(uuid, public.user_role);

create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  role public.user_role,
  pending_vendor boolean,
  admin_modules text[],
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Only admins can view users.' using errcode = '42501';
  end if;

  return query
    select p.id, u.email::text, p.full_name, p.phone, p.role, p.pending_vendor, p.admin_modules, p.created_at
    from public.profiles p
    left join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

create function public.admin_set_user_role(
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
    'couriers', 'promotions', 'banners', 'returns', 'reviews', 'contact',
    'audit-log', 'settings'
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

revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_set_user_role(uuid, public.user_role, text[]) from public;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.user_role, text[]) to authenticated;