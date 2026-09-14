-- Durable Q-Mode commands reuse the co-op runtime, membership, reservation,
-- receipt, node-result and entitlement tables. No second Party system.
begin;
create or replace function public.read_online_coop_receipt_server_v1(p_account_id uuid,p_operation text,p_resource_id text,p_request_id text)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('requestHash',request_hash,'response',response_json)
 from public.coop_idempotency_receipts where caller_account_id=p_account_id and operation=p_operation and resource_id=p_resource_id and request_id=p_request_id;
$$;

create or replace function public.load_online_qmode_server_v1(p_account_id uuid,p_run_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.expedition_runs where id=p_run_id and coop_mode='qmode' and controller_account_id=p_account_id) then raise exception 'NOT_PARTICIPANT';end if;
 return public.load_coop_runtime_server_v1(p_run_id,p_account_id)||jsonb_build_object('serverNow',floor(extract(epoch from clock_timestamp())*1000));
end $$;

create or replace function public.online_coop_entry_state_server_v1(p_account_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('activeRunProjection',(
  select s.projection_json from public.coop_run_access_memberships a join public.expedition_runs r on r.id=a.run_id join public.coop_run_client_snapshots s on s.run_id=r.id
  where a.account_id=p_account_id and a.active and (r.status='active' or exists(select 1 from public.coop_reward_entitlements e where e.run_id=r.id and e.recipient_account_id=p_account_id and e.claimed_at is null)) order by r.created_at desc limit 1
 ),'echoSharing',exists(select 1 from public.echo_profiles e join public.characters c on c.id=e.character_id where c.account_id=p_account_id and e.opted_in and e.expires_at>now() and e.preferences->>'pipeline'='online_coop_v1'));
$$;

create or replace function public.start_online_qmode_server_v1(
 p_account_id uuid,p_game_version bigint,p_request_id text,p_request_hash text,p_run_id uuid,
 p_private_state jsonb,p_client_projection jsonb,p_members jsonb,p_seed_hash text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_prior jsonb;g public.online_game_states;r jsonb:=p_private_state->'run';m jsonb;s jsonb;e public.echo_profiles;v_index integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended('online-coop:'||p_account_id::text,0));
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'qmode_start_v1',p_account_id::text,p_request_id);
 if v_prior is not null then if v_prior->>'requestHash'<>p_request_hash then raise exception 'idempotency_key_conflict';end if;return v_prior->'response';end if;
 if char_length(p_request_id) not between 8 and 128 or p_request_hash!~'^[a-f0-9]{64}$' then raise exception 'invalid_request';end if;
 select * into g from public.online_game_states where account_id=p_account_id for share;
 if not found or g.character_id is null then raise exception 'character_required';end if;
 if g.revision<>p_game_version then raise exception 'stale_game_version';end if;
 if r->>'id' is distinct from p_run_id::text or r->>'controllerAccountId' is distinct from p_account_id::text or r->>'phase' is distinct from 'awaiting_choice' then raise exception 'invalid_run';end if;
 if jsonb_array_length(p_members)<>4 or (select count(distinct x#>>'{snapshot,accountId}') from jsonb_array_elements(p_members) x)<>4
  or (select count(distinct x#>>'{snapshot,characterId}') from jsonb_array_elements(p_members) x)<>4
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='tank')<>1
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='damage')<>2
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='support')<>1 then raise exception 'invalid_roster';end if;
 delete from public.coop_account_reservations where account_id=p_account_id and reservation_kind<>'run' and expires_at<=clock_timestamp();
 if exists(select 1 from public.coop_account_reservations where account_id=p_account_id)
  or exists(select 1 from public.coop_run_access_memberships a join public.expedition_runs x on x.id=a.run_id where a.account_id=p_account_id and a.active and x.status='active') then raise exception 'account_already_participating';end if;
 insert into public.expedition_runs(id,expedition_id,tier,content_version,seed_hash,created_by,coop_mode,controller_account_id,route_schema_version,route_graph_json,current_node_id,balance_version,engine_version,phase)
 values(p_run_id,r->>'expeditionId',(r->>'tier')::smallint,'online-coop-loadout-v1',p_seed_hash,p_account_id,'qmode',p_account_id,1,r->'graph',r->>'currentNodeId','online-coop-loadout-v1','online-coop-runtime-v1','awaiting_choice');
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
 insert into public.coop_outbox(semantic_key,run_id,channel_epoch,event_type,client_payload) values('qmode:'||p_run_id||':start',p_run_id,1,'run_started',p_client_projection);
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json) values(p_account_id,'qmode_start_v1',p_account_id::text,p_request_id,p_request_hash,p_client_projection);
 return p_client_projection;
end $$;

create or replace function public.queue_online_qmode_node_server_v1(p_account_id uuid,p_run_id uuid,p_expected_version bigint,p_request_id text,p_request_hash text,p_private_state jsonb,p_client_projection jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_prior jsonb;v_state jsonb;v_version bigint;v_due numeric;v_node text;
begin
 select state_version into v_version from public.expedition_runs where id=p_run_id and coop_mode='qmode' and controller_account_id=p_account_id for update;
 if not found then raise exception 'NOT_PARTICIPANT';end if;
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'qmode_choose_v1',p_run_id::text,p_request_id);
 if v_prior is not null then if v_prior->>'requestHash'<>p_request_hash then raise exception 'idempotency_key_conflict';end if;return v_prior->'response';end if;
 if v_version<>p_expected_version then raise exception 'STALE_STATE';end if;
 select state_json into v_state from public.coop_run_private_state where run_id=p_run_id;
 if v_state ? 'pending' then raise exception 'node_resolving';end if;
 if v_state->'run' is distinct from p_private_state->'run' or v_state->'seed' is distinct from p_private_state->'seed' then raise exception 'invalid_pending_state';end if;
 v_due:=(p_private_state#>>'{pending,resolvesAtMs}')::numeric;v_node:=p_private_state#>>'{pending,run,currentNodeId}';
 if v_due is null or v_due>extract(epoch from clock_timestamp())*1000+181000 or v_node is null then raise exception 'invalid_node_deadline';end if;
 perform public.commit_coop_runtime_server_v1(p_run_id,p_account_id,p_expected_version,'resolving_node',v_state#>>'{run,currentNodeId}',jsonb_array_length(v_state#>'{run,persistentState,visitedNodeIds}'),p_private_state,p_client_projection,v_version+1,'node_started',p_client_projection,'qmode:'||p_run_id||':node:'||v_node||':start');
 insert into public.coop_due_jobs(semantic_key,job_kind,resource_id,due_at,payload) values('qmode:'||p_run_id||':node:'||v_node,'qmode_node',p_run_id::text,to_timestamp(v_due/1000),jsonb_build_object('controllerAccountId',p_account_id,'nodeId',v_node));
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json) values(p_account_id,'qmode_choose_v1',p_run_id::text,p_request_id,p_request_hash,p_client_projection);
 return p_client_projection;
end $$;

create or replace function public.finalize_online_qmode_node_server_v1(p_account_id uuid,p_run_id uuid,p_expected_version bigint,p_private_state jsonb,p_client_projection jsonb,p_node_id text,p_result jsonb,p_start_state_hash text,p_enhanced_marks integer,p_assistance_marks integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_version bigint;v_state jsonb;r jsonb;v_count integer;v_now timestamptz:=clock_timestamp();v_date date;v_week date;m record;v_daily integer;v_weekly integer;
begin
 select state_version into v_version from public.expedition_runs where id=p_run_id and coop_mode='qmode' and controller_account_id=p_account_id for update;
 if not found then raise exception 'NOT_PARTICIPANT';end if;
 select state_json into v_state from public.coop_run_private_state where run_id=p_run_id;
 if not (v_state ? 'pending') then return (select projection_json from public.coop_run_client_snapshots where run_id=p_run_id);end if;
 if v_version<>p_expected_version then raise exception 'STALE_STATE';end if;
 if (v_state#>>'{pending,resolvesAtMs}')::numeric>extract(epoch from v_now)*1000 then raise exception 'node_not_due';end if;
 r:=v_state#>'{pending,run}';
 if r is distinct from p_private_state->'run' or v_state->'seed' is distinct from p_private_state->'seed'
  or r->>'currentNodeId' is distinct from p_node_id or r#>'{lastResolution,result}' is distinct from p_result
  or v_state#>>'{pending,startStateHash}' is distinct from p_start_state_hash then raise exception 'invalid_node_result';end if;
 v_count:=(select count(*) from jsonb_array_elements_text(r#>'{persistentState,visitedNodeIds}') n where n<>r#>>'{graph,bossNodeId}');
 insert into public.coop_node_results(run_id,node_id,fencing_generation,success,start_state_hash,result_json,end_state_json,event_cursor_from,event_cursor_to)
 values(p_run_id,p_node_id,v_version,(p_result->>'success')::boolean,p_start_state_hash,p_result->'summary',p_result->'state',v_version,v_version+1);
 perform public.commit_coop_runtime_server_v1(p_run_id,p_account_id,p_expected_version,r->>'phase',p_node_id,v_count,p_private_state,p_client_projection,v_version+1,'node_resolved',p_client_projection,'qmode:'||p_run_id||':node:'||p_node_id||':resolved');
 update public.coop_due_jobs set status='complete',lease_until=null where semantic_key='qmode:'||p_run_id||':node:'||p_node_id;
 if r->>'phase' in ('completed','failed') then
  if p_enhanced_marks is null or p_enhanced_marks<0 or p_enhanced_marks>1000 or p_assistance_marks is null or p_assistance_marks<0 or p_assistance_marks>100 then raise exception 'invalid_reward';end if;
  v_date:=(v_now at time zone 'UTC')::date;v_week:=date_trunc('week',v_now at time zone 'UTC')::date;
  insert into public.coop_reward_entitlements(run_id,recipient_account_id,character_id,entitlement_kind,reward_stage,period_date_key,period_week_key,reward_json)
  select p_run_id,p_account_id,character_id,'participant','final',v_date,v_week,jsonb_build_object('enhanced_marks',p_enhanced_marks) from public.expedition_run_members where run_id=p_run_id and member_kind='human';
  -- Reserve assistance budgets at earning time under per-owner locks. Delayed
  -- claims cannot create additional daily/weekly assistance entitlements.
  for m in select account_id,character_id from public.expedition_run_members where run_id=p_run_id and member_kind='echo' order by account_id loop
   perform pg_advisory_xact_lock(hashtextextended('online-coop-assistance:'||m.account_id::text,0));
   select count(*) filter(where period_date_key=v_date),count(*) filter(where period_week_key=v_week) into v_daily,v_weekly from public.coop_reward_entitlements where recipient_account_id=m.account_id and entitlement_kind='echo_assistance' and period_week_key=v_week and coalesce((reward_json->>'marks')::integer,0)>0;
   insert into public.coop_reward_entitlements(run_id,recipient_account_id,character_id,entitlement_kind,reward_stage,period_date_key,period_week_key,reward_json)
   values(p_run_id,m.account_id,m.character_id,'echo_assistance','final',v_date,v_week,jsonb_build_object('marks',case when v_daily<5 and v_weekly<25 then p_assistance_marks else 0 end));
  end loop;
  delete from public.coop_account_reservations where account_id=p_account_id and run_id=p_run_id;
 end if;
 return p_client_projection;
end $$;

-- Co-op clients use the explicit sanitized snapshot. The legacy raw tables hold
-- future routes and Echo source identities and remain readable for legacy runs.
drop policy if exists expedition_runs_read_member on public.expedition_runs;
create policy expedition_runs_read_member on public.expedition_runs for select using(coop_mode is null and public.can_read_expedition_run(id));
drop policy if exists expedition_run_members_read_self_run on public.expedition_run_members;
create policy expedition_run_members_read_self_run on public.expedition_run_members for select using(exists(select 1 from public.expedition_runs r where r.id=run_id and r.coop_mode is null and public.can_read_expedition_run(r.id)));

revoke all on function public.read_online_coop_receipt_server_v1(uuid,text,text,text),public.load_online_qmode_server_v1(uuid,uuid),public.start_online_qmode_server_v1(uuid,bigint,text,text,uuid,jsonb,jsonb,jsonb,text),public.queue_online_qmode_node_server_v1(uuid,uuid,bigint,text,text,jsonb,jsonb),public.finalize_online_qmode_node_server_v1(uuid,uuid,bigint,jsonb,jsonb,text,jsonb,text,integer,integer) from public,anon,authenticated;
grant execute on function public.read_online_coop_receipt_server_v1(uuid,text,text,text),public.load_online_qmode_server_v1(uuid,uuid),public.start_online_qmode_server_v1(uuid,bigint,text,text,uuid,jsonb,jsonb,jsonb,text),public.queue_online_qmode_node_server_v1(uuid,uuid,bigint,text,text,jsonb,jsonb),public.finalize_online_qmode_node_server_v1(uuid,uuid,bigint,jsonb,jsonb,text,jsonb,text,integer,integer) to service_role;
revoke all on function public.online_coop_entry_state_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.online_coop_entry_state_server_v1(uuid) to service_role;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='coop_run_client_snapshots') then
  alter publication supabase_realtime add table public.coop_run_client_snapshots;
 end if;
end $$;
commit;
