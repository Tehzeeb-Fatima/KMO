-- PDP "Questions" tab (Karachi Mart Online - Desktop.html): customers ask a
-- question on a product, the vendor answers it — distinct from reviews.

create table public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  question text not null,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index product_questions_product_id_idx on public.product_questions (product_id);

alter table public.product_questions enable row level security;

create policy "product_questions_public_select"
  on public.product_questions for select
  using (true);

create policy "product_questions_customer_insert"
  on public.product_questions for insert
  with check (customer_id = auth.uid());

create policy "product_questions_vendor_answer"
  on public.product_questions for update
  using (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_questions.product_id and v.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products pr
      join public.vendors v on v.id = pr.vendor_id
      where pr.id = product_questions.product_id and v.owner_id = auth.uid()
    )
  );

create policy "product_questions_admin_all"
  on public.product_questions for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
