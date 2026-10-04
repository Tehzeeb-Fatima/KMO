-- Lets an admin see the login email of the account that owns a vendor store.

create or replace function public.admin_vendor_owner_email(p_vendor_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  owner_email text;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Only admins can view account emails.' using errcode = '42501';
  end if;

  select u.email::text into owner_email
  from public.vendors v
  join auth.users u on u.id = v.owner_id
  where v.id = p_vendor_id;

  return owner_email;
end;
$$;

revoke all on function public.admin_vendor_owner_email(uuid) from public;
grant execute on function public.admin_vendor_owner_email(uuid) to authenticated;
