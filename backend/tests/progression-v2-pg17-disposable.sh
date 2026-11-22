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
 then raise exception 'RLS missing'; end if;
 if has_table_privilege('anon','private.character_career_progress_v2','SELECT')
   or has_table_privilege('authenticated','private.character_career_awards_v2','INSERT')
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

if ! (psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "select private.disposable_award('$A'::uuid,'craft_claim','receipt000001','fingerprint-tampered',120,'smithing');" 2>&1 | grep -q 'receipt_collision'); then
 echo 'Expected changed-payload collision' >&2; exit 5
fi
if ! (psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "select private.disposable_award('$B'::uuid,'craft_claim','receipt000001','fingerprint-unchanged',120,'smithing');" 2>&1 | grep -q 'receipt_collision'); then
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
if ! (psql -X -w -v ON_ERROR_STOP=1 -tAqc \
 "select private.disposable_award('$A'::uuid,'craft_claim','receipt000003','fingerprint-new',500,'smithing');" 2>&1 | grep -q 'disposable_balance_failure'); then
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
echo "PASS: disposable PG17 unique receipts, role isolation, 16-way concurrent claim, collision rejection and full rollback"
