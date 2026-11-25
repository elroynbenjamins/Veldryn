#!/usr/bin/env bash
# DISPOSABLE PG17 ONLY. NEVER run against Supabase projects.
set -Eeuo pipefail
if [[ "$PGHOST" != "127.0.0.1" || "$PGDATABASE" != "progression_v2_disposable" || "$PGUSER" != "postgres" || "$PGPORT" != "5432" ]]; then
  echo "Refusing non-disposable PG17 target" >&2; exit 3
fi
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DRAFT="$ROOT/docs/operations/sql-drafts/20261122_progression_v2_character_xp_REVIEW_ONLY.sql"
psql_test() { psql -X -w -v ON_ERROR_STOP=1 -q "$@"; }
A="11111111-1111-4111-8111-111111111111"
B="22222222-2222-4222-8222-222222222222"
psql_test <<'SQL'
create schema private;
create role anon nologin;
create role authenticated nologin;
create table public.characters (id uuid primary key);
insert into public.characters values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
SQL
psql_test -f "$DRAFT"

# Only a disposable test function. NOT a production API or auth endpoint.
psql_test <<'SQL'
create function private.disposable_award(
 p_character uuid,p_kind text,p_source text,p_fingerprint text,
 p_amount bigint,p_profession text
) returns text language plpgsql security invoker
set search_path = pg_catalog,private as $fn$
declare n integer; stored record;
begin
 insert into private.character_career_awards_v2
  (source_kind,source_id,character_id,overall_character_xp_delta,profession_id,fingerprint)
 values (p_kind,p_source,p_character,p_amount,p_profession,p_fingerprint)
 on conflict do nothing;
 get diagnostics n=row_count;
 if n=0 then
  select character_id,fingerprint,overall_character_xp_delta,profession_id into stored
    from private.character_career_awards_v2
    where source_kind=p_kind and source_id=p_source;
  if not found or stored.character_id is distinct from p_character
    or stored.fingerprint is distinct from p_fingerprint
    or stored.overall_character_xp_delta is distinct from p_amount
    or stored.profession_id is distinct from p_profession then
     raise exception 'receipt_collision';
  end if;
  return 'replayed';
 end if;
 insert into private.character_career_progress_v2(character_id,overall_character_xp)
   values(p_character,p_amount)
 on conflict(character_id) do update
   set overall_character_xp=private.character_career_progress_v2.overall_character_xp+excluded.overall_character_xp;
 return 'applied';
end
$fn$;
do $guard$
begin
 if not (select relrowsecurity from pg_class where oid='private.character_career_progress_v2'::regclass)
   or not (select relrowsecurity from pg_class where oid='private.character_career_awards_v2'::regclass)
   or not (select relrowsecurity from pg_class where oid='private.online_career_reward_sources_v2'::regclass)
 then raise exception 'RLS missing'; end if;
 if has_table_privilege('anon','private.character_career_progress_v2','SELECT')
   or has_table_privilege('authenticated','private.character_career_awards_v2','INSERT')
   or has_table_privilege('authenticated','private.online_career_reward_sources_v2','INSERT')
 then raise exception 'client privilege leak'; end if;
end
$guard$;
SQL

# 16 simultaneous sessions competing for one globally unique source.
OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT
PIDS=""
for ((i=0;i<16;i++)); do
  (psql -X -w -v ON_ERROR_STOP=1 -tAqc \
    "select private.disposable_award('$A'::uuid,'craft_claim','receipt000001','fingerprint-unchanged',120,'smithing');" >>"$OUT") &
  PIDS="$PIDS $!"
done
for pid in $PIDS; do wait "$pid"; done
applied="$(grep -cx 'applied' "$OUT" || true)"
replayed="$(grep -cx 'replayed' "$OUT" || true)"
[[ "$applied" == 1 && "$replayed" == 15 ]] || {
  echo "Bad concurrency result applied=$applied replayed=$replayed" >&2; cat "$OUT"; exit 4
}
psql_test <<'SQL'
do $check$
begin
 if (select overall_character_xp from private.character_career_progress_v2
     where character_id='11111111-1111-4111-8111-111111111111')<>120
 or (select count(*) from private.character_career_awards_v2)<>1
 then raise exception 'duplicate credit'; end if;
end
$check$;
SQL

ERR="$(psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "select private.disposable_award('$A'::uuid,'craft_claim','receipt000001','fingerprint-tampered',120,'smithing');" 2>&1 || true)"
if ! grep -q 'receipt_collision' <<<"$ERR"; then
 echo 'Expected changed-payload collision' >&2; exit 5
fi
ERR="$(psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "select private.disposable_award('$B'::uuid,'craft_claim','receipt000001','fingerprint-unchanged',120,'smithing');" 2>&1 || true)"
if ! grep -q 'receipt_collision' <<<"$ERR"; then
 echo 'Expected cross-character collision' >&2; exit 6
fi

# Explicit rollback must reverse both receipt and bank.
psql_test <<'SQL'
begin;
select private.disposable_award(
 '11111111-1111-4111-8111-111111111111',
 'gathering_claim','receipt000002','fingerprint-new',240,'mining');
rollback;
do $check$
begin
 if exists(select 1 from private.character_career_awards_v2 where source_id='receipt000002')
 or (select overall_character_xp from private.character_career_progress_v2
     where character_id='11111111-1111-4111-8111-111111111111')<>120
 then raise exception 'rollback failed'; end if;
end
$check$;
SQL

# Force failure AFTER receipt insert, and prove transaction rolls it back.
psql_test <<'SQL'
create function private.disposable_reject_high_xp() returns trigger language plpgsql as $body$
begin
 if new.overall_character_xp>500 then raise exception 'disposable_balance_failure'; end if;
 return new;
end
$body$;
create trigger disposable_reject_high_xp before insert or update
 on private.character_career_progress_v2
 for each row execute function private.disposable_reject_high_xp();
SQL
ERR="$(psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "select private.disposable_award('$A'::uuid,'craft_claim','receipt000003','fingerprint-new',500,'smithing');" 2>&1 || true)"
if ! grep -q 'disposable_balance_failure' <<<"$ERR"; then
 echo 'Expected injected balance failure' >&2; exit 7
fi
psql_test <<'SQL'
do $check$
begin
 if exists(select 1 from private.character_career_awards_v2 where source_id='receipt000003')
 or (select overall_character_xp from private.character_career_progress_v2
     where character_id='11111111-1111-4111-8111-111111111111')<>120
 then raise exception 'orphan receipt after failed XP increment'; end if;
end
$check$;
drop trigger disposable_reject_high_xp on private.character_career_progress_v2;
drop function private.disposable_reject_high_xp();
do $check$
begin
 if private.disposable_award(
   '22222222-2222-4222-8222-222222222222',
   'gathering_claim','receipt000004','fingerprint-other',300,'fishing') <> 'applied'
 then raise exception 'secondary character not credited'; end if;
 if (select overall_character_xp from private.character_career_progress_v2
     where character_id='22222222-2222-4222-8222-222222222222')<>300
 then raise exception 'cross-character spillover'; end if;
end
$check$;
SQL
# Verify server-proof uniqueness and DB-owned completion time.
psql_test <<'SQL'
insert into private.online_career_reward_sources_v2(
 source_kind,source_id,account_id,request_id,request_hash,
 segment_index,expected_game_revision,character_id,
 profession_id,claimed_elapsed_seconds,base_effort_seconds,difficulty_basis_points)
values(
 'gathering_claim',repeat('a',64),
 '11111111-1111-4111-8111-111111111111','claim000001',repeat('b',64),
 0,12,'11111111-1111-4111-8111-111111111111',
 'mining',240,240,10000);
do $check$
begin
 if (select count(*) from private.online_career_reward_sources_v2)<>1
 or (select completed_at from private.online_career_reward_sources_v2 limit 1) is null
 then raise exception 'source proof missing or invalid DB completion time'; end if;
end
$check$;
SQL
ERR="$(psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "insert into private.online_career_reward_sources_v2(
 source_kind,source_id,account_id,request_id,request_hash,
 segment_index,expected_game_revision,character_id,
 profession_id,claimed_elapsed_seconds,base_effort_seconds,difficulty_basis_points)
 values ('gathering_claim',repeat('c',64),'11111111-1111-4111-8111-111111111111',
 'claim000001',repeat('d',64),0,12,'22222222-2222-4222-8222-222222222222',
 'fishing',240,240,10000);" 2>&1 || true)"
if ! grep -q 'duplicate key value' <<<"$ERR"; then
 echo 'Expected duplicate (account,request,segment) to fail across alternate character' >&2; exit 8
fi
psql_test <<'SQL'
do $check$
begin
 if (select count(*) from private.online_career_reward_sources_v2)<>1
 then raise exception 'duplicate source proof slipped into ledger'; end if;
end
$check$;
SQL
# A second 16-way race exercises source + award + bank in ONE DB
# transaction, not merely reward uniqueness by itself.
psql_test <<'SQL'
create function private.disposable_atomic_gather_claim()
returns text language plpgsql security invoker
set search_path=pg_catalog,private as $fn$
declare inserted integer; stored record;
begin
 insert into private.online_career_reward_sources_v2(
  source_kind,source_id,account_id,request_id,request_hash,
  segment_index,expected_game_revision,character_id,
  profession_id,claimed_elapsed_seconds,base_effort_seconds,difficulty_basis_points)
 values (
  'gathering_claim',repeat('e',64),
  '22222222-2222-4222-8222-222222222222','claim000002',repeat('f',64),
  0,13,'22222222-2222-4222-8222-222222222222',
  'fishing',240,240,10000)
 on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then
   select character_id,source_id,request_hash,profession_id into stored
   from private.online_career_reward_sources_v2
   where account_id='22222222-2222-4222-8222-222222222222'
     and request_id='claim000002' and segment_index=0;
   if not found or stored.character_id is distinct from
       '22222222-2222-4222-8222-222222222222'::uuid
     or stored.source_id <> repeat('e',64)
     or stored.request_hash <> repeat('f',64)
     or stored.profession_id <> 'fishing'
   then raise exception 'proof_collision'; end if;
 end if;
 return private.disposable_award(
   '22222222-2222-4222-8222-222222222222',
   'gathering_claim',repeat('e',64),'fingerprint-atomic',120,'fishing');
end
$fn$;
SQL
: >"$OUT"
PIDS=""
for ((i=0;i<16;i++)); do
 (psql -X -w -v ON_ERROR_STOP=1 -tAqc \
   "select private.disposable_atomic_gather_claim();" >>"$OUT") &
 PIDS="$PIDS $!"
done
for pid in $PIDS; do wait "$pid"; done
applied="$(grep -cx 'applied' "$OUT" || true)"
replayed="$(grep -cx 'replayed' "$OUT" || true)"
[[ "$applied" == 1 && "$replayed" == 15 ]] || {
 echo "Source+award atomic race failed applied=$applied replayed=$replayed" >&2; cat "$OUT"; exit 9
}
psql_test <<'SQL'
do $check$
begin
 if (select overall_character_xp from private.character_career_progress_v2
   where character_id='22222222-2222-4222-8222-222222222222')<>420
 or (select count(*) from private.online_career_reward_sources_v2)<>2
 or (select count(*) from private.character_career_awards_v2)<>3
 then raise exception 'source proof and XP transaction not exactly once'; end if;
end
$check$;
SQL
# Source-class constraints: combat never credits a crafting profession;
# instant craft cannot claim gathering duration or exceed bulk cap.
psql_test <<'SQL'
insert into private.online_career_reward_sources_v2(
 source_kind,source_id,account_id,request_id,request_hash,
 segment_index,expected_game_revision,character_id,
 profession_id,claimed_elapsed_seconds,base_effort_seconds,difficulty_basis_points)
values
 ('combat_reward',repeat('1',64),'11111111-1111-4111-8111-111111111111',
  'hunt000001',repeat('b',64),0,14,'11111111-1111-4111-8111-111111111111',
  null,0,180,10000),
 ('craft_claim',repeat('2',64),'11111111-1111-4111-8111-111111111111',
  'craft000001',repeat('b',64),0,15,'11111111-1111-4111-8111-111111111111',
  'smithing',0,300,5000);
do $check$
begin
 if (select count(*) from private.online_career_reward_sources_v2)<>4
 then raise exception 'combat/craft source proof missing'; end if;
end
$check$;
SQL
ERR="$(psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "insert into private.online_career_reward_sources_v2(
 source_kind,source_id,account_id,request_id,request_hash,
 segment_index,expected_game_revision,character_id,
 profession_id,claimed_elapsed_seconds,base_effort_seconds,difficulty_basis_points)
 values('combat_reward',repeat('3',64),'11111111-1111-4111-8111-111111111111',
 'hunt000002',repeat('b',64),0,16,'11111111-1111-4111-8111-111111111111',
 'mining',0,300,10000);" 2>&1 || true)"
if ! grep -q 'violates check constraint' <<<"$ERR"; then
 echo 'Combat proof improperly accepted profession XP' >&2; exit 10
fi
ERR="$(psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "insert into private.online_career_reward_sources_v2(
 source_kind,source_id,account_id,request_id,request_hash,
 segment_index,expected_game_revision,character_id,
 profession_id,claimed_elapsed_seconds,base_effort_seconds,difficulty_basis_points)
 values('craft_claim',repeat('4',64),'11111111-1111-4111-8111-111111111111',
 'craft000002',repeat('b',64),0,17,'11111111-1111-4111-8111-111111111111',
 'smithing',0,10801,10000);" 2>&1 || true)"
if ! grep -q 'violates check constraint' <<<"$ERR"; then
 echo 'Instant craft proof improperly accepted unlimited bulk XP' >&2; exit 11
fi
echo "PASS: disposable PG17: 16-way races, combat/craft/gather source constraints, exact-once awards, roles, rollback"
