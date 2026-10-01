-- Live runtime handoff: a committed ready check becomes one shared four-human
-- expedition run. All writes remain service-role only; clients see snapshots.
begin;
alter table public.coop_ready_checks add column if not exists run_id uuid references public.expedition_runs(id) on delete set null;

create or replace function public.online_live_committed_sources_server_v1(p_account_id uuid,p_check_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;v_dungeon text;v_tier smallint;
begin
 select * into c from public.coop_ready_checks where id=p_check_id;
 if not found or not exists(select 1 from jsonb_array_elements(c.roster_json) x where x->>'accountId'=p_account_id::text) then raise exception 'not_ready_member';end if;
 if c.status<>'committed' then raise exception 'ready_check_not_committed';end if;
 select min(expedition_id),min(tier)::smallint into v_dungeon,v_tier from public.matchmaking_tickets where reservation_id=c.id or id in(select (x->>'ticketId')::uuid from jsonb_array_elements(c.roster_json) x);
 return jsonb_build_object('checkId',c.id,'runId',c.run_id,'dungeonId',v_dungeon,'tier',v_tier,'roster',c.roster_json,'frozenRoster',c.frozen_roster_json);
end $$;

create or replace function public.start_online_live_server_v1(
 p_account_id uuid,p_check_id uuid,p_run_id uuid,p_seed_hash text,p_private_state jsonb,p_client_projection jsonb,p_members jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;r jsonb;m jsonb;v_index integer:=0;v_epoch integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('online-live-runtime',0));
 select * into c from public.coop_ready_checks where id=p_check_id for update;
 if not found or c.status<>'committed' then raise exception 'ready_check_not_committed';end if;
 if not exists(select 1 from jsonb_array_elements(c.roster_json) x where x->>'accountId'=p_account_id::text) then raise exception 'not_ready_member';end if;
 if c.run_id is not null then return p_client_projection;end if;
 if p_run_id is null or jsonb_array_length(p_members)<>4 or p_private_state->'run'->>'id' is distinct from p_run_id::text then raise exception 'invalid_live_run';end if;
 r:=p_private_state->'run';
 insert into public.expedition_runs(id,expedition_id,tier,content_version,seed_hash,created_by,coop_mode,route_schema_version,route_graph_json,current_node_id,balance_version,engine_version,phase,controller_account_id)
 values(p_run_id,r->>'expeditionId',(r->>'tier')::smallint,'online-coop-loadout-v1',p_seed_hash,p_account_id,'live',1,r->'graph',r->>'currentNodeId','online-coop-loadout-v1','online-coop-runtime-v1','awaiting_choice',p_account_id);
 for m in select * from jsonb_array_elements(p_members) loop
  if (m->'snapshot'#>>'{readiness,ready}')::boolean is not true then raise exception 'loadout_not_ready';end if;
  insert into public.expedition_run_members(run_id,character_id,account_id,role,synced_level,loadout_snapshot,stat_snapshot,slot_id,member_kind,source_account_id,active_participant_account_id,snapshot_hash)
  values(p_run_id,(m->'snapshot'->>'characterId')::uuid,(m->'snapshot'->>'accountId')::uuid,m->'snapshot'#>>'{readiness,role}',(m->'snapshot'#>>'{normalized,effectiveLevel}')::integer,m->'snapshot',m->'snapshot'->'normalized'->'snapshot',v_index::text,'human',(m->'snapshot'->>'accountId')::uuid,(m->'snapshot'->>'accountId')::uuid,m->'snapshot'->>'snapshotHash');
  insert into public.coop_run_access_memberships(run_id,account_id,membership_kind) values(p_run_id,(m->'snapshot'->>'accountId')::uuid,'live_participant');
  delete from public.coop_account_reservations where account_id=(m->'snapshot'->>'accountId')::uuid and reservation_kind='ready';
  update public.matchmaking_tickets set status='matched',reservation_id=null,reservation_expires_at=null where account_id=(m->'snapshot'->>'accountId')::uuid and reservation_id=c.id;
  v_index:=v_index+1;
 end loop;
 insert into public.coop_run_private_state(run_id,state_json) values(p_run_id,p_private_state);
 insert into public.coop_run_client_snapshots(run_id,state_version,event_cursor,projection_json) values(p_run_id,1,1,p_client_projection);
 insert into public.coop_outbox(semantic_key,run_id,channel_epoch,event_type,client_payload) values('live:'||p_run_id||':start',p_run_id,1,'run_started',p_client_projection);
 update public.coop_ready_checks set run_id=p_run_id where id=c.id;
 return p_client_projection;
end $$;

create or replace function public.queue_online_live_node_server_v1(p_account_id uuid,p_run_id uuid,p_expected_version bigint,p_request_id text,p_request_hash text,p_private_state jsonb,p_client_projection jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_version bigint;v_state jsonb;v_due numeric;v_node text;
begin
 select state_version into v_version from public.expedition_runs r where r.id=p_run_id and r.coop_mode='live' and exists(select 1 from public.coop_run_access_memberships a where a.run_id=r.id and a.account_id=p_account_id and a.active) for update;
 if not found then raise exception 'NOT_PARTICIPANT';end if;
 if v_version<>p_expected_version then raise exception 'STALE_STATE';end if;
 select state_json into v_state from public.coop_run_private_state where run_id=p_run_id;
 if v_state ? 'pending' then raise exception 'node_resolving';end if;
 if v_state->'run' is distinct from p_private_state->'run' or v_state->'seed' is distinct from p_private_state->'seed' then raise exception 'invalid_pending_state';end if;
 v_due:=(p_private_state#>>'{pending,resolvesAtMs}')::numeric;v_node:=p_private_state#>>'{pending,run,currentNodeId}';
 if v_due is null or v_due>extract(epoch from clock_timestamp())*1000+181000 or v_node is null then raise exception 'invalid_node_deadline';end if;
 perform public.commit_coop_runtime_server_v1(p_run_id,p_account_id,p_expected_version,'resolving_node',v_node,jsonb_array_length(v_state#>'{run,persistentState,visitedNodeIds}'),p_private_state,p_client_projection,v_version+1,'node_started',p_client_projection,'live:'||p_run_id||':node:'||v_node||':start');
 insert into public.coop_due_jobs(semantic_key,job_kind,resource_id,due_at,payload) values('live:'||p_run_id||':node:'||v_node,'live_node',p_run_id::text,to_timestamp(v_due/1000),jsonb_build_object('accountId',p_account_id,'nodeId',v_node));
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json) values(p_account_id,'live_choose_v1',p_run_id::text,p_request_id,p_request_hash,p_client_projection);
 return p_client_projection;
end $$;

create or replace function public.finalize_online_live_node_server_v1(p_account_id uuid,p_run_id uuid,p_expected_version bigint,p_private_state jsonb,p_client_projection jsonb,p_node_id text,p_result jsonb,p_start_state_hash text,p_enhanced_marks integer,p_assistance_marks integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_version bigint;v_state jsonb;r jsonb;v_count integer;v_now timestamptz:=clock_timestamp();v_date date;v_week date;m record;
begin
 select state_version into v_version from public.expedition_runs r0 where r0.id=p_run_id and r0.coop_mode='live' and exists(select 1 from public.coop_run_access_memberships a where a.run_id=r0.id and a.account_id=p_account_id and a.active) for update;
 if not found then raise exception 'NOT_PARTICIPANT';end if;
 select state_json into v_state from public.coop_run_private_state where run_id=p_run_id;
 if not(v_state ? 'pending') then return (select projection_json from public.coop_run_client_snapshots where run_id=p_run_id);end if;
 if v_version<>p_expected_version or (v_state#>>'{pending,resolvesAtMs}')::numeric>extract(epoch from v_now)*1000 then raise exception 'node_not_due';end if;
 r:=v_state#>'{pending,run}';
 if r is distinct from p_private_state->'run' or v_state->'seed' is distinct from p_private_state->'seed' or r->>'currentNodeId' is distinct from p_node_id or r#>'{lastResolution,result}' is distinct from p_result or v_state#>>'{pending,startStateHash}' is distinct from p_start_state_hash then raise exception 'invalid_node_result';end if;
 v_count:=(select count(*) from jsonb_array_elements_text(r#>'{persistentState,visitedNodeIds}') n where n<>r#>>'{graph,bossNodeId}');
 insert into public.coop_node_results(run_id,node_id,fencing_generation,success,start_state_hash,result_json,end_state_json,event_cursor_from,event_cursor_to) values(p_run_id,p_node_id,v_version,(p_result->>'success')::boolean,p_start_state_hash,p_result->'summary',p_result->'state',v_version,v_version+1);
 perform public.commit_coop_runtime_server_v1(p_run_id,p_account_id,p_expected_version,r->>'phase',p_node_id,v_count,p_private_state,p_client_projection,v_version+1,'node_resolved',p_client_projection,'live:'||p_run_id||':node:'||p_node_id||':resolved');
 update public.coop_due_jobs set status='complete',lease_until=null where semantic_key='live:'||p_run_id||':node:'||p_node_id;
 if r->>'phase' in ('completed','failed') then
  v_date:=(v_now at time zone 'UTC')::date;v_week:=date_trunc('week',v_now at time zone 'UTC')::date;
  insert into public.coop_reward_entitlements(run_id,recipient_account_id,character_id,entitlement_kind,reward_stage,period_date_key,period_week_key,reward_json)
  select p_run_id,account_id,character_id,'participant','final',v_date,v_week,jsonb_build_object('enhanced_marks',greatest(0,least(1000,p_enhanced_marks))) from public.expedition_run_members where run_id=p_run_id and member_kind='human';
  delete from public.coop_account_reservations where run_id=p_run_id;
 end if;
 return p_client_projection;
end $$;

revoke all on function public.online_live_committed_sources_server_v1(uuid,uuid),public.start_online_live_server_v1(uuid,uuid,uuid,text,jsonb,jsonb,jsonb),public.queue_online_live_node_server_v1(uuid,uuid,bigint,text,text,jsonb,jsonb),public.finalize_online_live_node_server_v1(uuid,uuid,bigint,jsonb,jsonb,text,jsonb,text,integer,integer) from public,anon,authenticated;
grant execute on function public.online_live_committed_sources_server_v1(uuid,uuid),public.start_online_live_server_v1(uuid,uuid,uuid,text,jsonb,jsonb,jsonb),public.queue_online_live_node_server_v1(uuid,uuid,bigint,text,text,jsonb,jsonb),public.finalize_online_live_node_server_v1(uuid,uuid,bigint,jsonb,jsonb,text,jsonb,text,integer,integer) to service_role;
commit;

begin;
create or replace function public.online_live_ready_state_server_v1(p_account_id uuid,p_check_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;v_members jsonb;v_dungeon text;v_tier smallint;
begin
 perform public.expire_online_live_ready_server_v1();
 select * into c from public.coop_ready_checks where id=p_check_id;
 if not found or not exists(select 1 from jsonb_array_elements(c.roster_json) x where x->>'accountId'=p_account_id::text) then raise exception 'not_ready_member';end if;
 select min(expedition_id),min(tier)::smallint into v_dungeon,v_tier from public.matchmaking_tickets where reservation_id=c.id;
 select jsonb_agg(jsonb_build_object('characterId',x->>'characterId','role',x->>'role','self',x->>'accountId'=p_account_id::text,'accepted',exists(select 1 from public.coop_ready_responses r where r.ready_check_id=c.id and r.account_id=(x->>'accountId')::uuid and r.accept))) into v_members from jsonb_array_elements(c.roster_json) x;
 return jsonb_build_object('readyCheckId',c.id,'rosterRevision',c.roster_revision,'status',c.status,'runId',c.run_id,'closesAtMs',floor(extract(epoch from c.closes_at)*1000),'refillEndsAtMs',floor(extract(epoch from c.refill_started_at+interval '60 seconds')*1000),'dungeonId',v_dungeon,'tier',v_tier,'members',v_members,'serverNow',floor(extract(epoch from clock_timestamp())*1000));
end $$;
revoke all on function public.online_live_ready_state_server_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.online_live_ready_state_server_v1(uuid,uuid) to service_role;
commit;
