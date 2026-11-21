-- Fix hard-coded seven-room commit cap introduced before Endurance dungeons.
-- Keep the 42-room absolute ceiling, but validate each commit against the
-- run's frozen route_graph_json.preBossNodeCount (fallback seven for legacy).
alter table public.expedition_runs
  drop constraint if exists expedition_runs_cleared_pre_boss_count_check;
alter table public.expedition_runs
  add constraint expedition_runs_cleared_pre_boss_count_check
  check (cleared_pre_boss_count between 0 and 42);

CREATE OR REPLACE FUNCTION public.commit_coop_runtime_server_v1(p_run_id uuid, p_actor_account_id uuid, p_expected_state_version bigint, p_phase text, p_current_node_id text, p_cleared_pre_boss_count integer, p_private_state jsonb, p_client_projection jsonb, p_event_cursor bigint, p_event_type text, p_event_payload jsonb, p_semantic_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_next_version bigint;
  v_channel_epoch integer;
  v_route_limit integer;
begin
  if p_phase not in ('awaiting_choice','resolving_node','completed','failed','abandoned') then
    raise exception 'INVALID_PHASE';
  end if;

  -- Trust the persisted route (not the client projection or request payload).
  -- Older runs without a route graph retain the original seven-room ceiling.
  select case
    when (r.route_graph_json->>'preBossNodeCount') ~ '^[0-9]{1,2}$'
      then least(42, (r.route_graph_json->>'preBossNodeCount')::integer)
    else 7
  end into v_route_limit
  from public.expedition_runs r
  where r.id=p_run_id and r.coop_mode is not null;

  if p_cleared_pre_boss_count is null
      or p_cleared_pre_boss_count < 0
      or p_cleared_pre_boss_count > coalesce(v_route_limit,7) then
    raise exception 'INVALID_ROUTE_PROGRESS';
  end if;

  if not exists(
    select 1 from public.coop_run_access_memberships a
    where a.run_id=p_run_id and a.account_id=p_actor_account_id and a.active
  ) then raise exception 'NOT_PARTICIPANT'; end if;

  update public.expedition_runs
  set state_version=state_version+1,
      phase=p_phase,
      current_node_id=p_current_node_id,
      cleared_pre_boss_count=p_cleared_pre_boss_count,
      status=case p_phase when 'completed' then 'completed' when 'failed' then 'failed'
             when 'abandoned' then 'abandoned' else status end,
      completed_at=case when p_phase in ('completed','failed','abandoned') then clock_timestamp() else completed_at end
  where id=p_run_id and coop_mode is not null and state_version=p_expected_state_version
  returning state_version into v_next_version;
  if v_next_version is null then raise exception 'STALE_STATE'; end if;

  insert into public.coop_run_private_state(run_id,state_json,updated_at)
  values(p_run_id,p_private_state,clock_timestamp())
  on conflict(run_id) do update set state_json=excluded.state_json,updated_at=excluded.updated_at;
  insert into public.coop_run_client_snapshots(run_id,state_version,event_cursor,projection_json,updated_at)
  values(p_run_id,v_next_version,p_event_cursor,p_client_projection,clock_timestamp())
  on conflict(run_id) do update set state_version=excluded.state_version,event_cursor=excluded.event_cursor,
    projection_json=excluded.projection_json,updated_at=excluded.updated_at;

  select max(channel_epoch) into v_channel_epoch from public.coop_run_access_memberships
  where run_id=p_run_id and active;
  insert into public.coop_outbox(semantic_key,run_id,channel_epoch,event_type,client_payload)
  values(p_semantic_key,p_run_id,v_channel_epoch,p_event_type,p_event_payload);
  return jsonb_build_object('runId',p_run_id,'stateVersion',v_next_version,'eventCursor',p_event_cursor);
end; $function$;

revoke all on function public.commit_coop_runtime_server_v1(uuid,uuid,bigint,text,text,integer,jsonb,jsonb,bigint,text,jsonb,text)
  from public,anon,authenticated;
grant execute on function public.commit_coop_runtime_server_v1(uuid,uuid,bigint,text,text,integer,jsonb,jsonb,bigint,text,jsonb,text)
  to service_role;
