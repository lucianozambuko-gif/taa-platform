-- Point the scheduled jobs (reminders, unpaid-checkout follow-ups, monthly report) at the cPanel site.
-- Run in Supabase: SQL editor > New query. Replace the two values on the first lines, then Run.
-- Run it again whenever the address changes (for example from the test subdomain to the main domain).
-- Alternative: skip this and use cPanel Cron Jobs instead (see DEPLOY-CPANEL.md, step 8).

do $$
declare
  site   text := 'https://new.trainingafricaacademy.co.za';  -- the SITE_URL, no trailing slash
  secret text := 'PASTE-THE-CRON_SECRET-HERE';                 -- the same CRON_SECRET as in cPanel
  hdr    text;
begin
  hdr := json_build_object('x-cron-key', secret)::text;
  perform cron.unschedule(jobname) from cron.job where jobname in ('taa-hourly', 'taa-daily', 'taa-monthly');
  -- Times are UTC: daily jobs run 07:05 South African time, the report on the 1st at 07:10.
  perform cron.schedule('taa-hourly', '15 * * * *',
    format($f$select net.http_get(url := %L, headers := %L::jsonb, timeout_milliseconds := 55000)$f$, site || '/api/cron/hourly', hdr));
  perform cron.schedule('taa-daily', '5 5 * * *',
    format($f$select net.http_get(url := %L, headers := %L::jsonb, timeout_milliseconds := 55000)$f$, site || '/api/cron/daily', hdr));
  perform cron.schedule('taa-monthly', '10 5 1 * *',
    format($f$select net.http_get(url := %L, headers := %L::jsonb, timeout_milliseconds := 55000)$f$, site || '/api/cron/monthly', hdr));
end $$;

-- Check: should list the three jobs with the new address.
select jobname, schedule, command from cron.job where jobname like 'taa-%' order by jobname;
