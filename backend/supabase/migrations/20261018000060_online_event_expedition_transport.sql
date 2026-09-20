-- Persistent seasonal event expeditions reuse the hardened co-op runtime.
-- LiveOps remains authoritative for new entry; event claim grace governs settlement.
begin;

alter table public.expedition_runs drop constraint if exists expedition_runs_coop_mode_check;
alter table public.expedition_runs add constraint expedition_runs_coop_mode_check check(coop_mode in ('live','qmode','event'));

create or replace function public.online_event_expedition_series_server_v1(p_expedition_id text)
returns text language sql immutable security definer set search_path=public as $$
 select case p_expedition_id
  when 'EVENT_TURNING_CHRONICLE_VAULT' then 'EVT_ANNUAL_001'
  when 'EVENT_HEARTBOND_VOW_GARDEN' then 'EVT_ANNUAL_002'
  when 'EVENT_BLOOMWAKE_THORNHEART_GROVE' then 'EVT_ANNUAL_003'
  when 'EVENT_SUNCREST_SHATTERED_ISLES' then 'EVT_ANNUAL_006'
  when 'EVENT_STARFALL_ASTRAL_RIFT' then 'EVT_ANNUAL_008'
  when 'EVENT_VEILBREAK_GLOAM_BREACH' then 'EVT_ANNUAL_010'
  when 'EVENT_MERCHANT_GILDED_ROAD' then 'EVT_ANNUAL_011'
  when 'EVENT_FROSTFALL_AURORA_HOLLOW' then 'EVT_ANNUAL_012'
 end;
$$;

create or replace function public.online_coop_entry_state_server_v1(p_account_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
  'activeRunProjection',(
   select s.projection_json
   from public.coop_run_access_memberships a
   join public.expedition_runs r on r.id=a.run_id
   join public.coop_run_client_snapshots s on s.run_id=r.id
   where a.account_id=p_account_id and a.active and r.coop_mode in ('live','qmode')
    and (r.status='active' or exists(select 1 from public.coop_reward_entitlements e where e.run_id=r.id and e.recipient_account_id=p_account_id and e.claimed_at is null))
   order by r.created_at desc limit 1
  ),
  'activeEventRunProjection',(
   select s.projection_json
   from public.coop_run_access_memberships a
   join public.expedition_runs r on r.id=a.run_id
   join public.coop_run_client_snapshots s on s.run_id=r.id
   join public.coop_run_private_state p on p.run_id=r.id
   where a.account_id=p_account_id and a.active and r.coop_mode='event'
    and (r.status='active' or (r.status='completed' and p.state_json#>>'{run,settlement}'='pending'))
   order by r.created_at desc limit 1
  ),
  'echoSharing',exists(
   select 1 from public.echo_profiles e join public.characters c on c.id=e.character_id
   where c.account_id=p_account_id and e.opted_in and e.expires_at>now() and e.preferences->>'pipeline'='online_coop_v1'
  )
 );
$$;

create or replace function public.load_online_event_expedition_server_v1(p_account_id uuid,p_run_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.expedition_runs where id=p_run_id and coop_mode='event' and controller_account_id=p_account_id) then raise exception 'NOT_PARTICIPANT';end if;
 return public.load_coop_runtime_server_v1(p_run_id,p_account_id)||jsonb_build_object('serverNow',floor(extract(epoch from clock_timestamp())*1000));
end $$;

create or replace function public.start_online_event_expedition_server_v1(
 p_account_id uuid,p_game_version bigint,p_request_id text,p_request_hash text,p_run_id uuid,p_live_event_id text,
 p_private_state jsonb,p_client_projection jsonb,p_members jsonb,p_seed_hash text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_prior jsonb;g public.online_game_states;r jsonb:=p_private_state->'run';m jsonb;s jsonb;e public.echo_profiles;v_index integer:=0;v_series text;
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
 if g.revision<>p_game_version then raise exception 'stale_game_version';end if;
 if r->>'id' is distinct from p_run_id::text or r#>>'{accountIds,0}' is distinct from p_account_id::text or r->>'phase' is distinct from 'awaiting_choice' or r->>'settlement' is distinct from 'pending' then raise exception 'invalid_run';end if;
 if jsonb_array_length(p_members)<>4 or (select count(distinct x#>>'{snapshot,accountId}') from jsonb_array_elements(p_members) x)<>4
  or (select count(distinct x#>>'{snapshot,characterId}') from jsonb_array_elements(p_members) x)<>4
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='tank')<>1
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='damage')<>2
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='support')<>1 then raise exception 'invalid_roster';end if;
 delete from public.coop_account_reservations where account_id=p_account_id and reservation_kind<>'run' and expires_at<=clock_timestamp();
 if exists(select 1 from public.coop_account_reservations where account_id=p_account_id)
  or exists(select 1 from public.coop_run_access_memberships a join public.expedition_runs x on x.id=a.run_id where a.account_id=p_account_id and a.active and x.status='active') then raise exception 'account_already_participating';end if;

 insert into public.expedition_runs(id,expedition_id,tier,content_version,seed_hash,created_by,coop_mode,controller_account_id,route_schema_version,route_graph_json,current_node_id,balance_version,engine_version,phase)
 values(p_run_id,r->>'eventId',1,'online-event-expedition-v1',p_seed_hash,p_account_id,'event',p_account_id,1,r->'graph',r->>'currentNodeId','event-balance-v1','online-event-runtime-v1','awaiting_choice');

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
end $$;

create or replace function public.advance_online_event_expedition_server_v1(
 p_account_id uuid,p_run_id uuid,p_expected_version bigint,p_request_id text,p_request_hash text,
 p_private_state jsonb,p_client_projection jsonb,p_node_id text,p_result jsonb,p_start_state_hash text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_prior jsonb;v_version bigint;v_old jsonb;r jsonb;v_count integer;
begin
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
 v_count:=(select count(*) from jsonb_array_elements_text(r#>'{persistentState,visitedNodeIds}') n where n<>r#>>'{graph,bossNodeId}');
 insert into public.coop_node_results(run_id,node_id,fencing_generation,success,start_state_hash,result_json,end_state_json,event_cursor_from,event_cursor_to)
 values(p_run_id,p_node_id,v_version,(p_result->>'success')::boolean,p_start_state_hash,p_result->'summary',p_result->'state',v_version,v_version+1);
 perform public.commit_coop_runtime_server_v1(p_run_id,p_account_id,p_expected_version,r->>'phase',r->>'currentNodeId',v_count,p_private_state,p_client_projection,v_version+1,'event_node_resolved',p_client_projection,'event:'||p_run_id||':node:'||p_node_id||':resolved');
 if r->>'phase' in ('completed','failed') then delete from public.coop_account_reservations where account_id=p_account_id and run_id=p_run_id;end if;
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json) values(p_account_id,'event_choose_v1',p_run_id::text,p_request_id,p_request_hash,p_client_projection);
 return p_client_projection;
end $$;

create or replace function public.claim_online_event_expedition_server_v1(
 p_account_id uuid,p_run_id uuid,p_expected_version bigint,p_request_id text,p_request_hash text,p_marks integer,
 p_private_state jsonb,p_client_projection jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
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
end $$;

revoke all on function public.online_event_expedition_series_server_v1(text),public.load_online_event_expedition_server_v1(uuid,uuid),public.start_online_event_expedition_server_v1(uuid,bigint,text,text,uuid,text,jsonb,jsonb,jsonb,text),public.advance_online_event_expedition_server_v1(uuid,uuid,bigint,text,text,jsonb,jsonb,text,jsonb,text),public.claim_online_event_expedition_server_v1(uuid,uuid,bigint,text,text,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.online_event_expedition_series_server_v1(text),public.load_online_event_expedition_server_v1(uuid,uuid),public.start_online_event_expedition_server_v1(uuid,bigint,text,text,uuid,text,jsonb,jsonb,jsonb,text),public.advance_online_event_expedition_server_v1(uuid,uuid,bigint,text,text,jsonb,jsonb,text,jsonb,text),public.claim_online_event_expedition_server_v1(uuid,uuid,bigint,text,text,integer,jsonb,jsonb) to service_role;
revoke all on function public.online_coop_entry_state_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.online_coop_entry_state_server_v1(uuid) to service_role;
commit;
