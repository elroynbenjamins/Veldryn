-- Authoritative solo regional combat runs for Sunscar gem-eligible encounters.
-- Clients choose only a canonical encounter ID. Player stats, RNG, combat outcome,
-- pity and rewards remain server-owned.
begin;

create table if not exists public.regional_combat_runs_v1(
  id uuid primary key,
  account_id uuid not null references auth.users(id) on delete cascade,
  start_request_id text not null,
  character_id uuid not null references public.characters(id) on delete cascade,
  encounter_id text not null,
  source_id text not null,
  kind text not null check(kind in ('enemy','elite','regional_boss')),
  game_revision bigint not null,
  snapshot_hash text not null,
  player_definition jsonb not null,
  server_seed text not null,
  status text not null default 'started' check(status in ('started','completed','failed','expired')),
  started_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  resolved_at timestamptz,
  result_json jsonb,
  reward_json jsonb,
  unique(account_id,start_request_id),
  check(length(start_request_id) between 8 and 128),
  check(snapshot_hash ~ '^[a-f0-9]{64}$'),
  check(length(server_seed) between 8 and 160)
);
create index if not exists regional_combat_runs_account_status_v1 on public.regional_combat_runs_v1(account_id,status,expires_at desc);
alter table public.regional_combat_runs_v1 enable row level security;
revoke all on public.regional_combat_runs_v1 from public,anon,authenticated;
grant all on public.regional_combat_runs_v1 to service_role;

create or replace function public.load_regional_combat_run_server_v1(
  p_account_id uuid,p_run_id uuid
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_run public.regional_combat_runs_v1%rowtype;
  v_state jsonb;
  v_revision bigint;
begin
  select * into v_run from public.regional_combat_runs_v1 where id=p_run_id;
  if not found then raise exception 'regional_combat_run_not_found';end if;
  if v_run.account_id<>p_account_id then raise exception 'regional_combat_owner_mismatch';end if;
  if v_run.status='started' and v_run.expires_at<=clock_timestamp() then
    update public.regional_combat_runs_v1 set status='expired' where id=v_run.id and status='started';
    v_run.status:='expired';
  end if;
  select state,revision into v_state,v_revision from public.online_game_states where account_id=p_account_id;
  return jsonb_build_object(
    'runId',v_run.id,'status',v_run.status,'encounterId',v_run.encounter_id,'sourceId',v_run.source_id,'kind',v_run.kind,
    'characterId',v_run.character_id,'snapshotHash',v_run.snapshot_hash,'serverSeed',v_run.server_seed,'playerDefinition',v_run.player_definition,
    'expiresAtMs',floor(extract(epoch from v_run.expires_at)*1000),'result',v_run.result_json,'reward',v_run.reward_json,'state',v_state,'version',v_revision
  );
end $$;

create or replace function public.start_regional_combat_run_server_v1(
  p_run_id uuid,p_account_id uuid,p_request_id text,p_expected_revision bigint,p_character_id uuid,
  p_encounter_id text,p_source_id text,p_kind text,p_player_definition jsonb,p_snapshot_hash text,p_server_seed text
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_game public.online_game_states%rowtype;
  v_existing public.regional_combat_runs_v1%rowtype;
  v_min_level integer;
  v_record_type text;
  v_expected_source text;
  v_expected_kind text;
begin
  if p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$' or p_snapshot_hash !~ '^[a-f0-9]{64}$' or length(p_server_seed)<8 then raise exception 'invalid_regional_combat_request';end if;
  perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account_id::text,0));

  select * into v_existing from public.regional_combat_runs_v1 where account_id=p_account_id and start_request_id=p_request_id;
  if found then
    if v_existing.encounter_id<>p_encounter_id or v_existing.character_id<>p_character_id or v_existing.snapshot_hash<>p_snapshot_hash then raise exception 'idempotency_key_conflict';end if;
    return public.load_regional_combat_run_server_v1(p_account_id,v_existing.id);
  end if;

  update public.regional_combat_runs_v1 set status='expired'
  where account_id=p_account_id and status='started' and expires_at<=clock_timestamp();
  if exists(select 1 from public.regional_combat_runs_v1 where account_id=p_account_id and status='started' and expires_at>clock_timestamp()) then raise exception 'regional_combat_already_active';end if;

  select * into v_game from public.online_game_states where account_id=p_account_id for update;
  if not found or v_game.state is null then raise exception 'game_not_loaded';end if;
  if v_game.revision<>p_expected_revision then raise exception 'stale_state';end if;
  if v_game.character_id is distinct from p_character_id then raise exception 'character_identity_changed';end if;
  if v_game.state->>'currentRegionId'<>'SUNSCAR' then raise exception 'regional_combat_wrong_region';end if;

  case p_encounter_id
    when 'SUNMON_002' then v_expected_source:='ZONE_006';v_expected_kind:='enemy';v_min_level:=25;v_record_type:='monster';
    when 'SUNMON_005' then v_expected_source:='ZONE_007';v_expected_kind:='elite';v_min_level:=30;v_record_type:='monster';
    when 'SUNMON_010' then v_expected_source:='ZONE_008';v_expected_kind:='elite';v_min_level:=34;v_record_type:='monster';
    when 'SUNMON_014' then v_expected_source:='ZONE_009';v_expected_kind:='elite';v_min_level:=37;v_record_type:='monster';
    when 'BOSS_002' then v_expected_source:='ZONE_010';v_expected_kind:='regional_boss';v_min_level:=45;v_record_type:='boss';
    else raise exception 'unknown_regional_combat_encounter';
  end case;
  if p_source_id<>v_expected_source or p_kind<>v_expected_kind then raise exception 'regional_combat_source_mismatch';end if;
  if coalesce((v_game.state#>>'{character,level}')::integer,0)<v_min_level then raise exception 'regional_combat_level_requirement';end if;
  if p_player_definition->>'id'<>p_character_id::text or p_player_definition->>'team'<>'players' or jsonb_typeof(p_player_definition->'stats')<>'object' then raise exception 'invalid_regional_player_snapshot';end if;

  if not exists(select 1 from public.region_content_active_v21 where region_id='REG_002') then raise exception 'sunscar_content_not_active';end if;
  if not exists(select 1 from public.active_region_content_records_v21 where region_id='REG_002' and record_type='zone' and record_id=p_source_id) then raise exception 'regional_combat_source_not_active';end if;
  if not exists(select 1 from public.active_region_content_records_v21 where region_id='REG_002' and record_type=v_record_type and record_id=p_encounter_id) then raise exception 'regional_combat_encounter_not_active';end if;

  insert into public.regional_combat_runs_v1(id,account_id,start_request_id,character_id,encounter_id,source_id,kind,game_revision,snapshot_hash,player_definition,server_seed,expires_at)
  values(p_run_id,p_account_id,p_request_id,p_character_id,p_encounter_id,p_source_id,p_kind,p_expected_revision,p_snapshot_hash,p_player_definition,p_server_seed,clock_timestamp()+interval '10 minutes');
  return public.load_regional_combat_run_server_v1(p_account_id,p_run_id);
end $$;

create or replace function public.finish_regional_combat_run_server_v1(
  p_account_id uuid,p_run_id uuid,p_snapshot_hash text,p_result jsonb
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_run public.regional_combat_runs_v1%rowtype;
  v_reward jsonb;
  v_status text;
  v_state jsonb;
  v_revision bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account_id::text,0));
  select * into v_run from public.regional_combat_runs_v1 where id=p_run_id for update;
  if not found then raise exception 'regional_combat_run_not_found';end if;
  if v_run.account_id<>p_account_id then raise exception 'regional_combat_owner_mismatch';end if;
  if v_run.status<>'started' then return public.load_regional_combat_run_server_v1(p_account_id,p_run_id);end if;
  if v_run.expires_at<=clock_timestamp() then
    update public.regional_combat_runs_v1 set status='expired' where id=p_run_id;
    return public.load_regional_combat_run_server_v1(p_account_id,p_run_id);
  end if;
  if v_run.snapshot_hash<>p_snapshot_hash then raise exception 'regional_combat_snapshot_mismatch';end if;
  if jsonb_typeof(p_result)<>'object'
    or coalesce(p_result->>'encounterId','')<>v_run.encounter_id
    or coalesce(p_result->>'sourceId','')<>v_run.source_id
    or coalesce(p_result->>'kind','')<>v_run.kind
    or coalesce(p_result->>'reason','') not in ('victory','wipe','timeout')
    or coalesce((p_result->>'durationMs')::integer,-1) not between 0 and 180000
    or coalesce(p_result->>'eventDigest','') !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_regional_combat_result';end if;

  v_status:=case when coalesce((p_result->>'success')::boolean,false) then 'completed' else 'failed' end;
  if v_status='completed' then
    v_reward:=public.settle_regional_gem_source_server_v1(p_account_id,v_run.source_id,'regional-combat:'||v_run.id::text);
  end if;

  update public.regional_combat_runs_v1
  set status=v_status,resolved_at=clock_timestamp(),result_json=p_result,reward_json=v_reward
  where id=p_run_id;

  select state,revision into v_state,v_revision from public.online_game_states where account_id=p_account_id;
  return jsonb_build_object(
    'runId',v_run.id,'status',v_status,'encounterId',v_run.encounter_id,'sourceId',v_run.source_id,'kind',v_run.kind,
    'characterId',v_run.character_id,'snapshotHash',v_run.snapshot_hash,'expiresAtMs',floor(extract(epoch from v_run.expires_at)*1000),
    'result',p_result,'reward',v_reward,'state',v_state,'version',v_revision
  );
end $$;

revoke all on function public.load_regional_combat_run_server_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.start_regional_combat_run_server_v1(uuid,uuid,text,bigint,uuid,text,text,text,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.finish_regional_combat_run_server_v1(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.load_regional_combat_run_server_v1(uuid,uuid) to service_role;
grant execute on function public.start_regional_combat_run_server_v1(uuid,uuid,text,bigint,uuid,text,text,text,jsonb,text,text) to service_role;
grant execute on function public.finish_regional_combat_run_server_v1(uuid,uuid,text,jsonb) to service_role;

commit;
