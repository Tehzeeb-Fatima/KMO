-- Loyalty, part 2: points expiry, repeat-purchase bonus, customer referrals,
-- and vendor-to-vendor referrals (non-cash, recorded by the admin).
-- All amounts are admin settings; everything stays off while
-- platform_settings.loyalty_enabled is false.

alter table public.platform_settings
  add column if not exists loyalty_expiry_months integer not null default 12,          -- 0 = never
  add column if not exists loyalty_repeat_every integer not null default 3,            -- every Nth delivered order; 0 = off
  add column if not exists loyalty_repeat_bonus_points integer not null default 100,
  add column if not exists loyalty_referrer_points integer not null default 200,       -- 0 = referrals off
  add column if not exists loyalty_referee_points integer not null default 100;

-- ---------------------------------------------------------------- ledger changes
alter table public.loyalty_ledger drop constraint if exists loyalty_ledger_kind_check;
alter table public.loyalty_ledger add constraint loyalty_ledger_kind_check
  check (kind in ('earn', 'redeem', 'reverse_earn', 'refund_redeem', 'adjust', 'expire', 'bonus', 'reverse_bonus', 'referral'));
alter table public.loyalty_ledger add column if not exists expires_at timestamptz;

-- Every credit gets an expiry date from the setting in force when it is added.
create or replace function public.loyalty_set_expiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_months integer;
begin
  if new.points > 0 and new.expires_at is null then
    select loyalty_expiry_months into v_months from public.platform_settings limit 1;
    if coalesce(v_months, 0) > 0 then
      new.expires_at := coalesce(new.created_at, now()) + make_interval(months => v_months);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists loyalty_ledger_expiry on public.loyalty_ledger;
create trigger loyalty_ledger_expiry before insert on public.loyalty_ledger
  for each row execute function public.loyalty_set_expiry();

-- Points that have expired but are not yet written off. Spending and other
-- deductions use up the oldest points first, so whatever expired credit is
-- left after all deductions is what has lapsed.
create or replace function public.loyalty_pending_expiry(p_customer uuid, p_at timestamptz default now())
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    coalesce(sum(points) filter (where points > 0 and expires_at is not null and expires_at <= p_at), 0)
      - coalesce(sum(-points) filter (where points < 0), 0)
  )::int
  from public.loyalty_ledger where customer_id = p_customer;
$$;
revoke all on function public.loyalty_pending_expiry(uuid, timestamptz) from public;

-- Balance = all entries minus anything that has lapsed and isn't written off yet.
create or replace function public.loyalty_balance(p_customer uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (coalesce((select sum(points) from public.loyalty_ledger where customer_id = p_customer), 0)
          - public.loyalty_pending_expiry(p_customer))::int;
$$;
revoke all on function public.loyalty_balance(uuid) from public;

-- Writes off lapsed points as 'expire' entries (daily job; also run before spending).
create or replace function public.loyalty_expire(p_customer uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_total integer := 0;
  v_due integer;
begin
  for r in
    select distinct customer_id from public.loyalty_ledger
    where (p_customer is null or customer_id = p_customer) and expires_at is not null and expires_at <= now()
  loop
    v_due := public.loyalty_pending_expiry(r.customer_id);
    if v_due > 0 then
      insert into public.loyalty_ledger (customer_id, points, kind, note)
      values (r.customer_id, -v_due, 'expire', 'Points expired');
      v_total := v_total + v_due;
    end if;
  end loop;
  return v_total;
end;
$$;
revoke all on function public.loyalty_expire(uuid) from public, anon, authenticated;

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
  perform public.loyalty_expire(p_customer);
  if public.loyalty_balance(p_customer) < p_points then
    raise exception 'Not enough points.';
  end if;
  insert into public.loyalty_ledger (customer_id, points, kind, checkout_group, note)
  values (p_customer, -p_points, 'redeem', p_group, 'Used at checkout');
end;
$$;
revoke all on function public.loyalty_spend(uuid, integer, uuid) from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'kmo-loyalty-expire';
select cron.schedule('kmo-loyalty-expire', '15 19 * * *', $$select public.loyalty_expire()$$); -- 00:15 Karachi time

-- ---------------------------------------------------------------- referrals
alter table public.profiles add column if not exists referral_code text unique;

create table if not exists public.loyalty_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referee_id uuid not null unique references public.profiles (id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  order_id uuid references public.orders (id) on delete set null,
  check (referrer_id <> referee_id)
);
alter table public.loyalty_referrals enable row level security;
create policy "loyalty_referrals_own_select" on public.loyalty_referrals for select
  using (referrer_id = auth.uid() or referee_id = auth.uid());
create policy "loyalty_referrals_admin_select" on public.loyalty_referrals for select
  using (public.is_admin(auth.uid()) or public.staff_can('loyalty'));

-- The signed-in customer's code, created on first use (KMO + 6 letters/digits).
create or replace function public.my_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_try text;
begin
  if auth.uid() is null then
    return null;
  end if;
  select referral_code into v_code from public.profiles where id = auth.uid();
  while v_code is null loop
    -- 6 easy-to-read letters/digits (no O/0/I/l/1)
    v_try := 'KMO' || upper(substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=OoIil01', ''), 1, 6));
    if length(v_try) = 9 then
      begin
        update public.profiles set referral_code = v_try where id = auth.uid() and referral_code is null;
      exception when unique_violation then
        null;
      end;
      select referral_code into v_code from public.profiles where id = auth.uid();
    end if;
  end loop;
  return v_code;
end;
$$;
grant execute on function public.my_referral_code() to authenticated;

-- A new customer links themselves to a friend's code. Only for new accounts
-- (under 30 days, no orders yet), once, never your own code.
create or replace function public.claim_referral(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer record;
  v_me record;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.';
  end if;
  if not exists (select 1 from public.platform_settings where loyalty_enabled and loyalty_referrer_points + loyalty_referee_points > 0) then
    raise exception 'Referrals are not running right now.';
  end if;
  select id, full_name into v_referrer from public.profiles where referral_code = upper(trim(p_code));
  if v_referrer.id is null then
    raise exception 'That referral code was not found.';
  end if;
  if v_referrer.id = auth.uid() then
    raise exception 'You can''t use your own code.';
  end if;
  if exists (select 1 from public.loyalty_referrals where referee_id = auth.uid()) then
    raise exception 'You have already used a referral code.';
  end if;
  select created_at, role into v_me from public.profiles where id = auth.uid();
  if v_me.role <> 'customer' or v_me.created_at < now() - interval '30 days'
     or exists (select 1 from public.orders where customer_id = auth.uid()) then
    raise exception 'Referral codes are for new customers before their first order.';
  end if;
  insert into public.loyalty_referrals (referrer_id, referee_id, code)
  values (v_referrer.id, auth.uid(), upper(trim(p_code)));
  return coalesce(split_part(v_referrer.full_name, ' ', 1), 'your friend');
end;
$$;
grant execute on function public.claim_referral(text) to authenticated;

create or replace function public.admin_loyalty_referrals()
returns table (id uuid, referrer_name text, referee_name text, code text, created_at timestamptz, rewarded_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, a.full_name, b.full_name, r.code, r.created_at, r.rewarded_at
  from public.loyalty_referrals r
  join public.profiles a on a.id = r.referrer_id
  join public.profiles b on b.id = r.referee_id
  where public.is_admin(auth.uid()) or public.staff_can('loyalty')
  order by r.created_at desc;
$$;
grant execute on function public.admin_loyalty_referrals() to authenticated;

-- ---------------------------------------------------------------- delivery trigger
create or replace function public.loyalty_on_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  v_delivered integer;
  v_ref record;
  v_bonus integer;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  select loyalty_enabled, loyalty_repeat_every, loyalty_repeat_bonus_points,
         loyalty_referrer_points, loyalty_referee_points
    into s from public.platform_settings limit 1;

  if new.status = 'delivered' then
    if new.loyalty_points_to_earn > 0 and not new.loyalty_points_awarded then
      insert into public.loyalty_ledger (customer_id, points, kind, order_id, note)
      values (new.customer_id, new.loyalty_points_to_earn, 'earn', new.id, 'Order ' || new.order_number || ' delivered');
      new.loyalty_points_awarded := true;
    end if;

    if s.loyalty_enabled then
      -- Repeat-purchase bonus on every Nth delivered order (this one included).
      select count(*) + 1 into v_delivered from public.orders
        where customer_id = new.customer_id and status = 'delivered' and id <> new.id;
      if s.loyalty_repeat_every > 0 and s.loyalty_repeat_bonus_points > 0
         and v_delivered % s.loyalty_repeat_every = 0
         and not exists (select 1 from public.loyalty_ledger where order_id = new.id and kind = 'bonus') then
        insert into public.loyalty_ledger (customer_id, points, kind, order_id, note)
        values (new.customer_id, s.loyalty_repeat_bonus_points, 'bonus', new.id,
                'Bonus for your ' || v_delivered || case
                  when v_delivered % 100 in (11, 12, 13) then 'th'
                  when v_delivered % 10 = 1 then 'st'
                  when v_delivered % 10 = 2 then 'nd'
                  when v_delivered % 10 = 3 then 'rd' else 'th' end || ' order');
      end if;

      -- Referral reward when a referred customer's first order is delivered.
      select * into v_ref from public.loyalty_referrals
        where referee_id = new.customer_id and rewarded_at is null for update;
      if v_ref.id is not null then
        if s.loyalty_referee_points > 0 then
          insert into public.loyalty_ledger (customer_id, points, kind, order_id, note)
          values (new.customer_id, s.loyalty_referee_points, 'referral', new.id, 'Welcome reward for joining with a friend''s code');
        end if;
        if s.loyalty_referrer_points > 0 then
          insert into public.loyalty_ledger (customer_id, points, kind, order_id, note)
          values (v_ref.referrer_id, s.loyalty_referrer_points, 'referral', new.id, 'A friend you referred got their first order');
        end if;
        update public.loyalty_referrals set rewarded_at = now(), order_id = new.id where id = v_ref.id;
      end if;
    end if;
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
    -- A bonus given for this order goes too (referral rewards stay: the friend did join).
    select coalesce(sum(points), 0) into v_bonus from public.loyalty_ledger
      where order_id = new.id and kind in ('bonus', 'reverse_bonus');
    if v_bonus > 0 then
      insert into public.loyalty_ledger (customer_id, points, kind, order_id, note)
      values (new.customer_id, -v_bonus, 'reverse_bonus', new.id, 'Bonus removed: order ' || new.order_number || ' ' || new.status::text);
    end if;
  end if;

  return new;
end;
$$;

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
    'rule', case when r.id is null then null else jsonb_build_object(
      'name', r.name, 'spend_pkr', r.spend_pkr, 'points', r.points, 'ends_at', r.ends_at) end
  );
end;
$$;
grant execute on function public.my_loyalty() to anon, authenticated;

-- Admin balances now net of lapsed points.
create or replace function public.admin_loyalty_balances()
returns table (customer_id uuid, full_name text, phone text, balance integer, last_activity timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select l.customer_id, p.full_name, p.phone, public.loyalty_balance(l.customer_id), max(l.created_at)
  from public.loyalty_ledger l join public.profiles p on p.id = l.customer_id
  where public.is_admin(auth.uid()) or public.staff_can('loyalty')
  group by l.customer_id, p.full_name, p.phone
  order by 4 desc;
$$;

-- ---------------------------------------------------------------- vendor referrals
alter table public.vendors
  add column if not exists referred_by_vendor_id uuid references public.vendors (id) on delete set null;

-- Vendors may not set who referred them; KMO records it.
create or replace function public.vendors_tier_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.loyalty_tier is distinct from old.loyalty_tier
      or new.referred_by_vendor_id is distinct from old.referred_by_vendor_id)
     and auth.uid() is not null
     and not (public.is_admin(auth.uid()) or public.staff_can('vendors')) then
    raise exception 'Only KMO can change a vendor tier or referral.';
  end if;
  if new.referred_by_vendor_id = new.id then
    raise exception 'A vendor can''t refer itself.';
  end if;
  return new;
end;
$$;

-- Stores a vendor has brought to KMO (for their dashboard and the admin).
create or replace function public.vendor_referrals(p_vendor uuid)
returns table (store_name text, joined_at timestamptz, verification_status text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_admin(auth.uid()) or public.staff_can('vendors')
          or exists (select 1 from public.vendors where id = p_vendor and owner_id = auth.uid())) then
    raise exception 'Not allowed.';
  end if;
  return query
    select v.store_name, v.created_at, v.verification_status::text
    from public.vendors v where v.referred_by_vendor_id = p_vendor order by v.created_at desc;
end;
$$;
grant execute on function public.vendor_referrals(uuid) to authenticated;
