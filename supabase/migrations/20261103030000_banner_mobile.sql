-- Optional phone versions (4:5, e.g. 1080 x 1350) of a banner, each with its own
-- clickable area; phones fall back to the desktop file when none is set.
alter table public.banners
  add column if not exists image_url_mobile text,
  add column if not exists image_url_mobile_ur text,
  add column if not exists link_area_mobile jsonb,
  add column if not exists link_area_mobile_ur jsonb;
