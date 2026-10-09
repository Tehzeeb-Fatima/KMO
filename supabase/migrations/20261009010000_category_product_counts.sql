-- Published-product count per category, so the storefront can hide empty
-- categories (they stay in the table and reappear as soon as a product is
-- published in them). security_invoker keeps the products RLS in force.
create or replace view public.category_product_counts
with (security_invoker = true) as
select category_id, count(*)::int as product_count
from public.products
where status = 'published' and category_id is not null
group by category_id;

grant select on public.category_product_counts to anon, authenticated;
