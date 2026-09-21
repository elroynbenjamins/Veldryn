-- Pool Live co-op by dungeon rather than requested tier.
-- Each ticket's tier stores the maximum tier that account can safely enter.
-- A matched roster launches at min(max_tier), i.e. the highest tier shared by all four players.
begin;

create index if not exists coop_live_auto_role_bucket_idx
 on public.matchmaking_tickets(expedition_id,content_version,balance_version,role,created_at)
 where mode='live' and status='queued';

create or replace function public.reserve_coop_match_server_v1(
  p_ticket_ids uuid[],
  p_reservation_id uuid,
  p_now timestamptz,
  p_expires_at timestamptz,
  p_readiness_floor numeric default 0.8
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_count integer; v_eligible integer; v_accounts integer; v_characters integer;
  v_partitions integer; v_tanks integer; v_damage integer; v_support integer;
  v_result jsonb;
begin
  if cardinality(p_ticket_ids)<>4 or p_expires_at<=p_now then raise exception 'INVALID_RESERVATION_REQUEST'; end if;
  perform 1 from public.matchmaking_tickets where id=any(p_ticket_ids) order by id for update;
  select count(*),
    count(*) filter(where status='queued' and heartbeat_expires_at>p_now and normalized_readiness>=p_readiness_floor
      and account_id is not null and loadout_id is not null and loadout_revision is not null and loadout_snapshot_hash is not null),
    count(distinct account_id),count(distinct character_id),
    count(distinct (expedition_id,content_version,balance_version)),
    count(*) filter(where role='tank'),count(*) filter(where role='damage'),count(*) filter(where role='support')
  into v_count,v_eligible,v_accounts,v_characters,v_partitions,v_tanks,v_damage,v_support
  from public.matchmaking_tickets where id=any(p_ticket_ids);
  if v_count<>4 or v_eligible<>4 or v_accounts<>4 or v_characters<>4 or v_partitions<>1
    or v_tanks<>1 or v_damage<>2 or v_support<>1 then raise exception 'RESERVATION_CONFLICT'; end if;

  insert into public.coop_account_reservations(account_id,ticket_id,reservation_kind,expires_at)
  select account_id,id,'queue',p_expires_at from public.matchmaking_tickets where id=any(p_ticket_ids);
  update public.matchmaking_tickets set status='reserved',reservation_id=p_reservation_id,reservation_expires_at=p_expires_at
  where id=any(p_ticket_ids) and status='queued';
  if not found then raise exception 'RESERVATION_CONFLICT'; end if;
  select jsonb_agg(jsonb_build_object(
    'ticketId',id,'accountId',account_id,'characterId',character_id,'role',role,
    'loadoutId',loadout_id,'loadoutRevision',loadout_revision,'loadoutSnapshotHash',loadout_snapshot_hash,
    'originalEnqueuedAt',created_at,'reservationId',reservation_id,'reservationExpiresAt',reservation_expires_at
  ) order by role,id) into v_result from public.matchmaking_tickets where id=any(p_ticket_ids);
  return v_result;
exception when unique_violation then raise exception 'RESERVATION_CONFLICT';
end; $$;

create or replace function public.online_live_queue_state_server_v1(p_account_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('ticket',(
  select jsonb_build_object('ticketId',t.id,'dungeonId',t.expedition_id,'tier',t.tier,'maxTier',t.tier,'role',t.role,
   'status',case when t.status='queued' and t.heartbeat_expires_at<=clock_timestamp() then 'expired' else t.status end,
   'enqueuedAt',t.created_at,'heartbeatExpiresAt',t.heartbeat_expires_at,'reservationId',t.reservation_id)
  from public.matchmaking_tickets t where t.account_id=p_account_id and t.mode='live'
   and t.content_version='online-coop-loadout-v1' order by t.created_at desc,t.id limit 1
 ),'serverNow',floor(extract(epoch from clock_timestamp())*1000));
$$;

create or replace function public.join_online_live_queue_server_v1(
 p_account_id uuid,p_game_version bigint,p_request_id text,p_request_hash text,p_ticket_id uuid,
 p_expedition_id text,p_tier smallint,p_content_version text,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare g public.online_game_states;v_prior jsonb;v_response jsonb;v_now timestamptz:=clock_timestamp();
begin
 perform pg_advisory_xact_lock(hashtextextended('online-coop:'||p_account_id::text,0));
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'live_queue_v1',p_account_id::text,p_request_id);
 if v_prior is not null then
  if v_prior->>'requestHash' is distinct from p_request_hash then raise exception 'idempotency_key_conflict';end if;
  return v_prior->'response';
 end if;
 if p_request_id is null or p_request_id!~'^[a-zA-Z0-9_-]{8,128}$' or p_request_hash is null or p_request_hash!~'^[a-f0-9]{64}$'
  or p_tier is null or p_tier not between 1 and 5 or p_content_version is distinct from 'online-coop-loadout-v1'
  or p_expedition_id is null or p_expedition_id not in ('EXP_001','EXP_002','EXP_003','EXP_004','EXP_005','EXP_006','EXP_007','EXP_008') then raise exception 'invalid_request';end if;
 select * into g from public.online_game_states where account_id=p_account_id for share;
 if not found or g.character_id is null then raise exception 'character_required';end if;
 if g.revision is distinct from p_game_version then raise exception 'stale_game_version';end if;
 if p_snapshot->>'accountId' is distinct from p_account_id::text or p_snapshot->>'characterId' is distinct from g.character_id::text
  or p_snapshot->>'revision' is distinct from g.revision::text or p_snapshot->>'loadoutId' is distinct from 'current'
  or (p_snapshot#>>'{readiness,ready}')::boolean is not true
  or coalesce(p_snapshot#>>'{readiness,role}','') not in ('tank','damage','support')
  or coalesce(p_snapshot#>>'{snapshotHash}','')!~'^[a-f0-9]{64}$'
  or not coalesce((p_snapshot#>>'{readiness,normalizedScore}')::numeric between 0.8 and 1000000,false)
 then raise exception 'invalid_loadout';end if;
 v_now:=clock_timestamp();
 update public.matchmaking_tickets set status='expired' where account_id=p_account_id and mode='live'
  and status='queued' and heartbeat_expires_at<=v_now;
 delete from public.coop_account_reservations where account_id=p_account_id and reservation_kind='queue' and expires_at<=v_now;
 if exists(select 1 from public.coop_account_reservations where account_id=p_account_id)
  or exists(select 1 from public.matchmaking_tickets where account_id=p_account_id and mode='live' and status in ('queued','reserved','matched'))
  or exists(select 1 from public.coop_run_access_memberships a join public.expedition_runs r on r.id=a.run_id where a.account_id=p_account_id and a.active and r.status='active')
 then raise exception 'account_already_participating';end if;
 insert into public.matchmaking_tickets(id,account_id,character_id,mode,role,power_index,expedition_id,echo_allowed,
  tier,content_version,balance_version,service_region,normalized_readiness,loadout_id,loadout_revision,loadout_snapshot_hash,heartbeat_expires_at,created_at)
 values(p_ticket_id,p_account_id,g.character_id,'live',p_snapshot#>>'{readiness,role}',(p_snapshot#>>'{readiness,normalizedScore}')::numeric,p_expedition_id,false,
  p_tier,p_content_version,p_content_version,'default',(p_snapshot#>>'{readiness,normalizedScore}')::numeric,'current',g.revision,p_snapshot->>'snapshotHash',v_now+interval '30 seconds',v_now);
 insert into public.coop_account_reservations(account_id,ticket_id,reservation_kind,expires_at)
 values(p_account_id,p_ticket_id,'queue',v_now+interval '30 seconds');
 v_response:=public.online_live_queue_state_server_v1(p_account_id);
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json)
 values(p_account_id,'live_queue_v1',p_account_id::text,p_request_id,p_request_hash,v_response);
 return v_response;
end $$;

create or replace function public.online_live_candidates_server_v1(p_account_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t public.matchmaking_tickets;c public.coop_ready_checks;v_rows jsonb;v_required jsonb:='[]';v_now timestamptz;v_blocks jsonb;
begin
 perform public.expire_online_live_ready_server_v1();v_now:=clock_timestamp();
 select * into t from public.matchmaking_tickets where account_id=p_account_id and mode='live' and content_version='online-coop-loadout-v1'
  and status in ('queued','reserved') order by created_at desc limit 1;
 if t.status='reserved' then select * into c from public.coop_ready_checks where id=t.reservation_id and status='refilling';end if;
 if t.id is null or t.status='reserved' and c.id is null or t.status='queued' and t.heartbeat_expires_at<=v_now then
  return jsonb_build_object('tickets','[]'::jsonb,'requiredTicketIds','[]'::jsonb,'refillId',null,'serverNow',floor(extract(epoch from v_now)*1000));
 end if;
 if c.id is null then
  select rc.* into c from public.coop_ready_checks rc join public.matchmaking_tickets q on q.reservation_id=rc.id
   where rc.status='refilling' and q.status='reserved' and q.expedition_id=t.expedition_id
    and q.content_version=t.content_version and q.balance_version=t.balance_version order by rc.refill_started_at,rc.id limit 1;
 end if;
 if c.id is not null then select coalesce(jsonb_agg(id),'[]') into v_required from public.matchmaking_tickets where reservation_id=c.id and status='reserved';end if;
 if not (v_required @> jsonb_build_array(t.id)) then v_required:=v_required||jsonb_build_array(t.id);end if;
 with eligible as (
  select q.*,row_number() over(partition by q.role order by (q.reservation_id=c.id) desc nulls last,q.created_at,q.id) as position
  from public.matchmaking_tickets q join public.online_game_states g on g.account_id=q.account_id
  where q.mode='live' and q.expedition_id=t.expedition_id and q.content_version=t.content_version and q.balance_version=t.balance_version
   and g.character_id=q.character_id and g.revision=q.loadout_revision
   and (q.status='queued' and q.heartbeat_expires_at>v_now or q.status='reserved' and q.reservation_id=c.id)
   and not exists(select 1 from public.player_blocks b where b.blocker_id=p_account_id and b.blocked_id=q.account_id or b.blocked_id=p_account_id and b.blocker_id=q.account_id)
 ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'accountId',account_id,'characterId',character_id,'role',role,'normalizedReadiness',normalized_readiness,
  'loadoutId',loadout_id,'loadoutRevision',loadout_revision,'loadoutSnapshotHash',loadout_snapshot_hash,'expeditionId',expedition_id,'tier',tier,'contentVersion',content_version,'balanceVersion',balance_version,'serviceRegion',service_region,
  'enqueuedAtMs',floor(extract(epoch from created_at)*1000),'heartbeatExpiresAtMs',floor(extract(epoch from case when status='reserved' then c.refill_started_at+interval '60 seconds' else heartbeat_expires_at end)*1000),'status','queued')),'[]')
 into v_rows from eligible where position<=8;
 select coalesce(jsonb_agg(jsonb_build_object('blocker',blocker_id,'blocked',blocked_id)),'[]') into v_blocks from public.player_blocks
  where blocker_id in (select (x->>'accountId')::uuid from jsonb_array_elements(v_rows) x) and blocked_id in (select (x->>'accountId')::uuid from jsonb_array_elements(v_rows) x);
 return jsonb_build_object('tickets',v_rows,'serverNow',floor(extract(epoch from v_now)*1000),'refillId',c.id,'requiredTicketIds',v_required,'blockedPairs',v_blocks);
end $$;

create or replace function public.online_live_ready_sources_server_v1(p_account_id uuid,p_check_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;v_members jsonb;v_dungeon text;v_tier smallint;v_dungeons integer;
begin
 select * into c from public.coop_ready_checks where id=p_check_id;
 if not found or not exists(select 1 from jsonb_array_elements(c.roster_json) x where x->>'accountId'=p_account_id::text) then raise exception 'not_ready_member';end if;
 if c.status<>'open' or c.closes_at<=clock_timestamp() then raise exception 'ready_check_closed';end if;
 select min(expedition_id),min(tier)::smallint,count(distinct expedition_id) into v_dungeon,v_tier,v_dungeons
 from public.matchmaking_tickets where reservation_id=c.id;
 if v_dungeons<>1 or v_tier is null then raise exception 'reservation_conflict';end if;
 select jsonb_agg(x||jsonb_build_object('state',g.state,'version',g.revision)) into v_members
 from jsonb_array_elements(c.roster_json) x join public.online_game_states g on g.account_id=(x->>'accountId')::uuid;
 return jsonb_build_object('dungeonId',v_dungeon,'tier',v_tier,'members',v_members);
end $$;

create or replace function public.online_live_ready_state_server_v1(p_account_id uuid,p_check_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;v_members jsonb;v_dungeon text;v_tier smallint;
begin
 perform public.expire_online_live_ready_server_v1();
 select * into c from public.coop_ready_checks where id=p_check_id;
 if not found or not exists(select 1 from jsonb_array_elements(c.roster_json) x where x->>'accountId'=p_account_id::text) then raise exception 'not_ready_member';end if;
 select min(expedition_id),min(tier)::smallint into v_dungeon,v_tier from public.matchmaking_tickets where reservation_id=c.id;
 select jsonb_agg(jsonb_build_object('characterId',x->>'characterId','role',x->>'role','self',x->>'accountId'=p_account_id::text,
  'accepted',exists(select 1 from public.coop_ready_responses r where r.ready_check_id=c.id and r.account_id=(x->>'accountId')::uuid and r.accept)))
 into v_members from jsonb_array_elements(c.roster_json) x;
 return jsonb_build_object('readyCheckId',c.id,'rosterRevision',c.roster_revision,'status',c.status,'closesAtMs',floor(extract(epoch from c.closes_at)*1000),
  'refillEndsAtMs',floor(extract(epoch from c.refill_started_at+interval '60 seconds')*1000),'dungeonId',v_dungeon,'tier',v_tier,'members',v_members,'serverNow',floor(extract(epoch from clock_timestamp())*1000));
end $$;

revoke all on function public.reserve_coop_match_server_v1(uuid[],uuid,timestamptz,timestamptz,numeric) from public,anon,authenticated;
revoke all on function public.online_live_queue_state_server_v1(uuid) from public,anon,authenticated;
revoke all on function public.join_online_live_queue_server_v1(uuid,bigint,text,text,uuid,text,smallint,text,jsonb) from public,anon,authenticated;
revoke all on function public.online_live_candidates_server_v1(uuid) from public,anon,authenticated;
revoke all on function public.online_live_ready_sources_server_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.online_live_ready_state_server_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_coop_match_server_v1(uuid[],uuid,timestamptz,timestamptz,numeric) to service_role;
grant execute on function public.online_live_queue_state_server_v1(uuid),public.join_online_live_queue_server_v1(uuid,bigint,text,text,uuid,text,smallint,text,jsonb),public.online_live_candidates_server_v1(uuid),public.online_live_ready_sources_server_v1(uuid,uuid),public.online_live_ready_state_server_v1(uuid,uuid) to service_role;

commit;
