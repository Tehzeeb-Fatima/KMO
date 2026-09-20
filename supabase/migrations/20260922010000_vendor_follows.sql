-- Lets a signed-in (or guest/anonymous) customer follow a vendor's store.

create table public.vendor_follows (
  customer_id uuid not null references public.profiles (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, vendor_id)
);

create index vendor_follows_vendor_id_idx on public.vendor_follows (vendor_id);

alter table public.vendor_follows enable row level security;

create policy "vendor_follows_owner_all"
  on public.vendor_follows for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());
