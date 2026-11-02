-- Banners can be videos (detected from the file extension) with a separate
-- Urdu file, and can limit their link to the button drawn inside the artwork.
alter table public.banners
  add column if not exists image_url_ur text,
  add column if not exists link_area jsonb,
  add column if not exists link_area_ur jsonb;

comment on column public.banners.link_area is
  'Clickable part of the banner as {left,top,width,height} CSS percentages; null = whole banner.';
