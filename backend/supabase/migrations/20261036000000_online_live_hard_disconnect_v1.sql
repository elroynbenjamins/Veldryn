-- Remove participants that have exceeded the hard disconnect boundary.
-- Remaining members receive a new chat epoch, invalidating old clients.
begin;

create or replace function public.reconcile_online_live_presence_server_v1(p_limit integer default 16)
returns integer language plpgsql security definer set search_path=public as $$
declare r record;v_removed integer:=0;v_active integer;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_worker_limit';end if;
 for r in select x.id from public.expedition_runs x
  where x.coop_mode='live' and x.status='active' and exists(select 1 from public.coop_run_access_memberships a where a.run_id=x.id and a.active and a.last_seen_at<clock_timestamp()-interval '150 seconds')
  order by x.id for update of x skip locked limit p_limit
 loop
  update public.coop_run_access_memberships set active=false,left_at=clock_timestamp()
  where run_id=r.id and active and last_seen_at<clock_timestamp()-interval '150 seconds';
  update public.expedition_run_members m set active_participant_account_id=null
  where m.run_id=r.id and m.active_participant_account_id in(select a.account_id from public.coop_run_access_memberships a where a.run_id=r.id and not a.active);
  select count(*) into v_active from public.coop_run_access_memberships where run_id=r.id and active;
  if v_active=0 then
   update public.expedition_runs set status='abandoned',phase='abandoned',completed_at=clock_timestamp() where id=r.id and status='active';
  else
   update public.coop_run_access_memberships set channel_epoch=channel_epoch+1 where run_id=r.id and active;
  end if;
  v_removed:=v_removed+1;
 end loop;
 return v_removed;
end $$;

revoke all on function public.reconcile_online_live_presence_server_v1(integer) from public,anon,authenticated;
grant execute on function public.reconcile_online_live_presence_server_v1(integer) to service_role;

do $$ begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
  create extension if not exists pg_cron;
  perform cron.schedule('veldryn-online-live-presence','10 seconds','select public.reconcile_online_live_presence_server_v1(16);');
 end if;
end $$;
commit;
