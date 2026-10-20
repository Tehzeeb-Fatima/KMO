-- Tell every admin when a vendor signs up and is waiting for approval.
create or replace function public.notify_admin_new_vendor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status = 'pending' then
    insert into public.notifications (recipient_role, type, title, body, link)
    values (
      'admin',
      'vendor_signup',
      'New vendor waiting for approval: ' || new.store_name,
      'A vendor signed up on their own and needs your approval before they can sell.',
      '/vendors'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists vendors_notify_admin_on_signup on public.vendors;
create trigger vendors_notify_admin_on_signup
  after insert on public.vendors
  for each row execute function public.notify_admin_new_vendor();
