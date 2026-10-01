-- Server-owned Live presence. A run refresh is also a participant heartbeat;
-- presence is never accepted from the client payload.
begin;

alter table public.coop_run_access_memberships
  add column if not exists last_seen_at timestamptz not null default clock_timestamp();

create or replace function public.touch_online_live_run_server_v1(p_run_id uuid,p_account_id uuid)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_now timestamptz:=clock_timestamp();v_epoch integer;v_connected integer;v_grace integer;
begin
 select channel_epoch into v_epoch from public.coop_run_access_memberships a join public.expedition_runs r on r.id=a.run_id
 where a.run_id=p_run_id and a.account_id=p_account_id and a.active and r.coop_mode='live';
 if v_epoch is null then raise exception 'not_participant';end if;
 update public.coop_run_access_memberships set last_seen_at=v_now where run_id=p_run_id and account_id=p_account_id and active;
 select count(*) filter(where last_seen_at>=v_now-interval '30 seconds'),count(*) filter(where last_seen_at>=v_now-interval '60 seconds')
 into v_connected,v_grace from public.coop_run_access_memberships where run_id=p_run_id and active;
 return jsonb_build_object('runId',p_run_id,'channelEpoch',v_epoch,'serverNow',floor(extract(epoch from v_now)*1000),'connectedCount',v_connected,'graceCount',v_grace);
end; $$;

revoke all on function public.touch_online_live_run_server_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.touch_online_live_run_server_v1(uuid,uuid) to service_role;
commit;
