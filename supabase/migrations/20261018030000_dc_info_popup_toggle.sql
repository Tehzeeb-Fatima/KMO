-- Splits the single DC popup toggle into two independent ones:
--  - dc_info_popup_enabled: tells vendors delivery is currently free and
--    shows KMO's default charges (read-only), while vendors still can't
--    set their own.
--  - dc_reminder_enabled (existing): lets vendors set their own delivery
--    charge and nags them to do so/review it.
-- When dc_reminder_enabled is on, its popup takes over and the info popup
-- is suppressed — there's no point telling a vendor "you can't set your
-- own" once they can.

alter table public.platform_settings
  add column if not exists dc_info_popup_enabled boolean not null default false;
