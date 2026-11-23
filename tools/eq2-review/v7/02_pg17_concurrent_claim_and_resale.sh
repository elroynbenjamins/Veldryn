#!/usr/bin/env bash
# Veldryn EQ2 PG17 V7. DISPOSABLE synthetic concurrent-client simulation ONLY.
# Read/test only vs eq2_review_v7; no Supabase staging/production credentials.
set -euo pipefail

db="$(psql -X -v ON_ERROR_STOP=1 -Atc 'SELECT current_database()')"
if [[ "$db" != "eq2_review_v7" ]]; then
  echo "REFUSED: must run in disposable eq2_review_v7, got $db" >&2
  exit 9
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO eq2review_v7.synthetic_trusted_source(
 entitlement_id,run_id,account_id,character_id,dungeon_id,boss_id,
 reward_kind,reward_stage,completed_boss,enhanced_reward,signed_origin_verified,
 claimed_at,boss_result_at
) VALUES (
 '20000000-0000-4000-8000-000000000009',
 '10000000-0000-4000-8000-000000000009',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 'EXP_001','BOSS_EXP_ROOT','participant','final',true,true,true,
 '2026-11-23T21:00:00Z','2026-11-23T20:59:59Z'
);
SQL

# Transaction A holds the source row lock before finalizing an awarded result.
(
  psql -X -v ON_ERROR_STOP=1 -Atc "
    BEGIN;
    SELECT 1 FROM eq2review_v7.synthetic_trusted_source
     WHERE entitlement_id='20000000-0000-4000-8000-000000000009' FOR UPDATE;
    SELECT pg_sleep(1);
    SELECT eq2review_v7.simulate_record_reward(
       '20000000-0000-4000-8000-000000000009',true,
       'EQ2_DUNGEON_ROOTBOUND_T2_HEARTWARD_HELMET',
       '40000000-0000-4000-8000-000000000009','review_policy_a');
    COMMIT;
  " >"$tmp/grant_a.log" 2>&1
) &
grant_a=$!
sleep 0.2

# Transaction B attempts a contradictory no-drop decision while A is locked.
# B must serialize and read A's original award; no new loot roll.
(
  psql -X -v ON_ERROR_STOP=1 -Atc "
    SELECT eq2review_v7.simulate_record_reward(
       '20000000-0000-4000-8000-000000000009',false,
       NULL,NULL,'review_policy_b');
  " >"$tmp/grant_b.log" 2>&1
) &
grant_b=$!
wait "$grant_a"
wait "$grant_b"
if ! grep -q '"replay": true' "$tmp/grant_b.log"; then
  echo "FAIL: second decision did not return the previously frozen award" >&2
  cat "$tmp/grant_a.log" "$tmp/grant_b.log" >&2
  exit 1
fi

actual="$(psql -X -v ON_ERROR_STOP=1 -Atc "
  SELECT COUNT(*) FROM eq2review_v7.frozen_decision d
  JOIN eq2review_v7.original_mint m
    ON m.entitlement_id=d.entitlement_id AND m.instance_id=d.minted_instance_id
  JOIN eq2review_v7.current_custody c ON c.instance_id=m.instance_id
  WHERE d.entitlement_id='20000000-0000-4000-8000-000000000009'
    AND d.awarded AND d.policy_version='review_policy_a'
    AND d.original_boss_id='BOSS_EXP_ROOT' AND c.custody_state='inventory';
")"
if [[ "$actual" != "1" ]]; then
  echo "FAIL: expected one and only one original award+copy, got $actual" >&2
  exit 1
fi

# Prepare a real escrow state IN THE SYNTHETIC DB ONLY.
psql -X -v ON_ERROR_STOP=1 -Atc "
 SELECT eq2review_v7.simulate_list(
  '40000000-0000-4000-8000-000000000009',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '50000000-0000-4000-8000-000000000009',9900);
" >"$tmp/list.log"

# Transaction A locks one offer; B tries buying the same physical instance.
(
  psql -X -v ON_ERROR_STOP=1 -Atc "
    BEGIN;
    SELECT 1 FROM eq2review_v7.simulated_offer
      WHERE offer_id='50000000-0000-4000-8000-000000000009' FOR UPDATE;
    SELECT pg_sleep(1);
    SELECT eq2review_v7.simulate_transfer_without_gold(
      '50000000-0000-4000-8000-000000000009',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '60000000-0000-4000-8000-000000000009');
    COMMIT;
  " >"$tmp/sale_a.log" 2>&1
) &
sale_a=$!
sleep 0.2
(
  psql -X -v ON_ERROR_STOP=1 -Atc "
    SELECT eq2review_v7.simulate_transfer_without_gold(
      '50000000-0000-4000-8000-000000000009',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      '60000000-0000-4000-8000-000000000010');
  " >"$tmp/sale_b.log" 2>&1
) &
sale_b=$!
wait "$sale_a"
if wait "$sale_b"; then
  echo "FAIL: racing second buyer was incorrectly allowed" >&2
  exit 1
fi
if ! grep -q 'eq2_review_offer_already_transferred' "$tmp/sale_b.log"; then
  echo "FAIL: second buyer rejection was not a committed duplicate sale" >&2
  cat "$tmp/sale_b.log" >&2
  exit 1
fi

sale_count="$(psql -X -v ON_ERROR_STOP=1 -Atc "
 SELECT COUNT(*) FROM eq2review_v7.synthetic_transfer_history
 WHERE instance_id='40000000-0000-4000-8000-000000000009';
")"
owner="$(psql -X -v ON_ERROR_STOP=1 -Atc "
 SELECT owner_id FROM eq2review_v7.current_custody
 WHERE instance_id='40000000-0000-4000-8000-000000000009';
")"
original_owner="$(psql -X -v ON_ERROR_STOP=1 -Atc "
 SELECT original_owner_id FROM eq2review_v7.original_mint
 WHERE instance_id='40000000-0000-4000-8000-000000000009';
")"
if [[ "$sale_count" != "1" ||
      "$owner" != "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" ||
      "$original_owner" != "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" ]]; then
  echo "FAIL: concurrent attempted sale changed historical boss origin or paid two simulated owners" >&2
  exit 1
fi
echo "PASS PG17 V7 concurrent review: one locked entitlement = one immutable original decision; only one buyer can receive the same physical copy; original owner unchanged; no Gold ever moved."
