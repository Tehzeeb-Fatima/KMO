-- Fills gaps flagged after Modules 1-15: coupon-at-checkout tracking, richer
-- product fields (brand/tags/weight/SEO/low-stock), admin audit logs,
-- vendor<->customer messaging, and a persisted contact form.

-- ── coupons applied at checkout ─────────────────────────────────────────────
alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists discount_amount numeric(12, 2) not null default 0;

-- ── richer product fields (PRD §5) ──────────────────────────────────────────
alter table public.products
  add column if not exists brand text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists weight_grams integer,
  add column if not exists low_stock_threshold integer not null default 15,
  add column if not exists seo_title text,
  add column if not exists seo_description text;

-- ── audit_logs (admin actions) ──────────────────────────────────────────────
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id),
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

create policy "audit_logs_admin_select"
  on public.audit_logs for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "audit_logs_admin_insert"
  on public.audit_logs for insert
  with check (
    actor_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ── messaging (vendor <-> customer) ─────────────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, vendor_id)
);

alter table public.conversations enable row level security;

create policy "conversations_customer_all"
  on public.conversations for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "conversations_vendor_all"
  on public.conversations for all
  using (exists (select 1 from public.vendors v where v.id = conversations.vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = conversations.vendor_id and v.owner_id = auth.uid()));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id);

alter table public.messages enable row level security;

create policy "messages_participant_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      left join public.vendors v on v.id = c.vendor_id
      where c.id = messages.conversation_id
        and (c.customer_id = auth.uid() or v.owner_id = auth.uid())
    )
  );

create policy "messages_participant_insert"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      left join public.vendors v on v.id = c.vendor_id
      where c.id = messages.conversation_id
        and (c.customer_id = auth.uid() or v.owner_id = auth.uid())
    )
  );

create policy "messages_participant_update_read"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      left join public.vendors v on v.id = c.vendor_id
      where c.id = messages.conversation_id
        and (c.customer_id = auth.uid() or v.owner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      left join public.vendors v on v.id = c.vendor_id
      where c.id = messages.conversation_id
        and (c.customer_id = auth.uid() or v.owner_id = auth.uid())
    )
  );

-- ── contact form submissions ─────────────────────────────────────────────────
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Anyone (including a signed-out visitor) can submit the contact form.
create policy "contact_messages_public_insert"
  on public.contact_messages for insert
  with check (true);

create policy "contact_messages_admin_select"
  on public.contact_messages for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "contact_messages_admin_update"
  on public.contact_messages for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
