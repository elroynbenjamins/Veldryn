#!/usr/bin/env bash
# V28 disposable PostgreSQL concurrency audit. NEVER target Supabase.
# CI uses PGHOST/PGDATABASE/PGUSER/PGPASSWORD pointing to postgres:16
# disposable service with V17/V18/V27/V28 already installed.
set -euo pipefail
event='30000000-0000-4000-8000-000000000029'
account='10000000-0000-4000-8000-000000000001'
character='20000000-0000-4000-8000-000000000001'
psql -X -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
SELECT '30000000-0000-4000-8000-000000000029',
 'hollowroot','active',start_at,start_at+interval '7 days',
 'wb28-parallel-fixture',1000000,1000000
FROM (SELECT clock_timestamp()-interval '1 hour' start_at) t;
INSERT INTO private.world_boss_war_camps_v27(
 event_id,fort_tier1,fort_tier2,field_tier1,field_tier2,
 siege_tier1,siege_tier2)
VALUES('30000000-0000-4000-8000-000000000029',1,2,1,2,1,2);
INSERT INTO private.world_boss_war_recipes_v27(
 event_id,recipe_id,track,tier,materials)
VALUES('30000000-0000-4000-8000-000000000029',
 'T1_FORTIFICATIONS','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":70},
 {"itemId":"COPPER_INGOT","quantity":12}]'::jsonb);
INSERT INTO private.world_boss_war_donations_v27(
 event_id,account_id,request_id,character_id,recipe_id,
 track,ordinal,paid_materials,revision)
VALUES(
 '30000000-0000-4000-8000-000000000029',
 '10000000-0000-4000-8000-000000000001',
 'WB28_PARALLEL_DONATION',
 '20000000-0000-4000-8000-000000000001',
 'T1_FORTIFICATIONS','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":70},
 {"itemId":"COPPER_INGOT","quantity":12}]'::jsonb,1);
COMMIT;
SQL
tmp_a="$(mktemp)"
tmp_b="$(mktemp)"
trap 'rm -f "$tmp_a" "$tmp_b"' EXIT
# Separate real connections, distinct idempotency keys but SAME reward
# source. Only one must credit; the other must receive a zero-delta receipt.
psql -X -v ON_ERROR_STOP=1 -At -c \
 "SELECT private.world_boss_v28_claim('$event'::uuid,'$account'::uuid,'WB28_CONCURRENT_REQUEST_A')" >"$tmp_a" &
pid_a=$!
psql -X -v ON_ERROR_STOP=1 -At -c \
 "SELECT private.world_boss_v28_claim('$event'::uuid,'$account'::uuid,'WB28_CONCURRENT_REQUEST_B')" >"$tmp_b" &
pid_b=$!
wait "$pid_a"
wait "$pid_b"
test "$(cat "$tmp_a" | grep -c 'creditedSigils')" = '1'
test "$(cat "$tmp_b" | grep -c 'creditedSigils')" = '1'
summary="$(psql -X -v ON_ERROR_STOP=1 -At -c "
SELECT w.balance || '|' ||
 (SELECT coalesce(sum(amount),0) FROM private.world_boss_reward_ledger_v28
  WHERE event_id='$event'::uuid AND account_id='$account'::uuid) || '|' ||
 (SELECT count(*) FROM private.world_boss_reward_ledger_v28
  WHERE event_id='$event'::uuid AND account_id='$account'::uuid) || '|' ||
 (SELECT count(*) FROM private.world_boss_claim_receipts_v28
  WHERE event_id='$event'::uuid AND account_id='$account'::uuid) || '|' ||
 (SELECT sum(amount) FROM private.world_boss_claim_receipts_v28
  WHERE event_id='$event'::uuid AND account_id='$account'::uuid)
FROM private.world_boss_wallet_v28 w WHERE w.account_id='$account'::uuid
")"
if [[ "$summary" != '5|5|1|2|5' ]]; then
 echo "WB28_CONCURRENT_CLAIM_DUPLICATION: $summary" >&2
 exit 1
fi
psql -X -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
DELETE FROM private.world_boss_claim_receipts_v28 WHERE
 event_id='30000000-0000-4000-8000-000000000029';
DELETE FROM private.world_boss_reward_ledger_v28 WHERE
 event_id='30000000-0000-4000-8000-000000000029';
DELETE FROM private.world_boss_wallet_v28 WHERE
 account_id='10000000-0000-4000-8000-000000000001';
DELETE FROM private.world_boss_war_donations_v27 WHERE
 event_id='30000000-0000-4000-8000-000000000029';
DELETE FROM private.world_boss_war_recipes_v27 WHERE
 event_id='30000000-0000-4000-8000-000000000029';
DELETE FROM private.world_boss_war_camps_v27 WHERE
 event_id='30000000-0000-4000-8000-000000000029';
DELETE FROM private.world_boss_events_v17 WHERE
 id='30000000-0000-4000-8000-000000000029';
COMMIT;
SQL
echo 'WB28_TWO_CONNECTION_WALLET_CLAIM_EXACTLY_ONCE_PASSED'
