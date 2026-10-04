-- Public order tracking: a visitor enters their order number and the email the
-- order was placed with. Returns only status-level details, nothing private.

create or replace function public.track_order(p_order_number text, p_email text)
returns table (
  order_number text,
  status public.order_status,
  total numeric,
  payment_method text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select o.order_number, o.status, o.total, o.payment_method::text, o.created_at
  from public.orders o
  join auth.users u on u.id = o.customer_id
  where upper(o.order_number) = upper(trim(p_order_number))
    and lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;