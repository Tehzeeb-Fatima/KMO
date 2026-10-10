-- The delivery details are copied onto each order when it is placed, so the
-- vendor can see where to ship (they cannot read the customer's address book)
-- and later edits or deletions of a saved address don't change past orders.
alter table public.orders
  add column if not exists ship_name text,
  add column if not exists ship_phone text,
  add column if not exists ship_address_line text,
  add column if not exists ship_area text,
  add column if not exists ship_city text;

update public.orders o
set ship_name = a.full_name,
    ship_phone = a.phone,
    ship_address_line = a.address_line,
    ship_area = a.area,
    ship_city = a.city
from public.addresses a
where a.id = o.address_id and o.ship_address_line is null;
