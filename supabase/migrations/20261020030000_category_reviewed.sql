-- The category a person confirmed as right for a product. The daily check and the
-- admin review list stop flagging that product while its category stays the same.
alter table public.products add column if not exists category_reviewed_id uuid references public.categories (id) on delete set null;
