-- Lets admin define an open-ended slab (e.g. "2.01kg and above") instead of
-- always needing a closed max weight — leaving max_weight_kg empty means
-- "this weight and above". additional_per_kg is the extra charge per kg
-- over that slab's min_weight_kg, for whatever admin wants that threshold
-- to be (2kg, 4kg, wherever they stop using fixed slabs).

alter table public.courier_rate_slabs
  alter column max_weight_kg drop not null,
  add column if not exists additional_per_kg numeric;
