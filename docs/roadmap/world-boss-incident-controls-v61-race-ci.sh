#!/usr/bin/env bash
# World Boss V61: two-connection emergency-stop lock contract ONLY.
# No gameplay, account, inventory, combat, replay, wallet or reward fixture.
# Disposable CI Postgres only; do not run against Supabase staging/production.
set -euo pipefail
: "${PGHOST:?local CI PostgreSQL only}"
: "${PGDATABASE:?local CI PostgreSQL only}"
: "${PGUSER:?local CI PostgreSQL only}"
if [[ "$PGDATABASE" != 'postgres' || "$PGUSER" != 'postgres' ||
      ( "$PGHOST" != '127.0.0.1' && "$PGHOST" != 'localhost' ) ]]; then
  echo 'WB61_REQUIRES_DISPOSABLE_POSTGRES' >&2
  exit 1
fi

event='a0000000-0000-4000-8000-000000000065'
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# This test database is destroyed with the CI service. The V61 audit is
# deliberately immutable, so never attempt a DELETE to clean up its rows.
psql -X -v ON_ERROR_STOP=1 -q <<SQL
BEGIN;
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
VALUES('$event'::uuid,'hollowroot','draft',
 '2027-02-01T00:00:00Z','2027-02-08T00:00:00Z','v61-race',1000,1000);
INSERT INTO private.world_boss_ops_v61(event_id,changed_by,change_reason)
VALUES('$event'::uuid,'ci-operator','initial closed emergency controls for lock contract');
UPDATE private.world_boss_ops_v61
SET new_raids_open=true,revision=revision+1,changed_by='ci-operator',
 change_reason='open the synthetic gate for transaction serialization checks'
WHERE event_id='$event'::uuid;
COMMIT;
SQL

# Race A: an already-accepted gate read holds FOR SHARE. A subsequent
# emergency pause must wait for that transaction to end, not overtake it.
psql -X -v ON_ERROR_STOP=1 -q <<SQL >"$tmpdir/read_a.log" 2>&1 &
BEGIN;
SELECT private.world_boss_v61_assert_new_action('$event'::uuid,'raid');
\! touch $tmpdir/reader_has_lock
SELECT pg_sleep(2);
COMMIT;
SQL
reader_pid=$!
for _ in $(seq 1 100); do
  [[ -e "$tmpdir/reader_has_lock" ]] && break
  sleep .05
done
if [[ ! -e "$tmpdir/reader_has_lock" ]]; then
  wait "$reader_pid" || true
  echo 'WB61_READ_LOCK_MARKER_MISSING' >&2
  cat "$tmpdir/read_a.log" >&2
  exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q <<SQL >"$tmpdir/pause_a.log" 2>&1 &
UPDATE private.world_boss_ops_v61
SET new_raids_open=false,revision=revision+1,changed_by='ci-operator',
 change_reason='emergency pause must serialize after admitted gate read'
WHERE event_id='$event'::uuid;
SQL
pause_pid=$!
sleep .2
if ! kill -0 "$pause_pid" 2>/dev/null; then
  wait "$reader_pid" || true
  echo 'WB61_OPERATOR_PAUSE_OVERTook_ACTIVE_GATE_READ' >&2
  cat "$tmpdir/pause_a.log" >&2
  exit 1
fi
wait "$reader_pid"
wait "$pause_pid"
if psql -X -v ON_ERROR_STOP=1 -q -c "
SELECT private.world_boss_v61_assert_new_action('$event'::uuid,'raid');" >"$tmpdir/after_pause.log" 2>&1; then
  echo 'WB61_NEW_ACTION_ACCEPTED_AFTER_PAUSE' >&2
  exit 1
fi
grep -q 'WB61_NEW_ACTION_PAUSED' "$tmpdir/after_pause.log"

# Race B: an operator PAUSE is uncommitted and holds the row lock.
# The new action must wait for that pause to COMMIT, then fail closed.
psql -X -v ON_ERROR_STOP=1 -q -c "
UPDATE private.world_boss_ops_v61
SET new_raids_open=true,revision=revision+1,changed_by='ci-operator',
 change_reason='reopen the synthetic gate for second ordering check'
WHERE event_id='$event'::uuid;"
psql -X -v ON_ERROR_STOP=1 -q <<SQL >"$tmpdir/pause_b.log" 2>&1 &
BEGIN;
UPDATE private.world_boss_ops_v61
SET new_raids_open=false,revision=revision+1,changed_by='ci-operator',
 change_reason='second emergency pause must block newly arriving reads'
WHERE event_id='$event'::uuid;
\! touch $tmpdir/pause_has_lock
SELECT pg_sleep(2);
COMMIT;
SQL
pauser_pid=$!
for _ in $(seq 1 100); do
  [[ -e "$tmpdir/pause_has_lock" ]] && break
  sleep .05
done
if [[ ! -e "$tmpdir/pause_has_lock" ]]; then
  wait "$pauser_pid" || true
  echo 'WB61_OPERATOR_LOCK_MARKER_MISSING' >&2
  cat "$tmpdir/pause_b.log" >&2
  exit 1
fi
psql -X -v ON_ERROR_STOP=1 -q -c "
SELECT private.world_boss_v61_assert_new_action('$event'::uuid,'raid');" >"$tmpdir/late_read.log" 2>&1 &
late_pid=$!
sleep .2
if ! kill -0 "$late_pid" 2>/dev/null; then
  wait "$pauser_pid" || true
  echo 'WB61_LATE_READ_DID_NOT_WAIT_FOR_PAUSE' >&2
  cat "$tmpdir/late_read.log" >&2
  exit 1
fi
wait "$pauser_pid"
if wait "$late_pid"; then
  echo 'WB61_NEW_ACTION_BYPASSED_UNCOMMITTED_PAUSE' >&2
  exit 1
fi
grep -q 'WB61_NEW_ACTION_PAUSED' "$tmpdir/late_read.log"

summary="$(psql -X -v ON_ERROR_STOP=1 -At -c "
SELECT revision::text||'|'||new_raids_open::text||'|'||
 (SELECT count(*) FROM private.world_boss_ops_audit_v61 a
  WHERE a.event_id=o.event_id)::text
FROM private.world_boss_ops_v61 o WHERE event_id='$event'::uuid;")"
if [[ "$summary" != '5|false|5' ]]; then
  echo "WB61_EMERGENCY_AUDIT_OR_GATE_STATE_WRONG: $summary" >&2
  exit 1
fi
echo 'WORLD_BOSS_V61_TWO_CONNECTION_EMERGENCY_STOP_SERIALIZATION=PASS'
