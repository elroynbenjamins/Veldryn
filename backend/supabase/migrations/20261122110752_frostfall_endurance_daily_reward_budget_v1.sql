-- Frostfall Endurance reward budget / unlimited practice, staging-first.
-- Production remains disabled; this migration does not enable events or grant currency.
create table if not exists public.event_expedition_daily_clears(
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  clear_day date not null,
  clear_count integer not null default 0 check(clear_count>=0),
  primary key(account_id,event_id,clear_day)
);
alter table public.event_expedition_daily_clears enable row level security;
revoke all on table public.event_expedition_daily_clears from public, anon, authenticated;
grant select on table public.event_expedition_daily_clears to service_role;
CREATE OR REPLACE FUNCTION public.claim_event_expedition_clear_slot(p_account_id uuid, p_event_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_count integer;
begin
 insert into public.event_expedition_daily_clears(account_id,event_id,clear_day,clear_count)
 values(p_account_id,p_event_id,(clock_timestamp() at time zone 'utc')::date,1)
 on conflict(account_id,event_id,clear_day) do update
 set clear_count=public.event_expedition_daily_clears.clear_count+1
 returning clear_count into v_count;
 if v_count>2 then
  update public.event_expedition_daily_clears
  set clear_count=clear_count-1
  where account_id=p_account_id and event_id=p_event_id and clear_day=(clock_timestamp() at time zone 'utc')::date;
  raise exception 'event_daily_clear_limit';
 end if;
end $function$
;
revoke all on function public.claim_event_expedition_clear_slot(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_event_expedition_clear_slot(uuid,text) to service_role;
create or replace function public.online_event_expedition_daily_budget_server_v1(p_account_id uuid,p_event_id text)
returns integer language sql stable security invoker set search_path to 'public' as $$
 select greatest(0,2
  -coalesce((select c.clear_count from public.event_expedition_daily_clears c where c.account_id=p_account_id and c.event_id=p_event_id and c.clear_day=(now() at time zone 'utc')::date),0)
  -(select count(*)::integer from public.expedition_runs x
    join public.coop_run_private_state ps on ps.run_id=x.id
    where x.coop_mode='event' and x.controller_account_id=p_account_id and x.phase='completed'
      and ps.state_json->>'liveEventId'=p_event_id
      and ps.state_json#>>'{run,settlement}'='pending'
      and coalesce(ps.state_json#>>'{run,practiceOnly}','false')<>'true')
 )::integer;
$$;
revoke all on function public.online_event_expedition_daily_budget_server_v1(uuid,text) from public, anon, authenticated;
grant execute on function public.online_event_expedition_daily_budget_server_v1(uuid,text) to service_role;
-- Reconcile staging with existing production Veilbreak and claim safety checks.
CREATE OR REPLACE FUNCTION public.start_online_event_expedition_server_v1(p_account_id uuid, p_game_version bigint, p_request_id text, p_request_hash text, p_run_id uuid, p_live_event_id text, p_private_state jsonb, p_client_projection jsonb, p_members jsonb, p_seed_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_prior jsonb;g public.online_game_states;r jsonb:=p_private_state->'run';m jsonb;s jsonb;e public.echo_profiles;v_index integer:=0;v_series text;v_tier integer:=1;v_required_level integer:=1;
begin
 perform pg_advisory_xact_lock(hashtextextended('online-coop:'||p_account_id::text,0));
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'event_start_v1',p_account_id::text,p_request_id);
 if v_prior is not null then if v_prior->>'requestHash'<>p_request_hash then raise exception 'idempotency_key_conflict';end if;return v_prior->'response';end if;
 if char_length(p_request_id) not between 8 and 128 or p_request_hash!~'^[a-f0-9]{64}$' or p_seed_hash!~'^[a-f0-9]{64}$' then raise exception 'invalid_request';end if;
 v_series:=public.online_event_expedition_series_server_v1(r->>'eventId');
 if v_series is null then raise exception 'unknown_event_expedition';end if;
 if p_live_event_id not like v_series||'\_%' escape '\' then raise exception 'event_not_live';end if;
 if not exists(select 1 from public.live_events x where x.event_id=p_live_event_id and x.enabled and x.starts_at is not null and x.starts_at<=clock_timestamp() and x.ends_at is not null and x.ends_at>clock_timestamp()) then raise exception 'event_not_live';end if;
 if p_private_state->>'liveEventId' is distinct from p_live_event_id then raise exception 'event_not_live';end if;
 select * into g from public.online_game_states where account_id=p_account_id for share;
 if not found or g.character_id is null then raise exception 'character_required';end if;
 -- Frostfall tier selection is validated against server-owned character and normalized snapshots.
 if r->>'eventId'='EVENT_FROSTFALL_AURORA_HOLLOW' then
  if coalesce(r->>'tier','') not in ('1','2','3','4','5') then raise exception 'invalid_event_tier';end if;
  v_tier:=(r->>'tier')::integer;v_required_level:=10+(v_tier-1)*5;
  if coalesce((g.state#>>'{character,level}')::integer,0)<v_required_level then raise exception 'event_level_requirement';end if;
 elsif coalesce(r->>'tier','1')<>'1' then raise exception 'invalid_event_tier';end if;
 if g.revision<>p_game_version then raise exception 'stale_game_version';end if;
 if r->>'id' is distinct from p_run_id::text or r#>>'{accountIds,0}' is distinct from p_account_id::text or r->>'phase' is distinct from 'awaiting_choice' or r->>'settlement' is distinct from 'pending' then raise exception 'invalid_run';end if;
 if r->>'eventId'='EVENT_FROSTFALL_AURORA_HOLLOW' and
    exists(select 1 from jsonb_array_elements(p_members) x where coalesce((x#>>'{snapshot,normalized,effectiveLevel}')::integer,0)<v_required_level) then raise exception 'event_level_requirement';end if;
 if p_client_projection->>'tier' is distinct from v_tier::text then raise exception 'invalid_event_tier';end if;
 if r->>'eventId'='EVENT_FROSTFALL_AURORA_HOLLOW' and coalesce((r->>'practiceOnly')::boolean,false) is distinct from (public.online_event_expedition_daily_budget_server_v1(p_account_id,p_live_event_id)=0) then raise exception 'event_reward_budget_stale';end if;
 if r->>'eventId'<>'EVENT_FROSTFALL_AURORA_HOLLOW' and coalesce((r->>'practiceOnly')::boolean,false) then raise exception 'invalid_event_practice';end if;
 if jsonb_array_length(p_members)<>4 or (select count(distinct x#>>'{snapshot,accountId}') from jsonb_array_elements(p_members) x)<>4
  or (select count(distinct x#>>'{snapshot,characterId}') from jsonb_array_elements(p_members) x)<>4
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='tank')<>1
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='damage')<>2
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='support')<>1 then raise exception 'invalid_roster';end if;
 delete from public.coop_account_reservations where account_id=p_account_id and reservation_kind<>'run' and expires_at<=clock_timestamp();
 if exists(select 1 from public.coop_account_reservations where account_id=p_account_id)
  or exists(select 1 from public.coop_run_access_memberships a join public.expedition_runs x on x.id=a.run_id where a.account_id=p_account_id and a.active and x.status='active') then raise exception 'account_already_participating';end if;

 insert into public.expedition_runs(id,expedition_id,tier,content_version,seed_hash,created_by,coop_mode,controller_account_id,route_schema_version,route_graph_json,current_node_id,balance_version,engine_version,phase)
 values(p_run_id,r->>'eventId',v_tier,'online-event-expedition-v1',p_seed_hash,p_account_id,'event',p_account_id,1,r->'graph',r->>'currentNodeId','event-balance-v1','online-event-runtime-v1','awaiting_choice');

 for m in select * from jsonb_array_elements(p_members) loop
  s:=m->'snapshot';
  if (s#>>'{readiness,ready}')::boolean is not true then raise exception 'loadout_not_ready';end if;
  if v_index=0 then
   if s->>'accountId' is distinct from p_account_id::text or s->>'characterId' is distinct from g.character_id::text or s->>'revision' is distinct from p_game_version::text then raise exception 'invalid_controller';end if;
  else
   select ep.* into e from public.echo_profiles ep join public.characters c on c.id=ep.character_id
   where ep.id=(m->>'profileId')::uuid and c.account_id=(s->>'accountId')::uuid and ep.character_id=(s->>'characterId')::uuid
    and ep.opted_in and ep.expires_at>clock_timestamp() and ep.published_at>clock_timestamp()-interval '24 hours'
    and ep.content_version='online-coop-loadout-v1' and ep.preferences->>'pipeline'='online_coop_v1' and ep.snapshot_hash=m->>'sourceHash'
   for share of ep;
   if not found then raise exception 'echo_no_longer_eligible';end if;
   if exists(select 1 from public.player_blocks b where (b.blocker_id=p_account_id and b.blocked_id=(s->>'accountId')::uuid) or (b.blocked_id=p_account_id and b.blocker_id=(s->>'accountId')::uuid)) then raise exception 'echo_no_longer_eligible';end if;
  end if;
  insert into public.expedition_run_members(run_id,character_id,account_id,echo_profile_version,role,synced_level,loadout_snapshot,stat_snapshot,slot_id,member_kind,source_account_id,active_participant_account_id,snapshot_hash)
  values(p_run_id,(s->>'characterId')::uuid,(s->>'accountId')::uuid,case when v_index=0 then null else e.profile_version end,s#>>'{readiness,role}',(s#>>'{normalized,effectiveLevel}')::integer,s,s#>'{normalized,snapshot}',v_index::text,case when v_index=0 then 'human' else 'echo' end,(s->>'accountId')::uuid,case when v_index=0 then p_account_id else null end,s->>'snapshotHash');
  v_index:=v_index+1;
 end loop;

 insert into public.coop_run_access_memberships(run_id,account_id,membership_kind) values(p_run_id,p_account_id,'controller');
 insert into public.coop_account_reservations(account_id,run_id,reservation_kind) values(p_account_id,p_run_id,'run');
 insert into public.coop_run_private_state(run_id,state_json) values(p_run_id,p_private_state);
 insert into public.coop_run_client_snapshots(run_id,state_version,event_cursor,projection_json) values(p_run_id,1,1,p_client_projection);
 insert into public.coop_outbox(semantic_key,run_id,channel_epoch,event_type,client_payload) values('event:'||p_run_id||':start',p_run_id,1,'event_run_started',p_client_projection);
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json) values(p_account_id,'event_start_v1',p_account_id::text,p_request_id,p_request_hash,p_client_projection);
 return p_client_projection;
end $function$
;
CREATE OR REPLACE FUNCTION public.advance_online_event_expedition_server_v1(p_account_id uuid, p_run_id uuid, p_expected_version bigint, p_request_id text, p_request_hash text, p_private_state jsonb, p_client_projection jsonb, p_node_id text, p_result jsonb, p_start_state_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_prior jsonb;v_version bigint;v_old jsonb;r jsonb;v_count integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('veilbreak-daily:'||p_account_id::text,0));
 select state_version into v_version from public.expedition_runs where id=p_run_id and coop_mode='event' and controller_account_id=p_account_id for update;
 if not found then raise exception 'NOT_PARTICIPANT';end if;
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'event_choose_v1',p_run_id::text,p_request_id);
 if v_prior is not null then if v_prior->>'requestHash'<>p_request_hash then raise exception 'idempotency_key_conflict';end if;return v_prior->'response';end if;
 if v_version<>p_expected_version then raise exception 'STALE_STATE';end if;
 select state_json into v_old from public.coop_run_private_state where run_id=p_run_id;
 r:=p_private_state->'run';
 if v_old->>'liveEventId' is distinct from p_private_state->>'liveEventId'
  or v_old#>>'{run,eventId}' is distinct from r->>'eventId'
  or v_old#>>'{run,phase}' is distinct from 'awaiting_choice'
  or r->>'id' is distinct from p_run_id::text
  or r#>>'{lastResolution,nodeId}' is distinct from p_node_id
  or r#>'{lastResolution,result}' is distinct from p_result
  or p_start_state_hash!~'^[a-f0-9]{64}$' then raise exception 'invalid_event_transition';end if;
 if p_client_projection->>'stateVersion' is distinct from (v_version+1)::text then raise exception 'invalid_event_projection';end if;
 -- Endurance-only practice is frozen at entry. Server picks the daily entitlement, never the client.
 if v_old#>>'{run,graph,generatorVersion}'='event-route-v5-endurance-v2' then
  if coalesce(v_old#>>'{run,practiceOnly}','false') is distinct from coalesce(r->>'practiceOnly','false') then raise exception 'event_practice_tamper';end if;
  if r->>'phase'='completed' and coalesce(r->>'practiceOnly','false')='true' and (coalesce((r->>'rewardMarks')::integer,-1)<>0 or r->>'settlement'<>'claimed' or p_client_projection#>>'{settlement,status}'<>'claimed' or coalesce((p_client_projection#>>'{settlement,rewardMarks}')::integer,-1)<>0) then raise exception 'event_practice_reward_tamper';end if;
  if r->>'phase'='completed' and coalesce(r->>'practiceOnly','false')<>'true' and (r->>'settlement'<>'pending' or coalesce((r->>'rewardMarks')::integer,0)<=0) then raise exception 'invalid_event_paid_clear';end if;
 end if;
 if r->>'phase'='completed' and p_private_state->>'liveEventId' like 'EVT_ANNUAL_010_%' then
  if (select count(*) from public.event_dungeon_completions_v1 where account_id=p_account_id and event_id=p_private_state->>'liveEventId' and completed_day=(clock_timestamp() at time zone 'UTC')::date)>=2 then raise exception 'event_daily_completion_limit';end if;
  insert into public.event_dungeon_completions_v1(run_id,account_id,event_id,completed_day) values(p_run_id,p_account_id,p_private_state->>'liveEventId',(clock_timestamp() at time zone 'UTC')::date);
 end if;
 if r->>'rewardTitleId' is not null and (r->>'rewardTitleId'<>'title_veilbreaker' or r->>'eventId'<>'EVENT_VEILBREAK_GLOAM_BREACH' or r->>'phase'<>'completed') then raise exception 'invalid_event_title';end if;
 v_count:=(select count(*) from jsonb_array_elements_text(r#>'{persistentState,visitedNodeIds}') n where n<>r#>>'{graph,bossNodeId}');
 insert into public.coop_node_results(run_id,node_id,fencing_generation,success,start_state_hash,result_json,end_state_json,event_cursor_from,event_cursor_to)
 values(p_run_id,p_node_id,v_version,(p_result->>'success')::boolean,p_start_state_hash,p_result->'summary',p_result->'state',v_version,v_version+1);
 perform public.commit_coop_runtime_server_v1(p_run_id,p_account_id,p_expected_version,r->>'phase',r->>'currentNodeId',v_count,p_private_state,p_client_projection,v_version+1,'event_node_resolved',p_client_projection,'event:'||p_run_id||':node:'||p_node_id||':resolved');
 if r->>'phase' in ('completed','failed') then delete from public.coop_account_reservations where account_id=p_account_id and run_id=p_run_id;end if;
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json) values(p_account_id,'event_choose_v1',p_run_id::text,p_request_id,p_request_hash,p_client_projection);
 return p_client_projection;
end $function$
;
CREATE OR REPLACE FUNCTION public.claim_online_event_expedition_server_v1(p_account_id uuid, p_run_id uuid, p_expected_version bigint, p_request_id text, p_request_hash text, p_marks integer, p_private_state jsonb, p_client_projection jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_prior jsonb;v_version bigint;v_old jsonb;r jsonb;g public.online_game_states;v_live_event_id text;v_progress integer;v_currency integer;v_state jsonb;v_count integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account_id::text,0));
 select state_version into v_version from public.expedition_runs where id=p_run_id and coop_mode='event' and controller_account_id=p_account_id for update;
 if not found then raise exception 'NOT_PARTICIPANT';end if;
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'event_claim_v1',p_run_id::text,p_request_id);
 if v_prior is not null then if v_prior->>'requestHash'<>p_request_hash then raise exception 'idempotency_key_conflict';end if;return v_prior->'response';end if;
 if v_version<>p_expected_version then raise exception 'STALE_STATE';end if;
 select state_json into v_old from public.coop_run_private_state where run_id=p_run_id;
 r:=p_private_state->'run';v_live_event_id:=v_old->>'liveEventId';
 if v_old#>>'{run,phase}' is distinct from 'completed' or v_old#>>'{run,settlement}' is distinct from 'pending'
  or r->>'phase' is distinct from 'completed' or r->>'settlement' is distinct from 'claimed'
  or r->>'eventId' is distinct from v_old#>>'{run,eventId}' or p_private_state->>'liveEventId' is distinct from v_live_event_id
  or p_marks is null or p_marks<=0 or p_marks is distinct from (v_old#>>'{run,rewardMarks}')::integer then raise exception 'event_reward_not_ready';end if;
 if not public.event_claim_open(v_live_event_id) then raise exception 'event_claim_closed';end if;
 if coalesce(v_old#>>'{run,practiceOnly}','false')='true' then raise exception 'event_practice_not_claimable';end if;
 perform public.claim_event_expedition_clear_slot(p_account_id,v_live_event_id);
 if p_client_projection->>'stateVersion' is distinct from (v_version+1)::text then raise exception 'invalid_event_projection';end if;

 select * into g from public.online_game_states where account_id=p_account_id for update;
 if not found or g.state is null then raise exception 'game_not_loaded';end if;
 v_progress:=greatest(0,coalesce((g.state#>>array['account','eventProgressById',v_live_event_id])::integer,0))+p_marks;
 v_currency:=greatest(0,coalesce((g.state#>>array['account','eventCurrencyBalanceById',v_live_event_id])::integer,0))+p_marks;
 v_state:=jsonb_set(g.state,'{account,eventProgressById}',coalesce(g.state#>'{account,eventProgressById}','{}'::jsonb)||jsonb_build_object(v_live_event_id,v_progress),true);
 v_state:=jsonb_set(v_state,'{account,eventCurrencyBalanceById}',coalesce(v_state#>'{account,eventCurrencyBalanceById}','{}'::jsonb)||jsonb_build_object(v_live_event_id,v_currency),true);
 update public.online_game_states set state=v_state,revision=revision+1,updated_at=clock_timestamp() where account_id=p_account_id;
 insert into public.event_progress(account_id,event_id,progress,currency_balance,prestige_balance)
 values(p_account_id,v_live_event_id,p_marks,p_marks,0)
 on conflict(account_id,event_id) do update set progress=public.event_progress.progress+excluded.progress,currency_balance=public.event_progress.currency_balance+excluded.currency_balance,updated_at=clock_timestamp();

 v_count:=(select count(*) from jsonb_array_elements_text(r#>'{persistentState,visitedNodeIds}') n where n<>r#>>'{graph,bossNodeId}');
 perform public.commit_coop_runtime_server_v1(p_run_id,p_account_id,p_expected_version,'completed',r->>'currentNodeId',v_count,p_private_state,p_client_projection,v_version+1,'event_reward_claimed',p_client_projection,'event:'||p_run_id||':claim');
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json)
 values(p_account_id,'event_claim_v1',p_run_id::text,p_request_id,p_request_hash,p_client_projection);
 return p_client_projection;
end $function$
;
revoke all on function public.start_online_event_expedition_server_v1(uuid,bigint,text,text,uuid,text,jsonb,jsonb,jsonb,text) from public, anon, authenticated;
revoke all on function public.advance_online_event_expedition_server_v1(uuid,uuid,bigint,text,text,jsonb,jsonb,text,jsonb,text) from public, anon, authenticated;
revoke all on function public.claim_online_event_expedition_server_v1(uuid,uuid,bigint,text,text,integer,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.start_online_event_expedition_server_v1(uuid,bigint,text,text,uuid,text,jsonb,jsonb,jsonb,text) to service_role;
grant execute on function public.advance_online_event_expedition_server_v1(uuid,uuid,bigint,text,text,jsonb,jsonb,text,jsonb,text) to service_role;
grant execute on function public.claim_online_event_expedition_server_v1(uuid,uuid,bigint,text,text,integer,jsonb,jsonb) to service_role;
