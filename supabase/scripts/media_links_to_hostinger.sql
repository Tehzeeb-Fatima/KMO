-- One-off (2026-11-21): point stored media links from Supabase Storage to the
-- Hostinger copy at media.karachimartonline.com. Same bucket/path either way.
-- To undo, swap the two URLs in the replace() calls and run it again.
begin;
update public.product_images set url = replace(url, 'https://igjrtfgnlvepemdehbdn.supabase.co/storage/v1/object/public/', 'https://media.karachimartonline.com/')
  where url ~ '^https://igjrtfgnlvepemdehbdn\.supabase\.co/storage/v1/object/public/(product|vendor|category|promotion)-media/';
update public.products set video_url = replace(video_url, 'https://igjrtfgnlvepemdehbdn.supabase.co/storage/v1/object/public/', 'https://media.karachimartonline.com/')
  where video_url ~ '^https://igjrtfgnlvepemdehbdn\.supabase\.co/storage/v1/object/public/(product|vendor|category|promotion)-media/';
update public.categories set image_url = replace(image_url, 'https://igjrtfgnlvepemdehbdn.supabase.co/storage/v1/object/public/', 'https://media.karachimartonline.com/')
  where image_url ~ '^https://igjrtfgnlvepemdehbdn\.supabase\.co/storage/v1/object/public/(product|vendor|category|promotion)-media/';
update public.vendors set
  logo_url = case when logo_url ~ '^https://igjrtfgnlvepemdehbdn\.supabase\.co/storage/v1/object/public/(product|vendor|category|promotion)-media/'
    then replace(logo_url, 'https://igjrtfgnlvepemdehbdn.supabase.co/storage/v1/object/public/', 'https://media.karachimartonline.com/') else logo_url end,
  cover_url = case when cover_url ~ '^https://igjrtfgnlvepemdehbdn\.supabase\.co/storage/v1/object/public/(product|vendor|category|promotion)-media/'
    then replace(cover_url, 'https://igjrtfgnlvepemdehbdn.supabase.co/storage/v1/object/public/', 'https://media.karachimartonline.com/') else cover_url end
  where logo_url like '%supabase.co/storage/v1/object/public/%' or cover_url like '%supabase.co/storage/v1/object/public/%';
update public.banners set
  image_url = replace(image_url, 'https://igjrtfgnlvepemdehbdn.supabase.co/storage/v1/object/public/', 'https://media.karachimartonline.com/'),
  image_url_ur = replace(image_url_ur, 'https://igjrtfgnlvepemdehbdn.supabase.co/storage/v1/object/public/', 'https://media.karachimartonline.com/'),
  image_url_mobile = replace(image_url_mobile, 'https://igjrtfgnlvepemdehbdn.supabase.co/storage/v1/object/public/', 'https://media.karachimartonline.com/'),
  image_url_mobile_ur = replace(image_url_mobile_ur, 'https://igjrtfgnlvepemdehbdn.supabase.co/storage/v1/object/public/', 'https://media.karachimartonline.com/')
  where concat(image_url, image_url_ur, image_url_mobile, image_url_mobile_ur) like '%supabase.co/storage/v1/object/public/%';
update public.platform_settings set vendor_of_week_image_url = replace(vendor_of_week_image_url, 'https://igjrtfgnlvepemdehbdn.supabase.co/storage/v1/object/public/', 'https://media.karachimartonline.com/')
  where id = true and vendor_of_week_image_url like '%supabase.co/storage/v1/object/public/%';
commit;
