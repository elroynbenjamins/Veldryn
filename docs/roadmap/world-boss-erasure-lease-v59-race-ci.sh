#!/usr/bin/env bash
# V59 real two-process privacy lease and crash-takeover regression.
# ONLY local disposable GitHub Actions PostgreSQL; never Supabase.
set -euo pipefail
: "${PGHOST:?require disposable PGHOST}"
: "${PGDATABASE:?require disposable PGDATABASE}"
: "${PGUSER:?require disposable PGUSER}"
if [[ "$PGDATABASE" != postgres || "$PGUSER" != postgres ||
   ( "$PGHOST" != 127.0.0.1 && "$PGHOST" != localhost ) ]]; then
 echo "WB59_RACE_REQUIRES_LOCAL_DISPOSABLE_POSTGRES" >&2
 exit 1
fi
owner='10000000-0000-4000-8000-000000000169'
other='10000000-0000-4000-8000-000000000170'
tmpdir="$(mktemp -d)"
cleanup(){
 psql -X -v ON_ERROR_STOP=1 -q <<SQL >/dev/null 2>&1 || true
BEGIN;
DELETE FROM private.world_boss_erasure_jobs_v59
 WHERE account_id IN ('$owner'::uuid,'$other'::uuid);
DELETE FROM auth.users
 WHERE id IN ('$owner'::uuid,'$other'::uuid);
DELETE FROM private.world_boss_erasure_fences_v57
 WHERE account_id IN ('$owner'::uuid,'$other'::uuid);
COMMIT;
SQL
 rm -rf "$tmpdir"
}
trap cleanup EXIT

psql -X -v ON_ERROR_STOP=1 -q <<SQL
INSERT INTO auth.users(id) VALUES('$owner'::uuid),('$other'::uuid);
INSERT INTO private.world_boss_erasure_fences_v57(account_id)
VALUES('$owner'::uuid),('$other'::uuid);
INSERT INTO private.world_boss_erasure_jobs_v59(account_id,ticket_digest)
VALUES('$owner'::uuid,repeat('a',64)),('$other'::uuid,repeat('b',64));
SQL

# Two independent connections race the SAME account. The first commits a
# lease that remains valid for 90 seconds. Exactly one may win generation 1.
psql -X -v ON_ERROR_STOP=1 -At -c "
SELECT private.world_boss_v59_acquire(
 '$owner'::uuid,repeat('a',64),'WB59_RACE_WORKER_A');" >"$tmpdir/a" 2>&1 &
pid_a=$!
psql -X -v ON_ERROR_STOP=1 -At -c "
SELECT private.world_boss_v59_acquire(
 '$owner'::uuid,repeat('a',64),'WB59_RACE_WORKER_B');" >"$tmpdir/b" 2>&1 &
pid_b=$!
wait "$pid_a"
wait "$pid_b"
winners="$(grep -hEc '"kind" *: *"acquired"' "$tmpdir/a" "$tmpdir/b" | awk '{s+=$1} END{print s+0}')"
busy="$(grep -hEc '"kind" *: *"busy"' "$tmpdir/a" "$tmpdir/b" | awk '{s+=$1} END{print s+0}')"
if [[ "$winners" != 1 || "$busy" != 1 ]]; then
 echo "WB59_TWO_WORKERS_BOTH_ACQUIRED_OR_BLOCKED: winners=$winners busy=$busy" >&2
 cat "$tmpdir/a" "$tmpdir/b" >&2
 exit 1
fi
if grep -Eq '"kind" *: *"acquired"' "$tmpdir/a"; then
 old='WB59_RACE_WORKER_A'
else
 old='WB59_RACE_WORKER_B'
fi
generation="$(psql -X -v ON_ERROR_STOP=1 -At -c "
SELECT lease_generation FROM private.world_boss_erasure_jobs_v59
WHERE account_id='$owner'::uuid;")"
if [[ "$generation" != 1 ]]; then
 echo "WB59_FIRST_RACE_GENERATION_INVALID: $generation" >&2
 exit 1
fi

# Synthetic crash: expire the old lease. The new worker must acquire gen2,
# and a stale release from gen1 must NOT cancel the new worker's lease.
psql -X -v ON_ERROR_STOP=1 -q -c "
UPDATE private.world_boss_erasure_jobs_v59
SET lease_expires_at=clock_timestamp()-interval '1 second'
WHERE account_id='$owner'::uuid;"
new_receipt="$(psql -X -v ON_ERROR_STOP=1 -At -c "
SELECT private.world_boss_v59_acquire(
 '$owner'::uuid,repeat('a',64),'WB59_RACE_RECOVERY');")"
if [[ "$new_receipt" != *'"kind": "acquired"'* ||
      "$new_receipt" != *'"generation": 2'* ]]; then
 echo "WB59_CRASH_TAKEOVER_GENERATION_INVALID: $new_receipt" >&2
 exit 1
fi
if psql -X -v ON_ERROR_STOP=1 -q -c "
SELECT private.world_boss_v59_release(
 '$owner'::uuid,'$old',1);" >"$tmpdir/stale" 2>&1; then
 echo "WB59_STALE_WORKER_RELEASED_NEW_LEASE" >&2
 exit 1
fi
if ! grep -q 'WB59_STALE_OR_MISSING_WORKER_LEASE' "$tmpdir/stale"; then
 echo "WB59_STALE_WORKER_ERROR_NOT_RECOGNIZED" >&2
 cat "$tmpdir/stale" >&2
 exit 1
fi

# The unrelated account is not locked out by the other owner's lease.
other_receipt="$(psql -X -v ON_ERROR_STOP=1 -At -c "
SELECT private.world_boss_v59_acquire(
 '$other'::uuid,repeat('b',64),'WB59_OTHER_WORKER');")"
if [[ "$other_receipt" != *'"kind": "acquired"'* ||
      "$other_receipt" != *'"generation": 1'* ]]; then
 echo "WB59_OTHER_ACCOUNT_UNNECESSARILY_BLOCKED: $other_receipt" >&2
 exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q -c "
SELECT private.world_boss_v59_release(
 '$owner'::uuid,'WB59_RACE_RECOVERY',2);"
if [[ "$(psql -X -v ON_ERROR_STOP=1 -At -c "
SELECT count(*) FROM private.world_boss_erasure_fences_v57
WHERE account_id IN('$owner'::uuid,'$other'::uuid);")" != 2 ]]; then
 echo "WB59_WORKER_RELEASE_REMOVED_ACCOUNT_FENCE" >&2
 exit 1
fi
echo "WORLD_BOSS_V59_TWO_CONNECTION_LEASE_AND_CRASH_RECOVERY=PASS"
