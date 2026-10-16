-- Courier Fast Service integration: vendors connect their own Courier
-- account (shared email, admin-assigned one-time password), request a
-- courier booking on an order, and admin reviews + pushes it to Courier
-- before anything actually leaves KMO. Nothing here calls the Courier API
-- directly from the browser — the API token lives in a locked-down table
-- only edge functions (service role) can read.

alter table public.vendors
  add column if not exists courier_connected boolean not null default false;

create table if not exists public.vendor_courier_accounts (
  vendor_id uuid primary key references public.vendors(id) on delete cascade,
  -- Set by admin, shown to the vendor outside KMO. Cleared once used.
  pending_password text,
  -- Set by courier_connect once the vendor successfully links their account.
  api_token text,
  courier_merchant_id text,
  connected_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.vendor_courier_accounts enable row level security;

-- Deliberately no vendor policy at all: a vendor never reads or writes this
-- table directly (it would expose the API token). Vendor-side access goes
-- through the courier_connect edge function (service role).
create policy "vendor_courier_accounts_admin_all"
  on public.vendor_courier_accounts for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

alter table public.orders
  add column if not exists courier_booking_status text not null default 'not_requested'
    check (courier_booking_status in ('not_requested', 'pending_review', 'rejected', 'booked')),
  add column if not exists courier_tracking_id text,
  add column if not exists courier_booking_id text,
  add column if not exists courier_rejection_note text,
  add column if not exists courier_requested_at timestamptz,
  add column if not exists courier_approved_at timestamptz;

-- Lets an admin grant the new "Courier" section to a staff user.
do $$
declare
  d text;
begin
  select pg_get_functiondef('public.admin_set_user_role(uuid, public.user_role, text[])'::regprocedure) into d;
  if position('''courier''' in d) = 0 then
    d := replace(d, '''settings'', ''loyalty''', '''settings'', ''loyalty'', ''courier''');
    execute d;
  end if;
end;
$$;
