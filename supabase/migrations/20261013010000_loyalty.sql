-- Loyalty
--   Customers (dynamic): the admin sets earning rules with a start and end
--   date ("Rs. 1,000 = 100 points from 17 Oct to 30 Nov"). Points are worked
--   out when an order is placed with the rule live at that moment, credited
--   when the order is delivered, and taken back if it is cancelled/returned.
--   Points can be spent at checkout as a KMO-funded discount (the vendor is
--   still paid in full), capped by a minimum and a max % of the order.
--   Vendors (static): the admin assigns a Bronze/Silver/Gold tier with
--   non-cash benefits. Not shown to customers.
-- The whole customer programme is switched off until the admin turns it on.

-- ---------------------------------------------------------------- settings
alter table public.platform_settings
  add column if not exists loyalty_enabled boolean not null default false,
  add column if not exists loyalty_point_value numeric(10, 4) not null default 0.10,
  add column if not exists loyalty_min_redeem_points integer not null default 100,
  add column if not exists loyalty_max_redeem_percent numeric(5, 2) not null default 20,
  add column if not exists vendor_tier_benefits jsonb not null default jsonb_build_object(
    'bronze', 'Listed in KMO vendor directory · Standard support',
    'silver', 'Priority in homepage Featured vendors · Included in seasonal promotions',
    'gold', 'Top priority in KMO Instagram marketing · First pick for homepage Featured vendors and promotions'
  );

-- ---------------------------------------------------------------- earning rules
create table public.loyalty_earn_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  spend_pkr numeric(12, 2) not null check (spend_pkr > 0),
  points integer not null check (points > 0),
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
alter table public.loyalty_earn_rules enable row level security;
create policy "loyalty_rules_public_select" on public.loyalty_earn_rules for select using (true);
create policy "loyalty_rules_admin_write" on public.loyalty_earn_rules for all
  using (public.is_admin(auth.uid()) or public.staff_can('loyalty'))
  with check (public.is_admin(auth.uid()) or public.staff_can('loyalty'));

insert into public.loyalty_earn_rules (name, spend_pkr, points, starts_at)
values ('Launch offer', 1000, 100, '2026-10-17 00:00:00+05');

-- Best rule live right now (highest points per rupee).
create or replace function public.loyalty_active_rule()
returns public.loyalty_earn_rules
language sql
stable
security definer
set search_path = public
as $$
  select r.* from public.loyalty_earn_rules r
  where r.is_active and r.starts_at <= now() and (r.ends_at is null or r.ends_at > now())
  order by r.points / r.spend_pkr desc, r.starts_at desc
  limit 1;
$$;
grant execute on function public.loyalty_active_rule() to anon, authenticated;

-- ---------------------------------------------------------------- ledger
create table public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  points integer not null check (points <> 0),
  kind text not null check (kind in ('earn', 'redeem', 'reverse_earn', 'refund_redeem', 'adjust')),
  order_id uuid references public.orders (id) on delete set null,
  checkout_group uuid,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.loyalty_ledger enable row level security;
create index loyalty_ledger_customer_idx on public.loyalty_ledger (customer_id, created_at desc);
create policy "loyalty_ledger_own_select" on public.loyalty_ledger for select using (customer_id = auth.uid());
create policy "loyalty_ledger_admin_select" on public.loyalty_ledger for select
  using (public.is_admin(auth.uid()) or public.staff_can('loyalty'));
-- No insert/update/delete policies: rows are written only by the functions below.

create or replace function public.loyalty_balance(p_customer uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(points), 0)::int from public.loyalty_ledger where customer_id = p_customer;
$$;
revoke all on function public.loyalty_balance(uuid) from public;

-- Customer view: balance + the live offer + redemption rules.
create or replace function public.my_loyalty()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s record;
  r public.loyalty_earn_rules;
begin
  select loyalty_enabled, loyalty_point_value, loyalty_min_redeem_points, loyalty_max_redeem_percent
    into s from public.platform_settings limit 1;
  r := public.loyalty_active_rule();
  return jsonb_build_object(
    'enabled', s.loyalty_enabled,
    'balance', case when auth.uid() is null then 0 else public.loyalty_balance(auth.uid()) end,
    'point_value', s.loyalty_point_value,
    'min_redeem_points', s.loyalty_min_redeem_points,
    'max_redeem_percent', s.loyalty_max_redeem_percent,
    'rule', case when r.id is null then null else jsonb_build_object(
      'name', r.name, 'spend_pkr', r.spend_pkr, 'points', r.points, 'ends_at', r.ends_at) end
  );
end;
$$;
grant execute on function public.my_loyalty() to anon, authenticated;

-- Spend points for a checkout (called by place_order with the service key).
-- Locks per customer so two checkouts can't spend the same points.
create or replace function public.loyalty_spend(p_customer uuid, p_points integer, p_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('loyalty:' || p_customer::text));
  if p_points <= 0 then
    return;
  end if;
  if public.loyalty_balance(p_customer) < p_points then
    raise exception 'Not enough points.';
  end if;
  insert into public.loyalty_ledger (customer_id, points, kind, checkout_group, note)
  values (p_customer, -p_points, 'redeem', p_group, 'Used at checkout');
end;
$$;
revoke all on function public.loyalty_spend(uuid, integer, uuid) from public, anon, authenticated;

-- Admin/staff manual adjustment (+ or -) with a reason.
create or replace function public.admin_adjust_points(p_customer uuid, p_points integer, p_note text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin(auth.uid()) or public.staff_can('loyalty')) then
    raise exception 'Not allowed.';
  end if;
  if p_points = 0 then
    raise exception 'Enter a number of points.';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Enter a reason.';
  end if;
  insert into public.loyalty_ledger (customer_id, points, kind, note, created_by)
  values (p_customer, p_points, 'adjust', trim(p_note), auth.uid());
  return public.loyalty_balance(p_customer);
end;
$$;
grant execute on function public.admin_adjust_points(uuid, integer, text) to authenticated;

-- Customers with a balance, for the admin loyalty page.
create or replace function public.admin_loyalty_balances()
returns table (customer_id uuid, full_name text, phone text, balance integer, last_activity timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select l.customer_id, p.full_name, p.phone, sum(l.points)::int, max(l.created_at)
  from public.loyalty_ledger l join public.profiles p on p.id = l.customer_id
  where public.is_admin(auth.uid()) or public.staff_can('loyalty')
  group by l.customer_id, p.full_name, p.phone
  order by sum(l.points) desc;
$$;
grant execute on function public.admin_loyalty_balances() to authenticated;

-- ---------------------------------------------------------------- orders
alter table public.orders
  add column if not exists loyalty_points_redeemed integer not null default 0,
  add column if not exists loyalty_discount_amount numeric(12, 2) not null default 0,
  add column if not exists loyalty_points_to_earn integer not null default 0,
  add column if not exists loyalty_rule_id uuid references public.loyalty_earn_rules (id) on delete set null,
  add column if not exists loyalty_points_awarded boolean not null default false,
  add column if not exists loyalty_redeem_refunded boolean not null default false;

-- Credit points on delivery; take them back (and refund spent points) on cancel/return.
create or replace function public.loyalty_on_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'delivered' and new.loyalty_points_to_earn > 0 and not new.loyalty_points_awarded then
    insert into public.loyalty_ledger (customer_id, points, kind, order_id, note)
    values (new.customer_id, new.loyalty_points_to_earn, 'earn', new.id, 'Order ' || new.order_number || ' delivered');
    new.loyalty_points_awarded := true;
  end if;

  if new.status in ('cancelled', 'returned') then
    if new.loyalty_points_awarded then
      insert into public.loyalty_ledger (customer_id, points, kind, order_id, note)
      values (new.customer_id, -new.loyalty_points_to_earn, 'reverse_earn', new.id,
              'Order ' || new.order_number || ' ' || new.status::text);
      new.loyalty_points_awarded := false;
    end if;
    if new.loyalty_points_redeemed > 0 and not new.loyalty_redeem_refunded then
      insert into public.loyalty_ledger (customer_id, points, kind, order_id, note)
      values (new.customer_id, new.loyalty_points_redeemed, 'refund_redeem', new.id,
              'Points returned: order ' || new.order_number || ' ' || new.status::text);
      new.loyalty_redeem_refunded := true;
    end if;
  end if;

  return new;
end;
$$;

create trigger orders_loyalty_status
  before update of status on public.orders
  for each row execute function public.loyalty_on_order_status();

-- ---------------------------------------------------------------- vendor tiers
alter table public.vendors
  add column if not exists loyalty_tier text check (loyalty_tier in ('bronze', 'silver', 'gold'));

-- Performance numbers for tier decisions (admin, staff with vendors access, or the vendor itself).
create or replace function public.vendor_performance(p_vendor uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  out jsonb;
begin
  select owner_id into v_owner from public.vendors where id = p_vendor;
  if not (public.is_admin(auth.uid()) or public.staff_can('vendors') or v_owner = auth.uid()) then
    raise exception 'Not allowed.';
  end if;
  select jsonb_build_object(
    'orders_total', count(*),
    'orders_delivered', count(*) filter (where status = 'delivered'),
    'orders_cancelled', count(*) filter (where status = 'cancelled'),
    'orders_returned', count(*) filter (where status = 'returned'),
    'orders_open', count(*) filter (where status not in ('delivered', 'cancelled', 'returned')),
    'delivered_sales', coalesce(sum(subtotal) filter (where status = 'delivered'), 0),
    'last_order_at', max(created_at),
    'active_products', (select count(*) from public.products where vendor_id = p_vendor and status = 'published')
  ) into out
  from public.orders where vendor_id = p_vendor;
  return out;
end;
$$;
grant execute on function public.vendor_performance(uuid) to authenticated;

-- ---------------------------------------------------------------- guards
-- Vendors can edit their own store row, but not their tier.
create or replace function public.vendors_tier_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.loyalty_tier is distinct from old.loyalty_tier
     and auth.uid() is not null
     and not (public.is_admin(auth.uid()) or public.staff_can('vendors')) then
    raise exception 'Only KMO can change a vendor tier.';
  end if;
  return new;
end;
$$;
create trigger vendors_tier_guard before update on public.vendors
  for each row execute function public.vendors_tier_guard();

-- Loyalty numbers on an order are set by place_order (service key) and the
-- status trigger only; a signed-in user updating an order can't change them.
-- Named so it fires before orders_loyalty_status (triggers run in name order).
create or replace function public.orders_loyalty_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.loyalty_points_redeemed := old.loyalty_points_redeemed;
    new.loyalty_discount_amount := old.loyalty_discount_amount;
    new.loyalty_points_to_earn := old.loyalty_points_to_earn;
    new.loyalty_rule_id := old.loyalty_rule_id;
    new.loyalty_points_awarded := old.loyalty_points_awarded;
    new.loyalty_redeem_refunded := old.loyalty_redeem_refunded;
  end if;
  return new;
end;
$$;
create trigger orders_loyalty_guard before update on public.orders
  for each row execute function public.orders_loyalty_guard();
