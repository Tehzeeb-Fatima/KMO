-- Admin user management: list every account with its email and let an admin
-- move a user between the customer, vendor and admin portals.

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  role public.user_role,
  pending_vendor boolean,
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
    select p.id, u.email::text, p.full_name, p.phone, p.role, p.pending_vendor, p.created_at
    from public.profiles p
    left join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

create or replace function public.admin_set_user_role(target_id uuid, new_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_role public.user_role;
  admin_count integer;
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

  update public.profiles set role = new_role where id = target_id;

  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    'user.role_changed',
    'profile',
    target_id::text,
    jsonb_build_object('from', old_role, 'to', new_role)
  );
end;
$$;

revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_set_user_role(uuid, public.user_role) from public;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.user_role) to authenticated;