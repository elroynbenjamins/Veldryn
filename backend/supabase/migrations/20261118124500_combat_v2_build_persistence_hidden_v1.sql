-- Combat/Skills 2.0: isolated character build persistence (HIDDEN).
-- No changes to live equipment, combat, profile or online_game_states.
-- Apply ONLY to staging after review; release to production with the complete 2.0 launch.
begin;

create schema if not exists private;
create table if not exists private.combat_v2_character_builds_v1 (
  character_id uuid primary key references public.characters(id) on delete cascade,
  account_id uuid not null,
  revision bigint not null default 0 check (revision >= 0),
  schema_version integer not null default 1 check (schema_version = 1),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);
create index if not exists combat_v2_character_builds_v1_account_idx
  on private.combat_v2_character_builds_v1(account_id,character_id);

alter table private.combat_v2_character_builds_v1 enable row level security;
revoke all on private.combat_v2_character_builds_v1 from public,anon,authenticated;
-- No policies, and no direct table grants. Only service-role-only RPC is reachable.
revoke all on schema private from public,anon,authenticated;

-- Privileged authenticated-server projection. This is NOT callable by a
-- client JWT. A verified edge/backend service supplies the account ID; the
-- function then independently verifies character ownership in public.characters.
create or replace function public.combat_v2_build_read_server_v1(
  p_account_id uuid,p_character_id uuid
) returns jsonb
language plpgsql security definer
set search_path = ''
as $function$
declare
  v_class text;
  v_level integer;
  v_character_updated timestamptz;
  v_online_rev bigint;
  v_online_state jsonb;
  v_gear jsonb;
  v_saved jsonb;
begin
  select c.class_id,c.level,c.updated_at
    into v_class,v_level,v_character_updated
  from public.characters c
  where c.id=p_character_id and c.account_id=p_account_id;

  if not found then
    raise exception 'combat_v2_character_mismatch' using errcode='P0001';
  end if;

  select s.revision,s.state into v_online_rev,v_online_state
  from public.online_game_states s
  where s.account_id=p_account_id;
  if not found or v_online_state is null then
    raise exception 'combat_v2_online_state_unavailable' using errcode='P0001';
  end if;

  select coalesce(jsonb_agg(i.value),'[]'::jsonb)
    into v_gear
  from jsonb_array_elements(
    case when jsonb_typeof(v_online_state#>'{account,craftedGearInstances}')='array'
      then v_online_state#>'{account,craftedGearInstances}' else '[]'::jsonb end
  ) as i(value)
  where i.value->>'ownerCharacterId'=p_character_id::text;

  select b.state into v_saved from private.combat_v2_character_builds_v1 b
    where b.account_id=p_account_id and b.character_id=p_character_id;

  return jsonb_build_object(
    'accountId',p_account_id::text,
    'characterId',p_character_id::text,
    'characterClass',v_class,
    'characterLevel',v_level,
    'gameRevision',v_online_rev,
    -- This digest is a CAS token derived entirely from current server state.
    'characterFingerprint',md5(v_class||':'||v_level::text||':'||v_character_updated::text),
    'craftedGearInstances',v_gear,
    'builds',v_saved,
    'activity',v_online_state->'activity'
  );
end
$function$;

-- Commits only a prevalidated server state. This RPC is NOT an item equip
-- operation. Both game revision and authoritative relational class/level
-- fingerprint are checked under locks so a bank transfer, new level,
-- character switch, or concurrent save cannot silently race the write.
create or replace function public.combat_v2_build_cas_server_v1(
  p_account_id uuid,p_character_id uuid,
  p_expected_build_revision bigint,p_expected_game_revision bigint,
  p_expected_character_fingerprint text,p_next_state jsonb
) returns jsonb
language plpgsql security definer
set search_path = ''
as $function$
declare
  v_class text;
  v_level integer;
  v_character_updated timestamptz;
  v_game_rev bigint;
  v_build_rev bigint;
  v_next_revision bigint;
  v_state jsonb;
begin
  if p_expected_build_revision < 0 or p_expected_game_revision < 0
     or p_next_state is null or jsonb_typeof(p_next_state) <> 'object'
     or length(p_next_state::text)>65536 then
    raise exception 'combat_v2_invalid_commit' using errcode='P0001';
  end if;
  if p_next_state->>'characterId' is distinct from p_character_id::text
    or p_next_state->>'schemaVersion' is distinct from '1'
    or jsonb_typeof(p_next_state->'presets') <> 'array'
    or jsonb_array_length(p_next_state->'presets') <> 2 then
    raise exception 'combat_v2_invalid_commit_shape' using errcode='P0001';
  end if;
  v_next_revision:=p_expected_build_revision+1;
  if p_next_state->>'revision' is distinct from v_next_revision::text then
    raise exception 'combat_v2_invalid_commit_revision' using errcode='P0001';
  end if;

  -- Lock in stable order: character -> online account state -> build state.
  select c.class_id,c.level,c.updated_at
    into v_class,v_level,v_character_updated
  from public.characters c
  where c.id=p_character_id and c.account_id=p_account_id
  for update;
  if not found then
    raise exception 'combat_v2_character_mismatch' using errcode='P0001';
  end if;
  if md5(v_class||':'||v_level::text||':'||v_character_updated::text)
      is distinct from p_expected_character_fingerprint then
    raise exception 'combat_v2_stale_game_revision' using errcode='P0001';
  end if;

  select g.revision into v_game_rev
    from public.online_game_states g
    where g.account_id=p_account_id
    for update;
  if not found or v_game_rev is distinct from p_expected_game_revision then
    raise exception 'combat_v2_stale_game_revision' using errcode='P0001';
  end if;

  -- Atomic UPSERT + row lock ensures two simultaneous first saves cannot
  -- both succeed with expected revision zero.
  insert into private.combat_v2_character_builds_v1
    (character_id,account_id,revision,schema_version,state)
  values (
    p_character_id,p_account_id,0,1,
    jsonb_build_object(
      'characterId',p_character_id::text,
      'schemaVersion',1,'revision',0,'selectedSlot',null,
      'presets',jsonb_build_array(null,null)
    )
  ) on conflict (character_id) do nothing;

  select b.revision,b.state into v_build_rev,v_state
  from private.combat_v2_character_builds_v1 b
  where b.character_id=p_character_id and b.account_id=p_account_id
  for update;
  if not found then
    raise exception 'combat_v2_character_mismatch' using errcode='P0001';
  end if;
  if v_build_rev is distinct from p_expected_build_revision then
    raise exception 'combat_v2_stale_build_revision' using errcode='P0001';
  end if;

  update private.combat_v2_character_builds_v1
    set revision=v_next_revision,state=p_next_state,updated_at=now()
    where character_id=p_character_id and account_id=p_account_id;
  return p_next_state;
end
$function$;

revoke all on function public.combat_v2_build_read_server_v1(uuid,uuid)
  from public,anon,authenticated;
revoke all on function public.combat_v2_build_cas_server_v1(uuid,uuid,bigint,bigint,text,jsonb)
  from public,anon,authenticated;

grant execute on function public.combat_v2_build_read_server_v1(uuid,uuid)
  to service_role;
grant execute on function public.combat_v2_build_cas_server_v1(uuid,uuid,bigint,bigint,text,jsonb)
  to service_role;

comment on table private.combat_v2_character_builds_v1 is
  'Hidden versioned character skill-build presets. Not active combat or equipment.';
commit;
