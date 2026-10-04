-- Configure Veldryn's optimized cron layout for STAGING.
-- Run after 20261040990000_supabase_usage_optimization_v1.sql is applied.
-- Staging intentionally uses a cheaper 30-second online cadence and 2-day history.
-- Leaves veldryn-party-social-v16 and veldryn_refresh_admin_qa_echoes untouched.

do $$
declare
  v_name text;
begin
  foreach v_name in array array[
    'veldryn-online-qmode',
    'veldryn-online-live-ready',
    'veldryn-online-live',
    'veldryn-online-live-presence',
    'veldryn-liveops-v17',
    'veldryn-online-coop-lfg-cleanup',
    'veldryn-online-tick',
    'veldryn-minute-maintenance-v18',
    'veldryn-cron-history-retention'
  ]
  loop
    if exists(select 1 from cron.job where jobname=v_name) then
      perform cron.unschedule(v_name);
    end if;
  end loop;
end
$$;

select cron.schedule(
  'veldryn-online-tick',
  '30 seconds',
  'select public.process_online_tick_server_v1(16);'
);
select cron.schedule(
  'veldryn-minute-maintenance-v18',
  '* * * * *',
  'select public.maintain_minute_tick_v18();'
);
select cron.schedule(
  'veldryn-cron-history-retention',
  '17 3 * * *',
  $$select private.cleanup_cron_job_run_details_v1(interval '2 days',100000);$$
);
