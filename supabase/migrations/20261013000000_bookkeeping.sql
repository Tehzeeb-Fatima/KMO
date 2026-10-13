-- Bookkeeping (phase 1): super-admin-only expenses, monthly expenses and
-- partner capital, unlocked per device with an emailed code.
--
-- Security model
--   * Only accounts listed in bk_super_admins can use it (karachimart super admin).
--   * Every bk_* table has RLS on and NO policies, so nothing can be read or
--     written through the API directly. All access goes through the
--     SECURITY DEFINER functions below, which require an unlock session.
--   * An unlock session is created by the bookkeeping-auth edge function after
--     a code emailed to one of the people in bk_people is entered. The session
--     token is only stored hashed; it records which person unlocked, so every
--     entry is tagged with their name.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- access
create table public.bk_super_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.bk_super_admins enable row level security;

insert into public.bk_super_admins (user_id)
select id from auth.users where email = 'karachimartonline537@gmail.com'
on conflict do nothing;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.bk_super_admins where user_id = auth.uid());
$$;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- People who receive unlock codes (personal emails, never shown in the UI).
create table public.bk_people (
  key text primary key,
  name text not null,
  email text not null
);
alter table public.bk_people enable row level security;

insert into public.bk_people (key, name, email) values
  ('tehzeeb', 'Tehzeeb', 'tehzeeb.pirani@gmail.com'),
  ('talha', 'Talha', 'talhadogar102@gmail.com')
on conflict (key) do nothing;

create table public.bk_code_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz
);
alter table public.bk_code_requests enable row level security;

create table public.bk_codes (
  request_id uuid not null references public.bk_code_requests (id) on delete cascade,
  person_key text not null references public.bk_people (key),
  code_hash text not null,
  primary key (request_id, person_key)
);
alter table public.bk_codes enable row level security;

create table public.bk_sessions (
  token_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  person_key text not null references public.bk_people (key),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.bk_sessions enable row level security;

-- Name of the person whose unlock session this is; raises if locked.
create or replace function public.bk_person(p_session text)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
begin
  if p_session is null or not public.is_super_admin() then
    raise exception 'BK_LOCKED';
  end if;
  select s.person_key into v_key
  from public.bk_sessions s
  where s.token_hash = encode(extensions.digest(p_session, 'sha256'), 'hex')
    and s.user_id = auth.uid()
    and s.expires_at > now();
  if v_key is null then
    raise exception 'BK_LOCKED';
  end if;
  return v_key;
end;
$$;
revoke all on function public.bk_person(text) from public;

-- ---------------------------------------------------------------- data
create table public.bk_expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.bk_expense_categories enable row level security;

insert into public.bk_expense_categories (name, sort_order) values
  ('Marketing & Ads', 1),
  ('Software & Subscriptions', 2),
  ('Domain & Hosting', 3),
  ('Courier & Delivery', 4),
  ('Packaging', 5),
  ('Office & Supplies', 6),
  ('Salaries & Staff', 7),
  ('Legal & Registration', 8),
  ('Bank & Payment Charges', 9),
  ('Other', 99)
on conflict (name) do nothing;

create table public.bk_recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category_id uuid references public.bk_expense_categories (id) on delete set null,
  amount_pkr numeric(14, 2) not null check (amount_pkr >= 0),
  amount_usd numeric(12, 2) check (amount_usd >= 0),
  paid_by text not null check (paid_by in ('tehzeeb', 'talha', 'kmo')),
  payment_method text,
  day_of_month integer not null default 1 check (day_of_month between 1 and 28),
  start_month date not null,
  end_month date,
  active boolean not null default true,
  notes text,
  created_by text references public.bk_people (key),
  created_at timestamptz not null default now(),
  updated_by text references public.bk_people (key),
  updated_at timestamptz not null default now()
);
alter table public.bk_recurring_expenses enable row level security;

create table public.bk_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category_id uuid references public.bk_expense_categories (id) on delete set null,
  description text not null,
  amount_pkr numeric(14, 2) not null check (amount_pkr >= 0),
  amount_usd numeric(12, 2) check (amount_usd >= 0),
  paid_by text not null check (paid_by in ('tehzeeb', 'talha', 'kmo')),
  payment_method text,
  notes text,
  receipt_path text,
  recurring_id uuid references public.bk_recurring_expenses (id) on delete set null,
  period_month date,
  created_by text references public.bk_people (key),
  created_at timestamptz not null default now(),
  updated_by text references public.bk_people (key),
  updated_at timestamptz not null default now(),
  unique (recurring_id, period_month)
);
alter table public.bk_expenses enable row level security;
create index bk_expenses_date_idx on public.bk_expenses (expense_date desc);

create table public.bk_capital (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  partner text not null check (partner in ('tehzeeb', 'talha')),
  kind text not null check (kind in ('investment', 'withdrawal')),
  amount_pkr numeric(14, 2) not null check (amount_pkr > 0),
  notes text,
  created_by text references public.bk_people (key),
  created_at timestamptz not null default now(),
  updated_by text references public.bk_people (key),
  updated_at timestamptz not null default now()
);
alter table public.bk_capital enable row level security;

create table public.bk_activity (
  id bigserial primary key,
  at timestamptz not null default now(),
  person_key text references public.bk_people (key),
  action text not null,
  entity text,
  entity_id uuid,
  details jsonb
);
alter table public.bk_activity enable row level security;

-- Receipts: private bucket, super admin only (files are opened via short-lived signed URLs).
insert into storage.buckets (id, name, public) values ('bk-receipts', 'bk-receipts', false)
on conflict (id) do nothing;
create policy "bk_receipts_super_admin_read" on storage.objects for select to authenticated
  using (bucket_id = 'bk-receipts' and public.is_super_admin());
create policy "bk_receipts_super_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'bk-receipts' and public.is_super_admin());
create policy "bk_receipts_super_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'bk-receipts' and public.is_super_admin());

-- ---------------------------------------------------------------- api
create or replace function public.bk_status(p_session text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_row record;
begin
  if not public.is_super_admin() then
    return jsonb_build_object('super_admin', false);
  end if;
  select s.person_key, p.name, s.expires_at into v_row
  from public.bk_sessions s join public.bk_people p on p.key = s.person_key
  where p_session is not null
    and s.token_hash = encode(extensions.digest(p_session, 'sha256'), 'hex')
    and s.user_id = auth.uid()
    and s.expires_at > now();
  return jsonb_build_object(
    'super_admin', true,
    'unlocked', v_row.person_key is not null,
    'person', v_row.person_key,
    'person_name', v_row.name,
    'expires_at', v_row.expires_at
  );
end;
$$;

create or replace function public.bk_lock(p_session text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_person text := public.bk_person(p_session);
begin
  delete from public.bk_sessions where token_hash = encode(extensions.digest(p_session, 'sha256'), 'hex');
  insert into public.bk_activity (person_key, action) values (v_person, 'locked');
end;
$$;

-- Creates this month's (and any missed months') entries for monthly expenses.
create or replace function public.bk_generate_recurring(p_session text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person text := public.bk_person(p_session);
  r record;
  m date;
  v_last date := date_trunc('month', current_date)::date;
  v_count integer := 0;
  v_day date;
begin
  for r in select * from public.bk_recurring_expenses where active loop
    m := date_trunc('month', r.start_month)::date;
    while m <= v_last and (r.end_month is null or m <= date_trunc('month', r.end_month)::date) loop
      v_day := m + (least(r.day_of_month, extract(day from (m + interval '1 month - 1 day'))::int) - 1);
      if v_day <= current_date then
        insert into public.bk_expenses (
          expense_date, category_id, description, amount_pkr, amount_usd, paid_by, payment_method,
          notes, recurring_id, period_month, created_by, updated_by
        ) values (
          v_day, r.category_id, r.description, r.amount_pkr, r.amount_usd, r.paid_by, r.payment_method,
          r.notes, r.id, m, v_person, v_person
        )
        on conflict (recurring_id, period_month) do nothing;
        if found then
          v_count := v_count + 1;
        end if;
      end if;
      m := (m + interval '1 month')::date;
    end loop;
  end loop;
  if v_count > 0 then
    insert into public.bk_activity (person_key, action, entity, details)
    values (v_person, 'generated monthly expenses', 'expense', jsonb_build_object('count', v_count));
  end if;
  return v_count;
end;
$$;

create or replace function public.bk_categories(p_session text)
returns setof public.bk_expense_categories
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.bk_person(p_session);
  return query select * from public.bk_expense_categories order by sort_order, name;
end;
$$;

create or replace function public.bk_save_category(p_session text, p_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person text := public.bk_person(p_session);
  v_id uuid;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Enter a category name.';
  end if;
  if p_id is null then
    insert into public.bk_expense_categories (name, sort_order)
    values (trim(p_name), 50) returning id into v_id;
  else
    update public.bk_expense_categories set name = trim(p_name) where id = p_id returning id into v_id;
  end if;
  insert into public.bk_activity (person_key, action, entity, entity_id, details)
  values (v_person, case when p_id is null then 'added category' else 'renamed category' end, 'category', v_id,
          jsonb_build_object('name', trim(p_name)));
  return v_id;
end;
$$;

create or replace function public.bk_delete_category(p_session text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person text := public.bk_person(p_session);
  v_name text;
begin
  if exists (select 1 from public.bk_expenses where category_id = p_id)
     or exists (select 1 from public.bk_recurring_expenses where category_id = p_id) then
    raise exception 'This category has expenses. Move them to another category first.';
  end if;
  delete from public.bk_expense_categories where id = p_id returning name into v_name;
  insert into public.bk_activity (person_key, action, entity, entity_id, details)
  values (v_person, 'deleted category', 'category', p_id, jsonb_build_object('name', v_name));
end;
$$;

create or replace function public.bk_expenses_list(p_session text)
returns setof public.bk_expenses
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.bk_person(p_session);
  return query select * from public.bk_expenses order by expense_date desc, created_at desc;
end;
$$;

create or replace function public.bk_save_expense(p_session text, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person text := public.bk_person(p_session);
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if coalesce(trim(p ->> 'description'), '') = '' then
    raise exception 'Enter what the expense was for.';
  end if;
  if v_id is null then
    insert into public.bk_expenses (
      expense_date, category_id, description, amount_pkr, amount_usd, paid_by, payment_method,
      notes, receipt_path, created_by, updated_by
    ) values (
      (p ->> 'expense_date')::date, nullif(p ->> 'category_id', '')::uuid, trim(p ->> 'description'),
      (p ->> 'amount_pkr')::numeric, nullif(p ->> 'amount_usd', '')::numeric, p ->> 'paid_by',
      nullif(p ->> 'payment_method', ''), nullif(p ->> 'notes', ''), nullif(p ->> 'receipt_path', ''),
      v_person, v_person
    ) returning id into v_id;
    insert into public.bk_activity (person_key, action, entity, entity_id, details)
    values (v_person, 'added expense', 'expense', v_id, p - 'id');
  else
    update public.bk_expenses set
      expense_date = (p ->> 'expense_date')::date,
      category_id = nullif(p ->> 'category_id', '')::uuid,
      description = trim(p ->> 'description'),
      amount_pkr = (p ->> 'amount_pkr')::numeric,
      amount_usd = nullif(p ->> 'amount_usd', '')::numeric,
      paid_by = p ->> 'paid_by',
      payment_method = nullif(p ->> 'payment_method', ''),
      notes = nullif(p ->> 'notes', ''),
      receipt_path = nullif(p ->> 'receipt_path', ''),
      updated_by = v_person,
      updated_at = now()
    where id = v_id;
    insert into public.bk_activity (person_key, action, entity, entity_id, details)
    values (v_person, 'edited expense', 'expense', v_id, p - 'id');
  end if;
  return v_id;
end;
$$;

create or replace function public.bk_delete_expense(p_session text, p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person text := public.bk_person(p_session);
  v_row public.bk_expenses;
begin
  delete from public.bk_expenses where id = p_id returning * into v_row;
  insert into public.bk_activity (person_key, action, entity, entity_id, details)
  values (v_person, 'deleted expense', 'expense', p_id, to_jsonb(v_row));
  return v_row.receipt_path;
end;
$$;

create or replace function public.bk_recurring_list(p_session text)
returns setof public.bk_recurring_expenses
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.bk_person(p_session);
  return query select * from public.bk_recurring_expenses order by active desc, description;
end;
$$;

create or replace function public.bk_save_recurring(p_session text, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person text := public.bk_person(p_session);
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if coalesce(trim(p ->> 'description'), '') = '' then
    raise exception 'Enter what the monthly expense is for.';
  end if;
  if v_id is null then
    insert into public.bk_recurring_expenses (
      description, category_id, amount_pkr, amount_usd, paid_by, payment_method, day_of_month,
      start_month, end_month, active, notes, created_by, updated_by
    ) values (
      trim(p ->> 'description'), nullif(p ->> 'category_id', '')::uuid, (p ->> 'amount_pkr')::numeric,
      nullif(p ->> 'amount_usd', '')::numeric, p ->> 'paid_by', nullif(p ->> 'payment_method', ''),
      coalesce(nullif(p ->> 'day_of_month', '')::int, 1),
      date_trunc('month', (p ->> 'start_month')::date)::date,
      date_trunc('month', nullif(p ->> 'end_month', '')::date)::date,
      coalesce((p ->> 'active')::boolean, true), nullif(p ->> 'notes', ''), v_person, v_person
    ) returning id into v_id;
    insert into public.bk_activity (person_key, action, entity, entity_id, details)
    values (v_person, 'added monthly expense', 'recurring', v_id, p - 'id');
  else
    update public.bk_recurring_expenses set
      description = trim(p ->> 'description'),
      category_id = nullif(p ->> 'category_id', '')::uuid,
      amount_pkr = (p ->> 'amount_pkr')::numeric,
      amount_usd = nullif(p ->> 'amount_usd', '')::numeric,
      paid_by = p ->> 'paid_by',
      payment_method = nullif(p ->> 'payment_method', ''),
      day_of_month = coalesce(nullif(p ->> 'day_of_month', '')::int, 1),
      start_month = date_trunc('month', (p ->> 'start_month')::date)::date,
      end_month = date_trunc('month', nullif(p ->> 'end_month', '')::date)::date,
      active = coalesce((p ->> 'active')::boolean, true),
      notes = nullif(p ->> 'notes', ''),
      updated_by = v_person,
      updated_at = now()
    where id = v_id;
    insert into public.bk_activity (person_key, action, entity, entity_id, details)
    values (v_person, 'edited monthly expense', 'recurring', v_id, p - 'id');
  end if;
  return v_id;
end;
$$;

create or replace function public.bk_delete_recurring(p_session text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person text := public.bk_person(p_session);
  v_row public.bk_recurring_expenses;
begin
  -- Expenses it already created stay; they just stop being linked to it.
  delete from public.bk_recurring_expenses where id = p_id returning * into v_row;
  insert into public.bk_activity (person_key, action, entity, entity_id, details)
  values (v_person, 'deleted monthly expense', 'recurring', p_id, to_jsonb(v_row));
end;
$$;

create or replace function public.bk_capital_list(p_session text)
returns setof public.bk_capital
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.bk_person(p_session);
  return query select * from public.bk_capital order by entry_date desc, created_at desc;
end;
$$;

create or replace function public.bk_save_capital(p_session text, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person text := public.bk_person(p_session);
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if v_id is null then
    insert into public.bk_capital (entry_date, partner, kind, amount_pkr, notes, created_by, updated_by)
    values ((p ->> 'entry_date')::date, p ->> 'partner', p ->> 'kind', (p ->> 'amount_pkr')::numeric,
            nullif(p ->> 'notes', ''), v_person, v_person)
    returning id into v_id;
    insert into public.bk_activity (person_key, action, entity, entity_id, details)
    values (v_person, 'added partner entry', 'capital', v_id, p - 'id');
  else
    update public.bk_capital set
      entry_date = (p ->> 'entry_date')::date,
      partner = p ->> 'partner',
      kind = p ->> 'kind',
      amount_pkr = (p ->> 'amount_pkr')::numeric,
      notes = nullif(p ->> 'notes', ''),
      updated_by = v_person,
      updated_at = now()
    where id = v_id;
    insert into public.bk_activity (person_key, action, entity, entity_id, details)
    values (v_person, 'edited partner entry', 'capital', v_id, p - 'id');
  end if;
  return v_id;
end;
$$;

create or replace function public.bk_delete_capital(p_session text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person text := public.bk_person(p_session);
  v_row public.bk_capital;
begin
  delete from public.bk_capital where id = p_id returning * into v_row;
  insert into public.bk_activity (person_key, action, entity, entity_id, details)
  values (v_person, 'deleted partner entry', 'capital', p_id, to_jsonb(v_row));
end;
$$;

create or replace function public.bk_activity_list(p_session text)
returns setof public.bk_activity
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.bk_person(p_session);
  return query select * from public.bk_activity order by at desc limit 300;
end;
$$;

-- Execute rights: signed-in users only; each function still checks super admin + session.
do $$
declare
  f text;
begin
  foreach f in array array[
    'bk_status(text)', 'bk_lock(text)', 'bk_generate_recurring(text)', 'bk_categories(text)',
    'bk_save_category(text,uuid,text)', 'bk_delete_category(text,uuid)', 'bk_expenses_list(text)',
    'bk_save_expense(text,jsonb)', 'bk_delete_expense(text,uuid)', 'bk_recurring_list(text)',
    'bk_save_recurring(text,jsonb)', 'bk_delete_recurring(text,uuid)', 'bk_capital_list(text)',
    'bk_save_capital(text,jsonb)', 'bk_delete_capital(text,uuid)', 'bk_activity_list(text)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
