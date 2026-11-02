-- Loyalty, part 3: shopping milestones, points-to-cash conversion with admin
-- approval, and a KMO wallet.
--
--   1. Milestones: platform_settings.loyalty_spend_tiers (up to 3, e.g.
--      Rs. 20,000 -> 200 pts, Rs. 40,000 -> 300 pts) are reached by a
--      customer's LIFETIME delivered shopping. Each milestone is credited once,
--      when the delivery that crosses it happens, and taken back if a
--      cancellation/return drops the customer below it again.
--   2. Conversion: a customer asks to turn points into rupees. The points are
--      held (deducted) at once so they can't be spent twice; an admin approves
--      (rupees go to the wallet) or rejects (points come back).
--   3. Wallet: approved rupees, spendable at checkout. Refunded if the order is
--      cancelled/returned. KMO-funded, so vendor payouts are untouched.
--   Points can no longer be spent directly at checkout: every rupee a customer
--   gets from points has gone through an admin's approval.
--
-- Security: none of the new tables have insert/update/delete policies. Every
-- write goes through a SECURITY DEFINER function that checks who is calling,
-- locks per customer, and recomputes amounts server-side. Vendors can no
-- longer edit the money fields of an order (which milestones are based on).

-- ---------------------------------------------------------------- ledger kinds
alter table public.loyalty_ledger drop constraint if exists loyalty_ledger_kind_check;
alter table public.loyalty_ledger add constraint loyalty_ledger_kind_check
  check (kind in ('earn', 'redeem', 'reverse_earn', 'refund_redeem', 'adjust', 'expire', 'bonus', 'reverse_bonus',
                  'referral', 'milestone', 'reverse_milestone', 'convert', 'refund_convert'));

-- ---------------------------------------------------------------- orders: wallet + money guard
alter table public.orders
  add column if not exists wallet_amount_used numeric(12, 2) not null default 0 check (wallet_amount_used >= 0),
  add column if not exists wallet_refunded boolean not null default false;

-- Only admins/order staff (or the service key) may change what an order is
-- worth or who it belongs to. Vendors keep updating status and courier fields.
-- Named to run before the loyalty triggers (triggers fire in name order).
create or replace function public.orders_money_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not (public.is_admin(auth.uid()) or public.staff_can('orders')) then
    new.customer_id := old.customer_id;
    new.vendor_id := old.vendor_id;
    new.checkout_group := old.checkout_group;
    new.order_number := old.order_number;
    new.payment_method := old.payment_method;
    new.subtotal := old.subtotal;
    new.delivery_fee := old.delivery_fee;
    new.total := old.total;
    new.commission_rate := old.commission_rate;
    new.commission_amount := old.commission_amount;
    new.net_amount := old.net_amount;
    new.payout_id := old.payout_id;
    new.coupon_code := old.coupon_code;
    new.discount_amount := old.discount_amount;
    new.promotion_id := old.promotion_id;
    new.promotion_discount_amount := old.promotion_discount_amount;
    new.promotion_kmo_funded_amount := old.promotion_kmo_funded_amount;
    new.promotion_vendor_funded_amount := old.promotion_vendor_funded_amount;
    new.created_at := old.created_at;
  end if;
  -- Wallet numbers are set by place_order and the refund trigger only.
  if auth.uid() is not null then
    new.wallet_amount_used := old.wallet_amount_used;
    new.wallet_refunded := old.wallet_refunded;
  end if;
  return new;
end;
$$;
drop trigger if exists orders_a_money_guard on public.orders;
create trigger orders_a_money_guard before update on public.orders
  for each row execute function public.orders_money_guard();

-- ---------------------------------------------------------------- lifetime shopping
-- What an order counts towards milestones: the goods the customer actually
-- paid for — no delivery fee, and nothing paid by coupons, promotions,
-- points or the wallet (so wallet spending can't snowball into more points).
create or replace function public.loyalty_order_spend(o public.orders)
returns numeric
language sql
immutable
as $$
  select greatest(0, o.subtotal - o.discount_amount - o.promotion_discount_amount
                     - o.loyalty_discount_amount - o.wallet_amount_used);
$$;

create or replace function public.loyalty_lifetime_spend(p_customer uuid, p_exclude_order uuid default null)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(public.loyalty_order_spend(o)), 0)
  from public.orders o
  where o.customer_id = p_customer and o.status = 'delivered'
    and (p_exclude_order is null or o.id <> p_exclude_order);
$$;
revoke all on function public.loyalty_lifetime_spend(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- milestones
create table if not exists public.loyalty_milestone_awards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  spend_pkr numeric(12, 2) not null,
  points integer not null check (points > 0),
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (customer_id, spend_pkr)
);
alter table public.loyalty_milestone_awards enable row level security;
create policy "milestone_awards_own_select" on public.loyalty_milestone_awards for select
  using (customer_id = auth.uid());
create policy "milestone_awards_admin_select" on public.loyalty_milestone_awards for select
  using (public.is_admin(auth.uid()) or public.staff_can('loyalty'));

create or replace function public.loyalty_milestones_on_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
  v_tiers jsonb;
  v_spend numeric;
  t jsonb;
  v_tier_spend numeric;
  v_tier_points integer;
  a record;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if new.status <> 'delivered' and old.status <> 'delivered' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('loyalty:' || new.customer_id::text));
  select loyalty_enabled, loyalty_spend_tiers into v_enabled, v_tiers from public.platform_settings limit 1;

  v_spend := public.loyalty_lifetime_spend(new.customer_id, new.id)
             + case when new.status = 'delivered' then public.loyalty_order_spend(new) else 0 end;

  -- Award milestones now reached (only while the programme is on).
  if v_enabled and jsonb_typeof(v_tiers) = 'array' then
    for t in select * from jsonb_array_elements(v_tiers) limit 3 loop
      v_tier_spend := nullif(t ->> 'spend_pkr', '')::numeric;
      v_tier_points := floor(nullif(t ->> 'points', '')::numeric)::int;
      if v_tier_spend > 0 and v_tier_points > 0 and v_spend >= v_tier_spend
         and not exists (select 1 from public.loyalty_milestone_awards
                         where customer_id = new.customer_id and spend_pkr = v_tier_spend) then
        insert into public.loyalty_milestone_awards (customer_id, spend_pkr, points, order_id)
        values (new.customer_id, v_tier_spend, v_tier_points, new.id);
        insert into public.loyalty_ledger (customer_id, points, kind, order_id, note)
        values (new.customer_id, v_tier_points, 'milestone', new.id,
                'Milestone: Rs. ' || to_char(v_tier_spend, 'FM999,999,999') || ' shopping reached');
      end if;
    end loop;
  end if;

  -- Take back milestones the customer is no longer above (cancel/return).
  for a in select * from public.loyalty_milestone_awards
           where customer_id = new.customer_id and spend_pkr > v_spend for update loop
    insert into public.loyalty_ledger (customer_id, points, kind, order_id, note)
    values (new.customer_id, -a.points, 'reverse_milestone', new.id,
            'Milestone removed: shopping is below Rs. ' || to_char(a.spend_pkr, 'FM999,999,999') || ' again');
    delete from public.loyalty_milestone_awards where id = a.id;
  end loop;

  return new;
end;
$$;
drop trigger if exists orders_z_loyalty_milestones on public.orders;
create trigger orders_z_loyalty_milestones before update of status on public.orders
  for each row execute function public.loyalty_milestones_on_status();

-- ---------------------------------------------------------------- wallet
create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount <> 0),
  kind text not null check (kind in ('conversion', 'spend', 'refund_spend')),
  conversion_id uuid,
  order_id uuid references public.orders (id) on delete set null,
  checkout_group uuid,
  note text,
  created_at timestamptz not null default now()
);
alter table public.wallet_ledger enable row level security;
create index if not exists wallet_ledger_customer_idx on public.wallet_ledger (customer_id, created_at desc);
create policy "wallet_ledger_own_select" on public.wallet_ledger for select using (customer_id = auth.uid());
create policy "wallet_ledger_admin_select" on public.wallet_ledger for select
  using (public.is_admin(auth.uid()) or public.staff_can('loyalty'));
-- No insert/update/delete policies: written only by the functions below.

create or replace function public.wallet_balance(p_customer uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::numeric(12, 2) from public.wallet_ledger where customer_id = p_customer;
$$;
revoke all on function public.wallet_balance(uuid) from public, anon, authenticated;

-- Spend wallet rupees for a checkout (place_order, service key only).
create or replace function public.wallet_spend(p_customer uuid, p_amount numeric, p_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('wallet:' || p_customer::text));
  if p_amount is null or p_amount <= 0 then
    return;
  end if;
  if public.wallet_balance(p_customer) < p_amount then
    raise exception 'Not enough wallet balance.';
  end if;
  insert into public.wallet_ledger (customer_id, amount, kind, checkout_group, note)
  values (p_customer, -round(p_amount, 2), 'spend', p_group, 'Used at checkout');
end;
$$;
revoke all on function public.wallet_spend(uuid, numeric, uuid) from public, anon, authenticated;

-- Wallet money comes back when an order is cancelled/returned.
create or replace function public.wallet_on_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status in ('cancelled', 'returned')
     and new.wallet_amount_used > 0 and not new.wallet_refunded then
    insert into public.wallet_ledger (customer_id, amount, kind, order_id, note)
    values (new.customer_id, new.wallet_amount_used, 'refund_spend', new.id,
            'Returned to wallet: order ' || new.order_number || ' ' || new.status::text);
    new.wallet_refunded := true;
  end if;
  return new;
end;
$$;
drop trigger if exists orders_wallet_status on public.orders;
create trigger orders_wallet_status before update of status on public.orders
  for each row execute function public.wallet_on_order_status();

-- ---------------------------------------------------------------- conversion requests
create table if not exists public.loyalty_conversion_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  points integer not null check (points > 0),
  point_value numeric(10, 4) not null check (point_value > 0),
  amount_pkr numeric(12, 2) not null check (amount_pkr > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.loyalty_conversion_requests enable row level security;
create index if not exists conversion_requests_status_idx on public.loyalty_conversion_requests (status, created_at desc);
-- At most one open request per customer.
create unique index if not exists conversion_requests_one_pending
  on public.loyalty_conversion_requests (customer_id) where status = 'pending';
create policy "conversion_requests_own_select" on public.loyalty_conversion_requests for select
  using (customer_id = auth.uid());
create policy "conversion_requests_admin_select" on public.loyalty_conversion_requests for select
  using (public.is_admin(auth.uid()) or public.staff_can('loyalty'));
-- No insert/update/delete policies: written only by the functions below.

-- Customer: ask to turn points into wallet rupees. The points are held now.
create or replace function public.request_points_conversion(p_points integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  s record;
  v_amount numeric(12, 2);
  v_id uuid;
begin
  if v_uid is null or exists (select 1 from auth.users where id = v_uid and is_anonymous) then
    raise exception 'Please sign in first.';
  end if;
  select loyalty_enabled, loyalty_point_value, loyalty_min_redeem_points into s from public.platform_settings limit 1;
  if not s.loyalty_enabled or coalesce(s.loyalty_point_value, 0) <= 0 then
    raise exception 'Points can''t be converted right now.';
  end if;
  if p_points is null or p_points <= 0 then
    raise exception 'Enter the number of points.';
  end if;
  if p_points < s.loyalty_min_redeem_points then
    raise exception 'You need at least % points to convert.', s.loyalty_min_redeem_points;
  end if;

  perform pg_advisory_xact_lock(hashtext('loyalty:' || v_uid::text));
  if exists (select 1 from public.loyalty_conversion_requests where customer_id = v_uid and status = 'pending') then
    raise exception 'You already have a request waiting for approval.';
  end if;
  perform public.loyalty_expire(v_uid);
  if public.loyalty_balance(v_uid) < p_points then
    raise exception 'You don''t have enough points.';
  end if;

  v_amount := round(p_points * s.loyalty_point_value, 2);
  if v_amount <= 0 then
    raise exception 'That is too few points to convert.';
  end if;

  insert into public.loyalty_conversion_requests (customer_id, points, point_value, amount_pkr)
  values (v_uid, p_points, s.loyalty_point_value, v_amount)
  returning id into v_id;
  insert into public.loyalty_ledger (customer_id, points, kind, note)
  values (v_uid, -p_points, 'convert', 'Converting to Rs. ' || to_char(v_amount, 'FM999,999,990.00') || ' (waiting for approval)');

  insert into public.notifications (recipient_role, type, title, body, link)
  values ('admin', 'points_conversion', 'Points to cash request',
          p_points || ' points = Rs. ' || to_char(v_amount, 'FM999,999,990.00'), '/loyalty');
  return v_id;
end;
$$;
revoke all on function public.request_points_conversion(integer) from public, anon;
grant execute on function public.request_points_conversion(integer) to authenticated;

-- Admin: approve (rupees to wallet) or reject (points back). Full admins only,
-- never on their own request, and each request can be decided exactly once.
create or replace function public.admin_review_points_conversion(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.loyalty_conversion_requests;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only an admin can approve or reject this.';
  end if;
  select * into r from public.loyalty_conversion_requests where id = p_id for update;
  if r.id is null then
    raise exception 'Request not found.';
  end if;
  if r.status <> 'pending' then
    raise exception 'This request was already %.', r.status;
  end if;
  if r.customer_id = auth.uid() then
    raise exception 'You can''t approve your own request.';
  end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then
    raise exception 'Give a reason for rejecting.';
  end if;

  perform pg_advisory_xact_lock(hashtext('wallet:' || r.customer_id::text));
  update public.loyalty_conversion_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         review_note = nullif(trim(p_note), ''),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = r.id;

  if p_approve then
    insert into public.wallet_ledger (customer_id, amount, kind, conversion_id, note)
    values (r.customer_id, r.amount_pkr, 'conversion', r.id, r.points || ' points converted');
    insert into public.notifications (recipient_id, type, title, body, link)
    values (r.customer_id, 'points_conversion', 'Points converted',
            'Rs. ' || to_char(r.amount_pkr, 'FM999,999,990.00') || ' added to your KMO wallet.', '/account/points');
  else
    insert into public.loyalty_ledger (customer_id, points, kind, note)
    values (r.customer_id, r.points, 'refund_convert', 'Conversion not approved: ' || trim(p_note));
    insert into public.notifications (recipient_id, type, title, body, link)
    values (r.customer_id, 'points_conversion', 'Conversion not approved',
            'Your ' || r.points || ' points are back in your account.', '/account/points');
  end if;
end;
$$;
revoke all on function public.admin_review_points_conversion(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_points_conversion(uuid, boolean, text) to authenticated;

-- Admin list, with what the admin needs to judge a request.
create or replace function public.admin_points_conversions(p_status text default 'pending')
returns table (
  id uuid, customer_id uuid, full_name text, phone text, points integer, amount_pkr numeric,
  status text, review_note text, reviewer_name text, reviewed_at timestamptz, created_at timestamptz,
  points_balance integer, wallet_balance numeric, lifetime_spend numeric, delivered_orders bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.customer_id, p.full_name, p.phone, r.points, r.amount_pkr,
         r.status, r.review_note, rv.full_name, r.reviewed_at, r.created_at,
         public.loyalty_balance(r.customer_id), public.wallet_balance(r.customer_id),
         public.loyalty_lifetime_spend(r.customer_id),
         (select count(*) from public.orders o where o.customer_id = r.customer_id and o.status = 'delivered')
  from public.loyalty_conversion_requests r
  join public.profiles p on p.id = r.customer_id
  left join public.profiles rv on rv.id = r.reviewed_by
  where (public.is_admin(auth.uid()) or public.staff_can('loyalty'))
    and (p_status = 'all' or r.status = p_status)
  order by r.created_at desc
  limit 200;
$$;
revoke all on function public.admin_points_conversions(text) from public, anon;
grant execute on function public.admin_points_conversions(text) to authenticated;

-- ---------------------------------------------------------------- customer view
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
  v_uid uuid := auth.uid();
  v_soon integer := 0;
  v_delivered integer := 0;
  v_referred boolean := false;
  v_can_claim boolean := false;
  v_spend numeric := 0;
  v_wallet numeric := 0;
  v_milestones jsonb := '[]'::jsonb;
  v_pending jsonb := null;
begin
  select * into s from public.platform_settings limit 1;
  r := public.loyalty_active_rule();
  if v_uid is not null then
    v_soon := greatest(0, public.loyalty_pending_expiry(v_uid, now() + interval '30 days') - public.loyalty_pending_expiry(v_uid));
    select count(*) into v_delivered from public.orders where customer_id = v_uid and status = 'delivered';
    v_referred := exists (select 1 from public.loyalty_referrals where referee_id = v_uid);
    v_can_claim := not v_referred
      and not exists (select 1 from public.orders where customer_id = v_uid)
      and exists (select 1 from public.profiles where id = v_uid and created_at > now() - interval '30 days');
    v_spend := public.loyalty_lifetime_spend(v_uid);
    v_wallet := public.wallet_balance(v_uid);
    select coalesce(jsonb_agg(spend_pkr order by spend_pkr), '[]'::jsonb) into v_milestones
      from public.loyalty_milestone_awards where customer_id = v_uid;
    select jsonb_build_object('id', id, 'points', points, 'amount_pkr', amount_pkr, 'created_at', created_at)
      into v_pending
      from public.loyalty_conversion_requests where customer_id = v_uid and status = 'pending';
  end if;
  return jsonb_build_object(
    'enabled', s.loyalty_enabled,
    'balance', case when v_uid is null then 0 else public.loyalty_balance(v_uid) end,
    'point_value', s.loyalty_point_value,
    'min_redeem_points', s.loyalty_min_redeem_points,
    'max_redeem_percent', s.loyalty_max_redeem_percent,
    'expiry_months', s.loyalty_expiry_months,
    'expiring_soon', v_soon,
    'repeat_every', s.loyalty_repeat_every,
    'repeat_bonus_points', s.loyalty_repeat_bonus_points,
    'delivered_orders', v_delivered,
    'referrer_points', s.loyalty_referrer_points,
    'referee_points', s.loyalty_referee_points,
    'can_claim_referral', v_can_claim,
    'lifetime_spend', v_spend,
    'milestones_reached', v_milestones,
    'wallet_balance', v_wallet,
    'pending_conversion', v_pending,
    'rule', case when r.id is null then null else jsonb_build_object(
      'name', r.name, 'spend_pkr', r.spend_pkr, 'points', r.points, 'ends_at', r.ends_at) end
  );
end;
$$;
grant execute on function public.my_loyalty() to anon, authenticated;
