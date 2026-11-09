-- Scheduled jobs: Supabase pg_cron calls the website's /api/cron/<job> with the shared CRON_SECRET.
-- Replace <CRON_SECRET> with the value set in Vercel before running. (Applied to the live project with the real key.)
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname in ('taa-hourly','taa-daily','taa-monthly');
end $$;
-- Times are UTC: daily jobs run 07:05 South African time, the report on the 1st at 07:10.
select cron.schedule('taa-hourly', '15 * * * *', $$select net.http_get(url := 'https://taa-platform-six.vercel.app/api/cron/hourly', headers := '{"x-cron-key":"<CRON_SECRET>"}'::jsonb, timeout_milliseconds := 55000)$$);
select cron.schedule('taa-daily', '5 5 * * *', $$select net.http_get(url := 'https://taa-platform-six.vercel.app/api/cron/daily', headers := '{"x-cron-key":"<CRON_SECRET>"}'::jsonb, timeout_milliseconds := 55000)$$);
select cron.schedule('taa-monthly', '10 5 1 * *', $$select net.http_get(url := 'https://taa-platform-six.vercel.app/api/cron/monthly', headers := '{"x-cron-key":"<CRON_SECRET>"}'::jsonb, timeout_milliseconds := 55000)$$);
