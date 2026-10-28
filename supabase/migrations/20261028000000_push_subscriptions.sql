-- Web Push subscriptions, so the admin dashboard can send a real push
-- notification to the admin's phone/browser when a new order comes in
-- (not just the in-app notification bell). One row per device/browser the
-- admin has enabled notifications on.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_own_select"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "push_subscriptions_own_insert"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "push_subscriptions_own_delete"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());
