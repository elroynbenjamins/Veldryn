#!/usr/bin/env bash
# Destructive ONLY to a disposable PostgreSQL database dedicated to CI.
# This must never point to staging or production: it creates public fixture tables.
set -euo pipefail
: "${COMBAT_V2_DISPOSABLE_DB:?Must explicitly opt in to a disposable database}"
[[ "${COMBAT_V2_DISPOSABLE_DB}" == "YES_TEST_DATABASE" ]] || { echo 'Disposable DB opt-in required' >&2; exit 1; }
[[ "${PGDATABASE:-}" == "combat_v2_test" ]] || { echo 'Refuse to run outside combat_v2_test database' >&2; exit 1; }
cd "$(dirname "$0")/../.."
run() { psql -X -v ON_ERROR_STOP=1 -qAt "$@"; }
run <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create table public.characters(
 id uuid primary key,account_id uuid not null,class_id text not null,
 level int not null, updated_at timestamptz not null
);
create table public.online_game_states(
 account_id uuid primary key,revision bigint not null,state jsonb not null
);
insert into public.characters(id,account_id,class_id,level,updated_at)
values('00000000-0000-4000-a000-000000000022',
 '00000000-0000-4000-a000-000000000011','Ironwarden',25,'2026-11-19 00:00:00+00');
insert into public.online_game_states(account_id,revision,state)
values('00000000-0000-4000-a000-000000000011',12,'{}');
SQL
run -f backend/supabase/migrations/20261118124500_combat_v2_build_persistence_hidden_v1.sql
run -f backend/supabase/migrations/20261118213000_combat_v2_solo_snapshot_hidden_v1.sql
run <<'SQL'
insert into private.combat_v2_character_builds_v1(character_id,account_id,revision,state)
values('00000000-0000-4000-a000-000000000022',
 '00000000-0000-4000-a000-000000000011',4,'{}');
-- This is a deliberately minimal SQL-level payload fixture. Full schema and
-- source provenance are independently checked by TypeScript replay tests.
create function public.qa_combat_v2_reserve(
 p_id text,p_digest text default repeat('a',64),
 p_game bigint default 12,p_build bigint default 4
) returns jsonb language sql as $body$
select public.combat_v2_solo_reserve_server_v1(
 '00000000-0000-4000-a000-000000000011'::uuid,
 '00000000-0000-4000-a000-000000000022'::uuid,p_id,
 p_game,p_build,
 (select md5(c.class_id||':'||c.level::text||':'||c.updated_at::text)
  from public.characters c
  where c.id='00000000-0000-4000-a000-000000000022'::uuid),
 p_digest,
 jsonb_build_object(
 'schemaVersion',1,'accountId','00000000-0000-4000-a000-000000000011',
 'characterId','00000000-0000-4000-a000-000000000022',
 'encounterId',p_id,'gameRevision',p_game,'buildRevision',p_build,
 'characterFingerprint',
 (select md5(c.class_id||':'||c.level::text||':'||c.updated_at::text)
 from public.characters c where c.id='00000000-0000-4000-a000-000000000022'::uuid),
 'snapshotDigest',p_digest,'actorId','QA_HERO',
 'combatInput',jsonb_build_object(
 'seed','qa-seed','players',jsonb_build_array(jsonb_build_object(
 'id','QA_HERO','team','players')),
 'enemies',jsonb_build_array(jsonb_build_object('id','QA_ENEMY'))),
 'baseEnemies',jsonb_build_array(jsonb_build_object('id','QA_ENEMY')),
 'equipmentEvidence',jsonb_build_array(),
 'preparedKit',jsonb_build_object(
 'source','server-persisted-v2','mode','solo','revision',1,
 'seed','qa-seed','encounterId',p_id)
));
$body$;
SQL
permissions="$(run -c "select
 has_function_privilege('anon','public.combat_v2_solo_reserve_server_v1(uuid,uuid,text,bigint,bigint,text,text,jsonb)','EXECUTE')::int,
 has_function_privilege('authenticated','public.combat_v2_solo_reserve_server_v1(uuid,uuid,text,bigint,bigint,text,text,jsonb)','EXECUTE')::int,
 has_function_privilege('service_role','public.combat_v2_solo_reserve_server_v1(uuid,uuid,text,bigint,bigint,text,text,jsonb)','EXECUTE')::int,
 has_table_privilege('anon','private.combat_v2_solo_snapshots_v1','SELECT')::int,
 has_table_privilege('authenticated','private.combat_v2_solo_snapshots_v1','INSERT')::int;")"
[[ "$permissions" == "0|0|1|0|0" ]] || { echo "Incorrect grants: $permissions" >&2; exit 1; }
run -c "select public.qa_combat_v2_reserve('QA_ONE');" >/dev/null

# Two simultaneous sessions must contend on the same account/character row.
# All 16 responses must be byte-identical JSONB and create only one row.
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
pids=()
for n in $(seq 1 16); do
 (run -c "select public.qa_combat_v2_reserve('QA_RACE');" >"$tmpdir/$n.out" 2>"$tmpdir/$n.err") &
 pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
for n in $(seq 2 16); do cmp "$tmpdir/1.out" "$tmpdir/$n.out"; done
rows="$(run -c "select count(*) from private.combat_v2_solo_snapshots_v1 where encounter_id='QA_RACE';")"
[[ "$rows" == "1" ]] || { echo "Concurrent reservation produced $rows rows" >&2; exit 1; }

# Existing retry must return original bytes even after both revisions change.
run -c "update public.online_game_states set revision=99;"
run -c "update private.combat_v2_character_builds_v1 set revision=55;"
run -c "select public.qa_combat_v2_reserve('QA_RACE');" >"$tmpdir/retry.out"
cmp "$tmpdir/1.out" "$tmpdir/retry.out"
failed() {
 local query="$1"
 if run -c "$query" >"$tmpdir/failure.out" 2>"$tmpdir/failure.err"; then
  echo "Expected SQL rejection did not occur: $query" >&2; exit 1
 fi
}
failed "select public.qa_combat_v2_reserve('QA_NEW_STALE');"
failed "select public.qa_combat_v2_reserve('QA_RACE', repeat('f',64));"
failed "select public.combat_v2_solo_read_server_v1(
 '00000000-0000-4000-a000-000000000099',
 '00000000-0000-4000-a000-000000000022','QA_RACE');"
failed "select public.combat_v2_solo_reserve_server_v1(
 '00000000-0000-4000-a000-000000000099',
 '00000000-0000-4000-a000-000000000022','QA_NEW_OWNER',12,4,
 repeat('a',32),repeat('a',64),'{}');"

# Roll back an unacknowledged first write and demonstrate zero durable rows.
run -c "update public.online_game_states set revision=12;"
run -c "update private.combat_v2_character_builds_v1 set revision=4;"
run <<'SQL' >/dev/null
begin;
select public.qa_combat_v2_reserve('QA_ROLLBACK');
rollback;
SQL
none="$(run -c "select count(*) from private.combat_v2_solo_snapshots_v1 where encounter_id='QA_ROLLBACK';")"
[[ "$none" == "0" ]] || { echo "Rollback leaked snapshot" >&2; exit 1; }
run -c "select public.qa_combat_v2_reserve('QA_ROLLBACK');" >/dev/null
[[ "$(run -c "select count(*) from private.combat_v2_solo_snapshots_v1 where encounter_id='QA_ROLLBACK';")" == "1" ]]
echo 'PASS: PG17 actual hidden SQL, 16 sessions/one snapshot, replay after revision changes, ownership/ACL, stale CAS and rollback'
