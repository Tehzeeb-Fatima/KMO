-- Every morning at 9:00 Karachi time (04:00 UTC), check every product's
-- category and colour/size options (edge function catalog-daily-check).
-- Reuses the 'pending_digest_secret' Vault secret / DIGEST_SECRET env var.
create extension if not exists pg_net;

select cron.unschedule('kmo-catalog-daily-check')
where exists (select 1 from cron.job where jobname = 'kmo-catalog-daily-check');

select cron.schedule(
  'kmo-catalog-daily-check',
  '0 4 * * *',
  $$
  select net.http_post(
    url := 'https://igjrtfgnlvepemdehbdn.supabase.co/functions/v1/catalog-daily-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'pending_digest_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
