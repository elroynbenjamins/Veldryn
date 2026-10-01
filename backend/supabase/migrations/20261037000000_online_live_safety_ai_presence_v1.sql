-- Record the bounded safety-AI interval between reconnect grace and hard drop.
-- Combat remains server-owned; this state is policy metadata, never a client
-- permission to issue combat commands.
begin;

alter table public.coop_run_access_memberships
  add column if not exists presence_status text not null default 'connected'
    check (presence_status in ('connected','grace','safety_ai','dropped')),
  add column if not exists safety_ai_started_at timestamptz;

create or replace function public.touch_online_live_run_server_v1(p_run_id uuid,p_account_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_now timestamptz:=clock_timestamp();v_epoch integer;v_connected integer;v_safety integer;
begin
 select channel_epoch into v_epoch from public.coop_run_access_memberships a join public.expedition_runs r on r.id=a.run_id
 where a.run_id=p_run_id and a.account_id=p_account_id and a.active and r.coop_mode='live';
 if v_epoch is null then raise exception 'not_participant';end if;
 update public.coop_run_access_memberships set last_seen_at=v_now,presence_status='connected',safety_ai_started_at=null where run_id=p_run_id and account_id=p_account_id and active;
 select count(*) filter(where presence_status='connected'),count(*) filter(where presence_status='safety_ai') into v_connected,v_safety
 from public.coop_run_access_memberships where run_id=p_run_id and active;
 return jsonb_build_object('runId',p_run_id,'channelEpoch',v_epoch,'serverNow',floor(extract(epoch from v_now)*1000),'connectedCount',v_connected,'safetyAiCount',v_safety);
end; $$;

create or replace function public.reconcile_online_live_presence_server_v1(p_limit integer default 16)
returns integer language plpgsql security definer set search_path=public as $$
declare r record;v_removed integer:=0;v_active integer;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_worker_limit';end if;
 update public.coop_run_access_memberships set presence_status='safety_ai',safety_ai_started_at=coalesce(safety_ai_started_at,clock_timestamp())
 where active and last_seen_at<clock_timestamp()-interval '30 seconds' and last_seen_at>=clock_timestamp()-interval '150 seconds';
 for r in select x.id from public.expedition_runs x
  where x.coop_mode='live' and x.status='active' and exists(select 1 from public.coop_run_access_memberships a where a.run_id=x.id and a.active and a.last_seen_at<clock_timestamp()-interval '150 seconds')
  order by x.id for update of x skip locked limit p_limit
 loop
  update public.coop_run_access_memberships set active=false,left_at=clock_timestamp(),presence_status='dropped'
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

revoke all on function public.touch_online_live_run_server_v1(uuid,uuid),public.reconcile_online_live_presence_server_v1(integer) from public,anon,authenticated;
grant execute on function public.touch_online_live_run_server_v1(uuid,uuid),public.reconcile_online_live_presence_server_v1(integer) to service_role;
commit;
