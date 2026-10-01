-- The shared runtime loader must include the database clock. Live vote windows,
-- reconnect recovery and node-resolution deadlines must never use device time.
begin;

create or replace function public.load_coop_runtime_server_v1(
  p_run_id uuid,
  p_actor_account_id uuid
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_result jsonb;
begin
  if not exists(
    select 1 from public.coop_run_access_memberships a
    where a.run_id=p_run_id and a.account_id=p_actor_account_id and a.active
  ) then raise exception 'NOT_PARTICIPANT'; end if;

  select jsonb_build_object(
    'runId',r.id,
    'mode',r.coop_mode,
    'phase',r.phase,
    'stateVersion',r.state_version,
    'currentNodeId',r.current_node_id,
    'clearedPreBossCount',r.cleared_pre_boss_count,
    'privateState',p.state_json,
    'clientProjection',c.projection_json,
    'eventCursor',c.event_cursor,
    'serverNow',floor(extract(epoch from clock_timestamp())*1000)
  ) into v_result
  from public.expedition_runs r
  join public.coop_run_private_state p on p.run_id=r.id
  join public.coop_run_client_snapshots c on c.run_id=r.id
  where r.id=p_run_id and r.coop_mode is not null;
  if v_result is null then raise exception 'RUN_NOT_FOUND'; end if;
  return v_result;
end; $$;

revoke all on function public.load_coop_runtime_server_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.load_coop_runtime_server_v1(uuid,uuid) to service_role;
commit;
