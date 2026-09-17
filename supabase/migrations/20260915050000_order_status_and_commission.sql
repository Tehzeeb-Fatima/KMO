-- Module 6/9: full order status lifecycle (PRD §11) + commission snapshot (PRD §8)

alter type public.order_status add value if not exists 'confirmed' before 'processing';
alter type public.order_status add value if not exists 'ready_to_ship' after 'processing';
alter type public.order_status add value if not exists 'out_for_delivery' after 'shipped';
alter type public.order_status add value if not exists 'returned';

-- Historical orders must retain the commission rate applicable at the time
-- of sale (PRD §8) — snapshot it onto the order row at creation time rather
-- than always reading the vendor's current rate.
alter table public.orders
  add column if not exists commission_rate numeric(5, 2) not null default 8,
  add column if not exists commission_amount numeric(12, 2) not null default 0,
  add column if not exists net_amount numeric(12, 2) not null default 0,
  add column if not exists payout_id uuid;
