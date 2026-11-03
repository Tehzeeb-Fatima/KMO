-- Admin-set tag (e.g. "11.11 SALE") shown next to the "-X%" badge on every
-- discounted product while product discounts are on.
alter table public.platform_settings
  add column if not exists sale_tag_text text
  check (sale_tag_text is null or char_length(sale_tag_text) <= 24);
