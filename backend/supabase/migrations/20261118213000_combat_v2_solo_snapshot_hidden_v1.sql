-- HIDDEN Combat 2.0 solo-only encounter snapshots. No live route uses these.
-- Staging migration ONLY after review; do not run in production before 2.0 approval.
-- The store is prepare/read-only: no combat, currency, loot, rewards, progress,
-- settlement or completion RPC is created by this migration.
begin;

create schema if not exists private;
create table if not exists private.combat_v2_solo_snapshots_v1 (
  encounter_id text primary key check (
    length(encounter_id) between 1 and 128
    and encounter_id ~ '^[A-Za-z0-9:_-]+$'
  ),
  account_id uuid not null,
  character_id uuid not null references public.characters(id) on delete cascade,
  snapshot_digest text not null check (snapshot_digest ~ '^[0-9a-f]{64}$'),
  game_revision bigint not null check (game_revision >= 0),
  build_revision bigint not null check (build_revision >= 0),
  schema_version integer not null default 1 check (schema_version = 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  prepared_at timestamptz not null default now()
);
create index if not exists combat_v2_solo_snapshots_v1_character_idx
  on private.combat_v2_solo_snapshots_v1(character_id,prepared_at desc);

alter table private.combat_v2_solo_snapshots_v1 enable row level security;
revoke all on private.combat_v2_solo_snapshots_v1 from public,anon,authenticated;
-- No row policies, grants or new service endpoints. The RPCs below are service-role only.

create or replace function public.combat_v2_solo_read_server_v1(
  p_account_id uuid,p_character_id uuid,p_encounter_id text
) returns jsonb
language plpgsql security definer
set search_path = ''
as $function$
declare
  v_payload jsonb;
begin
  if p_account_id is null or p_character_id is null
     or p_encounter_id is null or length(p_encounter_id) not between 1 and 128
     or p_encounter_id !~ '^[A-Za-z0-9:_-]+$' then
    raise exception 'combat_v2_invalid_encounter_scope' using errcode='P0001';
  end if;

  perform 1 from public.characters c
   where c.id=p_character_id and c.account_id=p_account_id;
  if not found then
    raise exception 'combat_v2_character_mismatch' using errcode='P0001';
  end if;

  select s.payload into v_payload from private.combat_v2_solo_snapshots_v1 s
   where s.encounter_id=p_encounter_id
     and s.character_id=p_character_id and s.account_id=p_account_id;
  return v_payload; -- null means no prepared encounter, not a request to generate one
end
$function$;

create or replace function public.combat_v2_solo_reserve_server_v1(
  p_account_id uuid,p_character_id uuid,p_encounter_id text,
  p_expected_game_revision bigint,p_expected_build_revision bigint,
  p_character_fingerprint text,p_snapshot_digest text,p_payload jsonb
) returns jsonb
language plpgsql security definer
set search_path = ''
as $function$
declare
  v_class text;
  v_level integer;
  v_character_updated timestamptz;
  v_online_revision bigint;
  v_build_revision bigint;
  v_existing private.combat_v2_solo_snapshots_v1%rowtype;
begin
  if p_account_id is null or p_character_id is null
     or p_encounter_id is null or length(p_encounter_id) not between 1 and 128
     or p_encounter_id !~ '^[A-Za-z0-9:_-]+$'
     or p_expected_game_revision < 0 or p_expected_build_revision < 0
     or p_character_fingerprint is null or length(p_character_fingerprint) <> 32
     or p_snapshot_digest is null or p_snapshot_digest !~ '^[0-9a-f]{64}$'
     or p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or length(p_payload::text) > 1000000 then
    raise exception 'combat_v2_invalid_encounter_reservation' using errcode='P0001';
  end if;

  -- Public JSON is not a trust source. Only the privileged server creates
  -- p_payload, and a matching, authenticated ownership/CAS check is required.
  if p_payload->>'schemaVersion' is distinct from '1'
    or p_payload->>'encounterId' is distinct from p_encounter_id
    or p_payload->>'accountId' is distinct from p_account_id::text
    or p_payload->>'characterId' is distinct from p_character_id::text
    or p_payload->>'gameRevision' is distinct from p_expected_game_revision::text
    or p_payload->>'buildRevision' is distinct from p_expected_build_revision::text
    or p_payload->>'characterFingerprint' is distinct from p_character_fingerprint
    or p_payload->>'snapshotDigest' is distinct from p_snapshot_digest
    or jsonb_typeof(p_payload->'combatInput') <> 'object'
    or jsonb_typeof(p_payload#>'{combatInput,players}') <> 'array'
    or jsonb_array_length(p_payload#>'{combatInput,players}') <> 1
    or jsonb_typeof(p_payload#>'{combatInput,enemies}') <> 'array'
    or jsonb_array_length(p_payload#>'{combatInput,enemies}') not between 1 and 4
    or jsonb_typeof(p_payload->'baseEnemies') <> 'array'
    or jsonb_typeof(p_payload->'preparedKit') <> 'object'
    or p_payload#>>'{preparedKit,source}' is distinct from 'server-persisted-v2'
    or p_payload#>>'{preparedKit,mode}' is distinct from 'solo'
    or p_payload#>>'{preparedKit,revision}' is distinct from '1'
    or p_payload#>>'{preparedKit,encounterId}' is distinct from p_encounter_id
    or p_payload#>>'{combatInput,seed}' is distinct from p_payload#>>'{preparedKit,seed}'
    or p_payload#>>'{combatInput,players,0,id}' is distinct from p_payload->>'actorId'
    or p_payload#>>'{combatInput,players,0,team}' is distinct from 'players' then
    raise exception 'combat_v2_invalid_encounter_payload' using errcode='P0001';
  end if;

  -- Same locking order as hidden skill-build CAS:
  -- character -> online game state -> skill build -> encounter.
  select c.class_id,c.level,c.updated_at
    into v_class,v_level,v_character_updated
    from public.characters c
    where c.id=p_character_id and c.account_id=p_account_id
    for update;
  if not found then
    raise exception 'combat_v2_character_mismatch' using errcode='P0001';
  end if;

  -- First-write-wins. Existing identical retries return the ORIGINAL
  -- serialized snapshot even after level/gear/build revision changes.
  -- An encounter ID is never overwritten, rerolled, or used by another owner.
  select * into v_existing from private.combat_v2_solo_snapshots_v1 s
    where s.encounter_id=p_encounter_id for update;
  if found then
    if v_existing.account_id is distinct from p_account_id
       or v_existing.character_id is distinct from p_character_id
       or v_existing.snapshot_digest is distinct from p_snapshot_digest then
      raise exception 'combat_v2_encounter_id_conflict' using errcode='P0001';
    end if;
    return v_existing.payload;
  end if;

  if md5(v_class||':'||v_level::text||':'||v_character_updated::text)
       is distinct from p_character_fingerprint then
    raise exception 'combat_v2_stale_character' using errcode='P0001';
  end if;

  select g.revision into v_online_revision from public.online_game_states g
    where g.account_id=p_account_id for update;
  if not found or v_online_revision is distinct from p_expected_game_revision then
    raise exception 'combat_v2_stale_game_revision' using errcode='P0001';
  end if;

  select b.revision into v_build_revision
    from private.combat_v2_character_builds_v1 b
    where b.character_id=p_character_id and b.account_id=p_account_id
    for update;
  if not found or v_build_revision is distinct from p_expected_build_revision then
    raise exception 'combat_v2_stale_build_revision' using errcode='P0001';
  end if;

  insert into private.combat_v2_solo_snapshots_v1(
    encounter_id,account_id,character_id,snapshot_digest,game_revision,
    build_revision,schema_version,payload
  ) values (
    p_encounter_id,p_account_id,p_character_id,p_snapshot_digest,
    p_expected_game_revision,p_expected_build_revision,1,p_payload
  );
  return p_payload;
end
$function$;

revoke all on function public.combat_v2_solo_read_server_v1(uuid,uuid,text)
  from public,anon,authenticated;
revoke all on function public.combat_v2_solo_reserve_server_v1(
  uuid,uuid,text,bigint,bigint,text,text,jsonb
) from public,anon,authenticated;
grant execute on function public.combat_v2_solo_read_server_v1(uuid,uuid,text)
  to service_role;
grant execute on function public.combat_v2_solo_reserve_server_v1(
  uuid,uuid,text,bigint,bigint,text,text,jsonb
) to service_role;

comment on table private.combat_v2_solo_snapshots_v1 is
  'Hidden V2 solo encounter snapshots, immutable first-write-wins, not a combat or reward service.';
commit;
