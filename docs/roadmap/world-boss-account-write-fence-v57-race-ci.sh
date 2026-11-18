#!/usr/bin/env bash
# World Boss V57 — TWO-INDEPENDENT-CONNECTION erasure/write race.
# ONLY the disposable GitHub Actions PostgreSQL service. NO Supabase DSN.
# Requires the private V57 table/triggers from the preceding CI step.
set -euo pipefail
: "${PGHOST:?must target disposable CI Postgres}"
: "${PGDATABASE:?must target disposable CI Postgres}"
: "${PGUSER:?must target disposable CI Postgres}"
if [[ "$PGDATABASE" != 'postgres' || "$PGUSER" != 'postgres' ||
      ( "$PGHOST" != '127.0.0.1' && "$PGHOST" != 'localhost' ) ]]; then
  echo 'WB57_REQUIRES_LOCAL_DISPOSABLE_POSTGRES' >&2
  exit 1
fi
account_writer='10000000-0000-4000-8000-000000000159'
account_erasure='10000000-0000-4000-8000-000000000160'
tmpdir="$(mktemp -d)"
cleanup(){
  # No individual player IDs are read from an external source. The synthetic
  # committed fixtures are dropped at completion (or on an error).
  psql -X -v ON_ERROR_STOP=1 -q <<SQL >/dev/null 2>&1 || true
BEGIN;
DELETE FROM private.world_boss_wallet_v28
 WHERE account_id IN ('$account_writer'::uuid,'$account_erasure'::uuid);
DELETE FROM auth.users
 WHERE id IN ('$account_writer'::uuid,'$account_erasure'::uuid);
DELETE FROM private.world_boss_erasure_fences_v57
 WHERE account_id IN ('$account_writer'::uuid,'$account_erasure'::uuid);
COMMIT;
SQL
  rm -rf "$tmpdir"
}
trap cleanup EXIT
psql -X -v ON_ERROR_STOP=1 -q -c "
INSERT INTO auth.users(id)
VALUES('$account_writer'::uuid),('$account_erasure'::uuid);
"

# Race A: legitimate committed personal write BEFORE privacy fence.
# The deletion/fence transaction must wait for the writer's advisory lock.
psql -X -v ON_ERROR_STOP=1 -q <<SQL >"$tmpdir/write_a.log" 2>&1 &
BEGIN;
INSERT INTO private.world_boss_wallet_v28(account_id,balance,revision)
VALUES('$account_writer'::uuid,5,1);
\! touch $tmpdir/writer_holds_lock
SELECT pg_sleep(2);
COMMIT;
SQL
writer_pid=$!
for _ in $(seq 1 100); do
 [[ -e "$tmpdir/writer_holds_lock" ]] && break
 sleep .05
done
if [[ ! -e "$tmpdir/writer_holds_lock" ]]; then
  wait "$writer_pid" || true
  echo 'WB57_WRITER_LOCK_MARKER_MISSING' >&2
  exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q -c "
INSERT INTO private.world_boss_erasure_fences_v57(account_id)
VALUES('$account_writer'::uuid);" >"$tmpdir/fence_a.log" 2>&1 &
fence_pid=$!
wait "$writer_pid"
wait "$fence_pid"
summary="$(psql -X -v ON_ERROR_STOP=1 -At -c "
SELECT (SELECT count(*) FROM private.world_boss_wallet_v28
        WHERE account_id='$account_writer'::uuid)::text || '|' ||
       (SELECT count(*) FROM private.world_boss_erasure_fences_v57
        WHERE account_id='$account_writer'::uuid)::text;")"
if [[ "$summary" != '1|1' ]]; then
 echo "WB57_WRITER_THEN_ERASURE_RACE_NOT_SERIALIZED: $summary" >&2
 exit 1
fi

# Race B: erasure is fenced but not yet COMMITTED. A new personal write
# must WAIT for that transaction, then be denied on the committed fence.
psql -X -v ON_ERROR_STOP=1 -q <<SQL >"$tmpdir/fence_b.log" 2>&1 &
BEGIN;
INSERT INTO private.world_boss_erasure_fences_v57(account_id)
VALUES('$account_erasure'::uuid);
\! touch $tmpdir/fence_holds_lock
SELECT pg_sleep(2);
COMMIT;
SQL
eraser_pid=$!
for _ in $(seq 1 100); do
 [[ -e "$tmpdir/fence_holds_lock" ]] && break
 sleep .05
done
if [[ ! -e "$tmpdir/fence_holds_lock" ]]; then
  wait "$eraser_pid" || true
  echo 'WB57_ERASURE_LOCK_MARKER_MISSING' >&2
  exit 1
fi
if psql -X -v ON_ERROR_STOP=1 -q -c "
INSERT INTO private.world_boss_wallet_v28(account_id,balance,revision)
VALUES('$account_erasure'::uuid,5,1);" >"$tmpdir/write_b.log" 2>&1; then
 wait "$eraser_pid" || true
 echo 'WB57_NEW_PERSONAL_WRITE_SLIPPED_DURING_ERASURE' >&2
 exit 1
fi
wait "$eraser_pid"
if ! grep -q 'WB57_ACCOUNT_ERASURE_FENCED' "$tmpdir/write_b.log"; then
 echo 'WB57_WRITER_ERROR_NOT_FENCE_DENIAL' >&2
 cat "$tmpdir/write_b.log" >&2
 exit 1
fi
remaining="$(psql -X -v ON_ERROR_STOP=1 -At -c "
SELECT count(*) FROM private.world_boss_wallet_v28
WHERE account_id='$account_erasure'::uuid;")"
if [[ "$remaining" != '0' ]]; then
 echo "WB57_POST_FENCE_PERSONAL_WALLET_CREATED: $remaining" >&2
 exit 1
fi
echo 'WORLD_BOSS_V57_TWO_CONNECTION_WRITE_ERASURE_SERIALIZATION=PASS'
