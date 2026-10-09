-- Stock is optional: null means the vendor doesn't track stock for this
-- product/variant, so it is always available and place_order skips the
-- check and the decrement. A number (including 0) is tracked as before.
alter table public.products alter column stock_quantity drop not null;
alter table public.products alter column stock_quantity set default null;
alter table public.product_variants alter column stock_quantity drop not null;
alter table public.product_variants alter column stock_quantity set default null;
