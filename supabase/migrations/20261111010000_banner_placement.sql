-- Where a banner shows on the homepage: the top slider, or the middle of the page (sale / attraction banner).
alter table public.banners add column if not exists placement text not null default 'hero';
alter table public.banners drop constraint if exists banners_placement_check;
alter table public.banners add constraint banners_placement_check check (placement in ('hero', 'middle'));
