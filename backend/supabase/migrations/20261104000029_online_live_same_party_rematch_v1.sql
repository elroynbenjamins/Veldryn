-- Same-roster Live rematches. All four authenticated participants must consent;
-- the current server-owned equipment snapshots are frozen again at commitment.
begin;

create table if not exists public.coop_live_rematch_sessions (
 source_run_id uuid primary key references public.expedition_runs(id) on delete cascade,
 ready_check_id uuid not null unique,
 status text not null check(status in ('open','committed','declined','expired')),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null
);
create table if not exists public.coop_live_rematch_votes (
 source_run_id uuid not null references public.coop_live_rematch_sessions(source_run_id) on delete cascade,
 account_id uuid not null,
 request_id text not null,
 accepted boolean not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(source_run_id,account_id)
);
alter table public.coop_live_rematch_sessions enable row level security;
alter table public.coop_live_rematch_votes enable row level security;
revoke all on public.coop_live_rematch_sessions,public.coop_live_rematch_votes from public,anon,authenticated;
grant all on public.coop_live_rematch_sessions,public.coop_live_rematch_votes to service_role;

create or replace function public.online_live_rematch_sources_server_v1(p_account_id uuid,p_run_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.expedition_runs;v_members jsonb;
begin
 select * into r from public.expedition_runs where id=p_run_id and coop_mode='live' and phase='completed';
 if not found then raise exception 'rematch_unavailable';end if;
 if not exists(select 1 from public.expedition_run_members where run_id=p_run_id and account_id=p_account_id and member_kind='human') then raise exception 'not_participant';end if;
 select jsonb_agg(jsonb_build_object(
  'accountId',m.account_id,'characterId',m.character_id,'loadoutId','current',
  'loadoutRevision',g.revision,'version',g.revision,'state',g.state
 ) order by m.slot_id)
 into v_members
 from public.expedition_run_members m
 join public.online_game_states g on g.account_id=m.account_id
 where m.run_id=p_run_id and m.member_kind='human' and m.account_id is not null;
 if coalesce(jsonb_array_length(v_members),0)<>4 then raise exception 'rematch_roster_unavailable';end if;
 return jsonb_build_object('dungeonId',r.expedition_id,'tier',r.tier,'members',v_members);
end $$;

create or replace function public.online_live_rematch_state_server_v1(p_account_id uuid,p_run_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.coop_live_rematch_sessions;c public.coop_ready_checks;v_members jsonb;
begin
 if not exists(select 1 from public.expedition_runs r join public.expedition_run_members m on m.run_id=r.id where r.id=p_run_id and r.coop_mode='live' and r.phase='completed' and m.account_id=p_account_id and m.member_kind='human') then raise exception 'not_participant';end if;
 select * into s from public.coop_live_rematch_sessions where source_run_id=p_run_id;
 if s.source_run_id is not null and s.status='committed' then select * into c from public.coop_ready_checks where id=s.ready_check_id;end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'accountId',m.account_id,'characterId',m.character_id,'role',m.role,
  'self',m.account_id=p_account_id,'accepted',coalesce(v.accepted,false)
 ) order by m.slot_id),'[]'::jsonb) into v_members
 from public.expedition_run_members m
 left join public.coop_live_rematch_votes v on v.source_run_id=p_run_id and v.account_id=m.account_id
 where m.run_id=p_run_id and m.member_kind='human';
 return jsonb_build_object(
  'status',case when s.source_run_id is null then 'open'
      when s.status='open' and s.expires_at<=clock_timestamp() then 'expired' else s.status end,
  'readyCheckId',s.ready_check_id,'runId',c.run_id,
  'closesAtMs',floor(extract(epoch from s.expires_at)*1000),
  'serverNow',floor(extract(epoch from clock_timestamp())*1000),
  'members',v_members
 );
end $$;

create or replace function public.online_live_rematch_respond_server_v1(
 p_account_id uuid,p_run_id uuid,p_request_id text,p_accept boolean,p_check_id uuid,p_frozen_roster jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.coop_live_rematch_sessions;r public.expedition_runs;v_vote public.coop_live_rematch_votes;
 v_count integer;v_roster jsonb;v_now timestamptz:=clock_timestamp();m jsonb;a uuid;
begin
 if p_request_id is null or p_request_id!~'^[a-zA-Z0-9_-]{8,128}$' or p_check_id is null then raise exception 'invalid_request';end if;
 perform pg_advisory_xact_lock(hashtextextended('online-live-rematch:'||p_run_id::text,0));
 select * into r from public.expedition_runs where id=p_run_id and coop_mode='live' and phase='completed' for share;
 if not found then raise exception 'rematch_unavailable';end if;
 if not exists(select 1 from public.expedition_run_members where run_id=p_run_id and member_kind='human' and account_id=p_account_id) then raise exception 'not_participant';end if;
 if (select count(*) from public.expedition_run_members where run_id=p_run_id and member_kind='human')<>4 then raise exception 'rematch_roster_unavailable';end if;

 select * into s from public.coop_live_rematch_sessions where source_run_id=p_run_id for update;
 if not found then
  insert into public.coop_live_rematch_sessions(source_run_id,ready_check_id,status,expires_at)
  values(p_run_id,p_check_id,'open',v_now+interval '120 seconds') returning * into s;
 end if;
 if s.status<>'open' or s.expires_at<=v_now then raise exception 'rematch_closed';end if;
 select * into v_vote from public.coop_live_rematch_votes where source_run_id=p_run_id and account_id=p_account_id;
 if found then
  if v_vote.request_id<>p_request_id or v_vote.accepted is distinct from p_accept then raise exception 'rematch_vote_locked';end if;
  return public.online_live_rematch_state_server_v1(p_account_id,p_run_id);
 end if;

 if p_accept then
  if p_frozen_roster is null or jsonb_typeof(p_frozen_roster)<>'array' or jsonb_array_length(p_frozen_roster)<>4 then raise exception 'invalid_frozen_roster';end if;
  -- Lock current account snapshots in stable order before validating all four.
  perform 1 from public.online_game_states
   where account_id in(select (x->>'accountId')::uuid from jsonb_array_elements(p_frozen_roster) x)
   order by account_id for share;
  select count(*) into v_count from jsonb_array_elements(p_frozen_roster) x
   join public.expedition_run_members rm on rm.run_id=p_run_id and rm.member_kind='human'
      and rm.account_id=(x->>'accountId')::uuid and rm.character_id=(x->>'characterId')::uuid
   join public.online_game_states g on g.account_id=rm.account_id and g.character_id=rm.character_id
      and g.revision=(x->>'revision')::bigint
   where (x#>>'{readiness,ready}')::boolean is true
    and x->>'loadoutId'='current' and x#>>'{readiness,role}'=rm.role;
  if v_count<>4 or (select count(distinct x->>'accountId') from jsonb_array_elements(p_frozen_roster) x)<>4
    then raise exception 'rematch_loadout_changed';end if;
  if exists(select 1 from public.coop_run_access_memberships a
    join public.expedition_runs e on e.id=a.run_id
    where a.account_id in(select (x->>'accountId')::uuid from jsonb_array_elements(p_frozen_roster) x)
      and a.active and e.status='active' and e.id<>p_run_id) then raise exception 'account_already_participating';end if;
  if exists(select 1 from public.coop_account_reservations ar
    where ar.account_id in(select (x->>'accountId')::uuid from jsonb_array_elements(p_frozen_roster) x))
    then raise exception 'account_already_participating';end if;
 end if;

 insert into public.coop_live_rematch_votes(source_run_id,account_id,request_id,accepted) values(p_run_id,p_account_id,p_request_id,p_accept);
 if not p_accept then
  update public.coop_live_rematch_sessions set status='declined' where source_run_id=p_run_id;
  return public.online_live_rematch_state_server_v1(p_account_id,p_run_id);
 end if;
 select count(*) into v_count from public.coop_live_rematch_votes where source_run_id=p_run_id and accepted;
 if v_count=4 then
  -- Recheck all four current snapshots at the instant of commitment.
  select count(*) into v_count from jsonb_array_elements(p_frozen_roster) x
   join public.online_game_states g on g.account_id=(x->>'accountId')::uuid and g.character_id=(x->>'characterId')::uuid
   where g.revision=(x->>'revision')::bigint;
  if v_count<>4 then raise exception 'rematch_loadout_changed';end if;
  select jsonb_agg(jsonb_build_object('accountId',x->>'accountId','characterId',x->>'characterId','role',x#>>'{readiness,role}',
    'loadoutId','current','loadoutRevision',(x->>'revision')::bigint) order by x->>'accountId')
    into v_roster from jsonb_array_elements(p_frozen_roster) x;
  insert into public.coop_ready_checks(id,party_id,roster_revision,roster_json,frozen_roster_json,status,opened_at,closes_at)
    values(s.ready_check_id,s.ready_check_id,1,v_roster,p_frozen_roster,'committed',v_now,v_now+interval '90 seconds');
  update public.coop_live_rematch_sessions set status='committed' where source_run_id=p_run_id;
 end if;
 return public.online_live_rematch_state_server_v1(p_account_id,p_run_id);
end $$;

-- The normal Live-start path also serves rematch-ready checks. A rematch must
-- retain the source dungeon/tier, rather than consulting old queue tickets.
create or replace function public.online_live_committed_sources_server_v1(p_account_id uuid,p_check_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;v_dungeon text;v_tier smallint;
begin
 select * into c from public.coop_ready_checks where id=p_check_id;
 if not found or c.status<>'committed'
  or not exists(select 1 from jsonb_array_elements(c.roster_json) x where x->>'accountId'=p_account_id::text)
 then raise exception 'not_ready_member';end if;
 select r.expedition_id,r.tier into v_dungeon,v_tier from public.coop_live_rematch_sessions s
   join public.expedition_runs r on r.id=s.source_run_id
   where s.ready_check_id=c.id and s.status='committed';
 if v_dungeon is null then
  select min(expedition_id),min(tier)::smallint into v_dungeon,v_tier from public.matchmaking_tickets
   where reservation_id=c.id or id in(select (x->>'ticketId')::uuid from jsonb_array_elements(c.roster_json) x);
 end if;
 if v_dungeon is null or v_tier is null then raise exception 'invalid_live_run';end if;
 return jsonb_build_object('checkId',c.id,'runId',c.run_id,'dungeonId',v_dungeon,'tier',v_tier,
   'roster',c.roster_json,'frozenRoster',c.frozen_roster_json);
end $$;

-- Fix the already-committed check race: return the *stored* winning run,
-- never a losing caller's speculative client projection.
create or replace function public.start_online_live_server_v1(
 p_account_id uuid,p_check_id uuid,p_run_id uuid,p_seed_hash text,p_private_state jsonb,p_client_projection jsonb,p_members jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;r jsonb;m jsonb;v_index integer:=0;v_epoch integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('online-live-runtime',0));
 select * into c from public.coop_ready_checks where id=p_check_id for update;
 if not found or c.status<>'committed' then raise exception 'ready_check_not_committed';end if;
 if not exists(select 1 from jsonb_array_elements(c.roster_json) x where x->>'accountId'=p_account_id::text) then raise exception 'not_ready_member';end if;
 if c.run_id is not null then return (select projection_json from public.coop_run_client_snapshots where run_id=c.run_id);end if;
 if p_run_id is null or jsonb_array_length(p_members)<>4 or p_private_state->'run'->>'id' is distinct from p_run_id::text then raise exception 'invalid_live_run';end if;
 if p_members->0->'snapshot' is null then raise exception 'invalid_frozen_roster';end if;
 -- A rematch can start only while the four frozen members still belong to
 -- their original roster and have not joined another active expedition.
 if exists(select 1 from public.coop_live_rematch_sessions where ready_check_id=p_check_id) then
  if exists(select 1 from jsonb_array_elements(p_members) m
    left join public.online_game_states g on g.account_id=(m->'snapshot'->>'accountId')::uuid
   where g.account_id is null or g.character_id is distinct from (m->'snapshot'->>'characterId')::uuid
    or g.revision is distinct from (m->'snapshot'->>'revision')::bigint)
  then raise exception 'rematch_loadout_changed';end if;
  if exists(select 1 from public.coop_run_access_memberships a join public.expedition_runs e on e.id=a.run_id
    where a.account_id in(select (m->'snapshot'->>'accountId')::uuid from jsonb_array_elements(p_members) m)
      and a.active and e.status='active' and e.id not in(
       select source_run_id from public.coop_live_rematch_sessions where ready_check_id=p_check_id))
  then raise exception 'account_already_participating';end if;
 end if;
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

revoke all on function public.online_live_rematch_sources_server_v1(uuid,uuid),
 public.online_live_rematch_state_server_v1(uuid,uuid),
 public.online_live_rematch_respond_server_v1(uuid,uuid,text,boolean,uuid,jsonb),
 public.online_live_committed_sources_server_v1(uuid,uuid),
 public.start_online_live_server_v1(uuid,uuid,uuid,text,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.online_live_rematch_sources_server_v1(uuid,uuid),
 public.online_live_rematch_state_server_v1(uuid,uuid),
 public.online_live_rematch_respond_server_v1(uuid,uuid,text,boolean,uuid,jsonb),
 public.online_live_committed_sources_server_v1(uuid,uuid),
 public.start_online_live_server_v1(uuid,uuid,uuid,text,jsonb,jsonb,jsonb) to service_role;
commit;
