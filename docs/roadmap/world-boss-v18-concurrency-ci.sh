#!/usr/bin/env bash
# Isolated PostgreSQL 16 in GitHub Actions only. NEVER pass a live DSN.
set -euo pipefail
: "${PGHOST:?set disposable postgres host}"
: "${PGDATABASE:?set disposable postgres database}"
: "${PGUSER:?set disposable postgres user}"
EVENT='30000000-0000-4000-8000-000000000001'
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
psql_q() { psql -X -q -A -t -v ON_ERROR_STOP=1 -c "$1"; }
acct() { printf '10000000-0000-4000-8000-%012d' "$1"; }
char_id() { printf '20000000-0000-4000-8000-%012d' "$1"; }
require_eq() {
  if [[ "$1" != "$2" ]]; then
    echo "WB18 ASSERT expected [$1] got [$2]: $3" >&2
    exit 1
  fi
}
expect_error() {
  local expected="$1" sql="$2" output
  if output="$(psql_q "$sql" 2>&1)"; then
    echo "WB18 ASSERT missing expected error $expected, returned $output" >&2
    exit 1
  fi
  if [[ "$output" != *"$expected"* ]]; then
    echo "WB18 ASSERT wrong error $expected: $output" >&2
    exit 1
  fi
}
reserve_sql() {
  local i="$1" a c req
  a="$(acct "$i")"; c="$(char_id "$i")"; req="$2"
  printf "SELECT private.world_boss_v18_reserve('%s','%s','%s','%s','hold_line',repeat('S',32),repeat('a',64),jsonb_build_object('snapshot',repeat('X',150)),'wb18-combat-v1','WB18_WORKER_%03d')->>'repeated';" \
    "$EVENT" "$a" "$c" "$req" "$i"
}
settle_sql() {
  local i="$1" a req
  a="$(acct "$i")"; req="$2"
  printf "SELECT private.world_boss_v18_settle('%s','%s','%s','WB18_WORKER_%03d',1,repeat('a',64),'wb18-combat-v1',repeat('d',64),'WB18_REPLAY_%03d',4,0)->>'creditedHp';" \
    "$EVENT" "$a" "$req" "$i" "$i"
}
# 16 independent processes race the same event+account+request.
# PostgreSQL event-row locking, not an in-process JS mutex, must serialize.
pids=()
for j in $(seq 1 16); do
  psql_q "$(reserve_sql 1 WB18_SAME_KEY)" >"$tmpdir/race_$j" 2>&1 &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
require_eq 1 "$(grep -l '^false$' "$tmpdir"/race_* | wc -l | tr -d ' ')" "one winner"
require_eq 15 "$(grep -l '^true$' "$tmpdir"/race_* | wc -l | tr -d ' ')" "fifteen canonical retries"
require_eq 1 "$(psql_q "SELECT count(*) FROM private.world_boss_attempts_v17 WHERE event_id='$EVENT' AND account_id='$(acct 1)'")" "one persisted request"

# Lost ACK: a different supplied seed is ignored for an existing key.
require_eq true "$(psql_q "SELECT private.world_boss_v18_reserve('$EVENT','$(acct 1)','$(char_id 1)','WB18_SAME_KEY','hold_line',repeat('Z',32),repeat('b',64),jsonb_build_object('snapshot',repeat('Y',150)),'wb18-combat-v1','WB18_WORKER_001')->>'repeated'")" "retry never rerolls"
expect_error WB18_REQUEST_ID_REUSED "SELECT private.world_boss_v18_reserve('$EVENT','$(acct 1)','$(char_id 1)','WB18_SAME_KEY','break_armor',repeat('S',32),repeat('a',64),jsonb_build_object('snapshot',repeat('X',150)),'wb18-combat-v1','WB18_WORKER_001')"
expect_error WB18_LEASE_HELD "SELECT private.world_boss_v18_checkout('$EVENT','$(acct 1)','WB18_SAME_KEY','WB18_FOREIGN_WORKER')"
require_eq true "$(psql_q "SELECT private.world_boss_v18_heartbeat('$EVENT','$(acct 1)','WB18_SAME_KEY','WB18_WORKER_001',1)->>'renewed'")" "fenced heartbeat"

# Prepare eleven other accounts first. Every battle is now frozen.
for i in $(seq 2 12); do
  require_eq false "$(psql_q "$(reserve_sql "$i" "WB18_ATTACK_$i")")" "new account $i"
done
require_eq 12 "$(psql_q "SELECT count(*) FROM private.world_boss_attempts_v17 WHERE event_id='$EVENT' AND status='reserved'")" "twelve pre-reserved attacks"

# Separate PostgreSQL connections settle the same remaining 1 HP.
pids=()
for i in $(seq 1 12); do
  req="WB18_ATTACK_$i"; [[ "$i" == 1 ]] && req='WB18_SAME_KEY'
  psql_q "$(settle_sql "$i" "$req")" >"$tmpdir/settle_$i" 2>&1 &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
require_eq 1 "$(grep -l '^1$' "$tmpdir"/settle_* | wc -l | tr -d ' ')" "one last-HP winner"
require_eq 11 "$(grep -l '^0$' "$tmpdir"/settle_* | wc -l | tr -d ' ')" "eleven residual credits"
require_eq 0 "$(psql_q "SELECT remaining_hp FROM private.world_boss_events_v17 WHERE id='$EVENT'")" "boss HP never negative"
require_eq 12 "$(psql_q "SELECT revision FROM private.world_boss_events_v17 WHERE id='$EVENT'")" "twelve committed revisions"
require_eq 1 "$(psql_q "SELECT sum(credited_hp) FROM private.world_boss_attempts_v17 WHERE event_id='$EVENT'")" "no duplicate global credit"
require_eq 11 "$(psql_q "SELECT count(*) FROM private.world_boss_attempts_v17 WHERE event_id='$EVENT' AND residual_echo")" "residual echoes"
require_eq 3 "$(psql_q "SELECT count(*) FROM private.world_boss_milestones_v17 WHERE event_id='$EVENT'")" "one milestone for each threshold"
require_eq true "$(psql_q "$(settle_sql 1 WB18_SAME_KEY | sed "s/->>'creditedHp'/->>'repeated'/")")" "completed retry returns same receipt"
require_eq 12 "$(psql_q "SELECT revision FROM private.world_boss_events_v17 WHERE id='$EVENT'")" "retry cannot re-credit"
expect_error WB18_SETTLEMENT_CONFLICT "SELECT private.world_boss_v18_settle('$EVENT','$(acct 1)','WB18_SAME_KEY','WB18_WORKER_001',1,repeat('a',64),'wb18-combat-v1',repeat('f',64),'WB18_REPLAY_001',4,0)"

# Old-generation worker cannot settle after a lease takeover.
psql_q "INSERT INTO private.world_boss_attempts_v17(event_id,account_id,request_id,ordinal,character_id,war_order,phase,rules_version,engine_version,server_seed,squad_digest,frozen_squad,reserved_at,lease_owner,lease_expires_at,hard_expires_at) VALUES('$EVENT','$(acct 13)','WB18_OLD_LEASE',1,'$(char_id 13)','hold_line','armored','wb18-review-fixture','wb18-combat-v1',repeat('S',32),repeat('a',64),jsonb_build_object('snapshot',repeat('X',150)),clock_timestamp()-interval '4 minutes','WB18_OLD_WORKER',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '10 minutes')"
require_eq 2 "$(psql_q "SELECT private.world_boss_v18_checkout('$EVENT','$(acct 13)','WB18_OLD_LEASE','WB18_NEW_WORKER')->>'generation'")" "takeover fences old worker"
expect_error WB18_STALE_WORKER "SELECT private.world_boss_v18_settle('$EVENT','$(acct 13)','WB18_OLD_LEASE','WB18_OLD_WORKER',1,repeat('a',64),'wb18-combat-v1',repeat('d',64),'WB18_REPLAY_EXTRA',2,0)"
require_eq 0 "$(psql_q "SELECT private.world_boss_v18_settle('$EVENT','$(acct 13)','WB18_OLD_LEASE','WB18_NEW_WORKER',2,repeat('a',64),'wb18-combat-v1',repeat('d',64),'WB18_REPLAY_EXTRA',2,0)->>'creditedHp'")" "valid recovered worker, residual HP"

# Hard-expired jobs void without losing their permanent request identity.
psql_q "INSERT INTO private.world_boss_attempts_v17(event_id,account_id,request_id,ordinal,character_id,war_order,phase,rules_version,engine_version,server_seed,squad_digest,frozen_squad,reserved_at,lease_owner,lease_expires_at,hard_expires_at) VALUES('$EVENT','$(acct 14)','WB18_EXPIRED_KEY',1,'$(char_id 14)','hold_line','armored','wb18-review-fixture','wb18-combat-v1',repeat('S',32),repeat('a',64),jsonb_build_object('snapshot',repeat('X',150)),clock_timestamp()-interval '20 minutes','WB18_OLD_WORKER',clock_timestamp()-interval '18 minutes',clock_timestamp()-interval '5 minutes')"
require_eq voided "$(psql_q "SELECT private.world_boss_v18_checkout('$EVENT','$(acct 14)','WB18_EXPIRED_KEY','WB18_NEW_WORKER')->>'status'")" "expired job voided"
require_eq false "$(psql_q "$(reserve_sql 14 WB18_FRESH_KEY)")" "new key uses voided slot"
require_eq 1 "$(psql_q "SELECT ordinal FROM private.world_boss_attempts_v17 WHERE event_id='$EVENT' AND account_id='$(acct 14)' AND request_id='WB18_FRESH_KEY'")" "reusable ordinal"
require_eq true "$(psql_q "$(reserve_sql 14 WB18_EXPIRED_KEY)")" "voided key remains tombstone"

# Same account cannot reserve more than 3 active ordinals.
require_eq false "$(psql_q "$(reserve_sql 1 WB18_SLOT_TWO)")" "second account slot"
require_eq false "$(psql_q "$(reserve_sql 1 WB18_SLOT_THREE)")" "third account slot"
expect_error WB18_ACCOUNT_ATTEMPT_LIMIT "$(reserve_sql 1 WB18_SLOT_FOUR)"

# Event close blocks new requests but old receipts stay readable.
psql_q "UPDATE private.world_boss_events_v17 SET status='closed' WHERE id='$EVENT'"
expect_error WB18_EVENT_CLOSED "$(reserve_sql 2 WB18_NEW_AFTER_CLOSE)"
require_eq true "$(psql_q "$(reserve_sql 1 WB18_SAME_KEY)")" "read prior after close"

require_eq f "$(psql_q "SELECT has_function_privilege('anon','private.world_boss_v18_settle(uuid,uuid,text,text,bigint,text,text,text,text,numeric,numeric)','EXECUTE')")" "no anon settlement"
require_eq f "$(psql_q "SELECT has_function_privilege('authenticated','private.world_boss_v18_reserve(uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)','EXECUTE')")" "no authenticated reserve"
echo 'PASS V18: 16 duplicate request racers, 12 independent last-HP commits, fenced leases, void tombstones, 3-slot cap, private-only functions; NO LIVE DATABASE.'
