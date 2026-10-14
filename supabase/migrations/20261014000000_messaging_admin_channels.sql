-- Messaging, module 2: admin can message any customer or vendor directly
-- (and they can reply), admin can read every customer<->vendor conversation
-- for oversight, and a vendor can no longer delete a conversation (archiving
-- isn't offered in the UI either way — this closes it off at the database
-- too). A customer keeps full control of their own conversations.

alter table public.conversations
  alter column customer_id drop not null,
  alter column vendor_id drop not null,
  add column channel text not null default 'customer_vendor'
    check (channel in ('customer_vendor', 'admin_customer', 'admin_vendor')),
  add constraint conversations_channel_shape check (
    (channel = 'customer_vendor' and customer_id is not null and vendor_id is not null)
    or (channel = 'admin_customer' and customer_id is not null and vendor_id is null)
    or (channel = 'admin_vendor' and vendor_id is not null and customer_id is null)
  );

-- One admin thread per customer / per vendor — any admin can open and use it,
-- so it isn't tied to a specific admin's id.
create unique index conversations_admin_customer_key on public.conversations (customer_id) where channel = 'admin_customer';
create unique index conversations_admin_vendor_key on public.conversations (vendor_id) where channel = 'admin_vendor';

-- ── conversations ─────────────────────────────────────────────────────────

drop policy if exists "conversations_vendor_all" on public.conversations;

create policy "conversations_vendor_select"
  on public.conversations for select
  using (exists (select 1 from public.vendors v where v.id = conversations.vendor_id and v.owner_id = auth.uid()));

create policy "conversations_vendor_insert"
  on public.conversations for insert
  with check (exists (select 1 from public.vendors v where v.id = conversations.vendor_id and v.owner_id = auth.uid()));

create policy "conversations_vendor_update"
  on public.conversations for update
  using (exists (select 1 from public.vendors v where v.id = conversations.vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = conversations.vendor_id and v.owner_id = auth.uid()));

-- No vendor delete policy — a vendor can read and reply, never delete.

create policy "conversations_admin_select"
  on public.conversations for select
  using (public.is_admin(auth.uid()));

create policy "conversations_admin_insert"
  on public.conversations for insert
  with check (public.is_admin(auth.uid()) and channel in ('admin_customer', 'admin_vendor'));

create policy "conversations_admin_update"
  on public.conversations for update
  using (public.is_admin(auth.uid()) and channel in ('admin_customer', 'admin_vendor'))
  with check (public.is_admin(auth.uid()) and channel in ('admin_customer', 'admin_vendor'));

create policy "conversations_admin_delete"
  on public.conversations for delete
  using (public.is_admin(auth.uid()) and channel in ('admin_customer', 'admin_vendor'));

-- ── messages ──────────────────────────────────────────────────────────────

drop policy if exists "messages_participant_select" on public.messages;
create policy "messages_participant_select"
  on public.messages for select
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.conversations c
      left join public.vendors v on v.id = c.vendor_id
      where c.id = messages.conversation_id
        and (c.customer_id = auth.uid() or v.owner_id = auth.uid())
    )
  );

drop policy if exists "messages_participant_insert" on public.messages;
create policy "messages_participant_insert"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      left join public.vendors v on v.id = c.vendor_id
      where c.id = messages.conversation_id
        and (
          c.customer_id = auth.uid()
          or v.owner_id = auth.uid()
          or (public.is_admin(auth.uid()) and c.channel in ('admin_customer', 'admin_vendor'))
        )
    )
  );

drop policy if exists "messages_participant_update_read" on public.messages;
create policy "messages_participant_update_read"
  on public.messages for update
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.conversations c
      left join public.vendors v on v.id = c.vendor_id
      where c.id = messages.conversation_id
        and (c.customer_id = auth.uid() or v.owner_id = auth.uid())
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.conversations c
      left join public.vendors v on v.id = c.vendor_id
      where c.id = messages.conversation_id
        and (c.customer_id = auth.uid() or v.owner_id = auth.uid())
    )
  );

-- Lets an admin grant the new "Messages" section to a staff user.
do $$
declare
  d text;
begin
  select pg_get_functiondef('public.admin_set_user_role(uuid, public.user_role, text[])'::regprocedure) into d;
  if position('''messages''' in d) = 0 then
    d := replace(d, '''settings'', ''loyalty''', '''settings'', ''loyalty'', ''messages''');
    execute d;
  end if;
end;
$$;
