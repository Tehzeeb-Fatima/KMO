-- Admin-set WhatsApp support number, shown as a floating chat button on the
-- storefront. Null means the button is hidden.
alter table public.platform_settings
  add column if not exists whatsapp_number text;
