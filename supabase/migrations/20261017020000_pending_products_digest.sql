-- Every 3 hours, email the products waiting for approval (edge function
-- pending-products-digest; it sends nothing when none are pending).
-- The shared secret lives in Vault as 'pending_digest_secret' and as the
-- function's DIGEST_SECRET env var.
create extension if not exists pg_net;

select cron.unschedule('kmo-pending-products-digest')
where exists (select 1 from cron.job where jobname = 'kmo-pending-products-digest');

select cron.schedule(
  'kmo-pending-products-digest',
  '0 */3 * * *',
  $$
  select net.http_post(
    url := 'https://igjrtfgnlvepemdehbdn.supabase.co/functions/v1/pending-products-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'pending_digest_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
