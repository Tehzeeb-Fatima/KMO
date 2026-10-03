-- Admin-editable label shown on promoted product cards and the product page
-- (e.g. "Flash Sale", "Eid Special"). NULL falls back to the "-X%" discount badge.
alter table public.promotions add column if not exists badge_text text;
