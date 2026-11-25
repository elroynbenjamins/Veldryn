-- Arm Frostfall 2026 without making the event live before its server start.
-- The minute cron catches a delayed database restart, then removes itself after
-- successful activation so an emergency manual disable cannot be auto-reversed.
do $$
begin
 if not exists(select 1 from pg_extension where extname='pg_cron') then
  raise exception 'Frostfall scheduled activation requires pg_cron';
 end if;
end $$;

create or replace function private.activate_frostfall_2026_v1()
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public,private,cron
as $$
declare changed integer:=0;
begin
 if clock_timestamp()>='2026-12-27 00:00:00+00'::timestamptz then
  perform cron.unschedule('veldryn-frostfall-2026-activate')
  where exists(select 1 from cron.job where jobname='veldryn-frostfall-2026-activate');
  return false;
 end if;
 update public.live_events
 set enabled=true,
     config=jsonb_set(coalesce(config,'{}'::jsonb),'{autoActivationArmed}','false'::jsonb,true),
     updated_at=clock_timestamp()
 where event_id='EVT_ANNUAL_012_2026'
   and enabled=false
   and starts_at='2026-12-03 00:00:00+00'::timestamptz
   and ends_at='2026-12-27 00:00:00+00'::timestamptz
   and grace_ends_at='2026-12-29 00:00:00+00'::timestamptz
   and coalesce(config->>'autoActivationArmed','false')='true'
   and clock_timestamp()>=starts_at
   and clock_timestamp()<ends_at;
 get diagnostics changed=row_count;
 if changed>0 then
  perform cron.unschedule('veldryn-frostfall-2026-activate');
 end if;
 return changed>0;
end $$;

create or replace function private.close_frostfall_2026_v1()
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public,private,cron
as $$
declare changed integer:=0;
begin
 if clock_timestamp()<'2026-12-29 00:00:00+00'::timestamptz then return false;end if;
 update public.live_events
 set enabled=false,
     config=jsonb_set(coalesce(config,'{}'::jsonb),'{autoActivationArmed}','false'::jsonb,true),
     updated_at=clock_timestamp()
 where event_id='EVT_ANNUAL_012_2026'
   and enabled=true
   and grace_ends_at='2026-12-29 00:00:00+00'::timestamptz
   and clock_timestamp()>=grace_ends_at;
 get diagnostics changed=row_count;
 perform cron.unschedule('veldryn-frostfall-2026-close')
 where exists(select 1 from cron.job where jobname='veldryn-frostfall-2026-close');
 return changed>0;
end $$;

create or replace function private.stop_frostfall_2026_v1()
returns void
language plpgsql
security definer
set search_path=pg_catalog,public,private,cron
as $$
begin
 update public.live_events
 set enabled=false,
     config=jsonb_set(coalesce(config,'{}'::jsonb),'{autoActivationArmed}','false'::jsonb,true),
     updated_at=clock_timestamp()
 where event_id='EVT_ANNUAL_012_2026';
 perform cron.unschedule('veldryn-frostfall-2026-activate')
 where exists(select 1 from cron.job where jobname='veldryn-frostfall-2026-activate');
 perform cron.unschedule('veldryn-frostfall-2026-close')
 where exists(select 1 from cron.job where jobname='veldryn-frostfall-2026-close');
end $$;

revoke all on function private.activate_frostfall_2026_v1() from public,anon,authenticated;
revoke all on function private.close_frostfall_2026_v1() from public,anon,authenticated;
revoke all on function private.stop_frostfall_2026_v1() from public,anon,authenticated;
grant execute on function private.stop_frostfall_2026_v1() to service_role;

-- Arming is distinct from enabling. The runtime stays disabled until Dec 3 UTC.
update public.live_events
set config=jsonb_set(coalesce(config,'{}'::jsonb),'{autoActivationArmed}','true'::jsonb,true),
    updated_at=clock_timestamp()
where event_id='EVT_ANNUAL_012_2026'
  and enabled=false
  and starts_at='2026-12-03 00:00:00+00'::timestamptz
  and ends_at='2026-12-27 00:00:00+00'::timestamptz
  and grace_ends_at='2026-12-29 00:00:00+00'::timestamptz;

select cron.schedule(
 'veldryn-frostfall-2026-activate',
 '* * * * *',
 'select private.activate_frostfall_2026_v1();'
);
select cron.schedule(
 'veldryn-frostfall-2026-close',
 '* * * * *',
 'select private.close_frostfall_2026_v1();'
);
