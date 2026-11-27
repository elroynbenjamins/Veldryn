#!/usr/bin/env bash
# Fresh disposable PG17 fixture only, independent of the settlement/race suite.
set -euo pipefail
[[ "${PGHOST:-}" == 127.0.0.1 && "${PGDATABASE:-}" == eq2_market_review && "${PGUSER:-}" == eq2_market_review ]]
p=(psql -X -v ON_ERROR_STOP=1 -At)
[[ "$("${p[@]}" -c "select current_database() || ':' || current_setting('market_review.disposable',true)")" == eq2_market_review:yes ]]
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
wait_sleep() {
 local name="$1" observed
 for _ in {1..50}; do
  observed=$("${p[@]}" -c "select count(*) from pg_stat_activity where application_name='$name' and wait_event='PgSleep'")
  [[ "$observed" == 1 ]] && return 0
  sleep 0.1
 done
 echo "lock holder did not reach synchronization barrier: $name" >&2
 return 1
}
"${p[@]}" -1 -f tools/market-review/pg17/11_resource_claim_schema.sql -f tools/market-review/pg17/10_material_lot_provenance_schema.sql
"${p[@]}" <<'SQL'
UPDATE market_review.resource_claim_destination SET cap=60 WHERE owner='b' AND destination='inventory:b2';
SELECT market_review.resource_act('list','a','claims-list','claims-offer',0,'ore',100,2,100);
SELECT market_review.resource_act('buy','b','claims-buy-1','claims-offer',0,p_quantity=>30,p_price=>2,p_now=>101);
SELECT market_review.resource_act('buy','b','claims-buy-2','claims-offer',1,p_quantity=>30,p_price=>2,p_now=>102);
SELECT market_review.resource_act('buy','b','claims-buy-3','claims-offer',2,p_quantity=>40,p_price=>2,p_now=>103);
UPDATE market_review.resource_policy SET approved=false WHERE item='ore';
SELECT market_review.assert_material_conservation();
SQL
# Same receipt, same idempotency key and a second key all contend concurrently.
(
 PGAPPNAME=claim-replay-lock "${p[@]}" -c "begin; select market_review.claim_resource_delivery('b','claims-1','b','claims-buy-1','inventory:b2'); select pg_sleep(3); commit;"
) >"$tmp/first.log" 2>&1 &
first=$!
wait_sleep claim-replay-lock
(
 "${p[@]}" -c "select market_review.claim_resource_delivery('b','claims-1','b','claims-buy-1','inventory:b2')"
) >"$tmp/replay.log" 2>&1 &
replay=$!
(
 "${p[@]}" -c "select market_review.claim_resource_delivery('b','claims-duplicate','b','claims-buy-1','bank')"
) >"$tmp/duplicate.log" 2>&1 &
duplicate=$!
wait "$first" || { cat "$tmp/first.log"; exit 1; }
wait "$replay" || { cat "$tmp/replay.log"; exit 1; }
grep -q '"status": "claimed"' "$tmp/replay.log"
if wait "$duplicate"; then echo "same delivery claimed twice" >&2; exit 1; fi
grep -q delivery_already_claimed "$tmp/duplicate.log" || { cat "$tmp/duplicate.log"; exit 1; }
# Distinct deliveries compete for the last available destination quantity.
(
 PGAPPNAME=claim-cap-lock "${p[@]}" -c "begin; select market_review.claim_resource_delivery('b','claims-2','b','claims-buy-2','inventory:b2'); select pg_sleep(3); commit;"
) >"$tmp/cap-win.log" 2>&1 &
winner=$!
wait_sleep claim-cap-lock
(
 "${p[@]}" -c "select market_review.claim_resource_delivery('b','claims-3','b','claims-buy-3','inventory:b2')"
) >"$tmp/cap-lose.log" 2>&1 &
loser=$!
wait "$winner" || { cat "$tmp/cap-win.log"; exit 1; }
if wait "$loser"; then echo "destination overfilled" >&2; exit 1; fi
grep -q destination_full "$tmp/cap-lose.log" || { cat "$tmp/cap-lose.log"; exit 1; }
"${p[@]}" <<'SQL'
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.resource_claim)<>2
 OR EXISTS(SELECT 1 FROM market_review.request WHERE actor='b' AND request_id IN ('claims-3','claims-duplicate'))
 OR EXISTS(SELECT 1 FROM market_review.resource_claim WHERE delivery_request='claims-buy-3')
 OR (SELECT quantity FROM market_review.resource_claim_projection WHERE owner='b' AND destination='inventory:b2' AND item='ore') IS DISTINCT FROM 60::bigint
 THEN RAISE EXCEPTION 'claim_race_invariant_failed'; END IF;
END $$;
SELECT market_review.assert_material_conservation();
-- A failed attempt can safely retry to an alternative destination. Original
-- paid entitlement survives storage failure and revoked trading policy.
SELECT market_review.claim_resource_delivery('b','claims-3','b','claims-buy-3','bank');
SELECT market_review.claim_resource_delivery('b','claims-3','b','claims-buy-3','bank');
SELECT market_review.assert_material_conservation();
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.resource_claim)<>3
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='ore') IS DISTINCT FROM 100::bigint
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='a' AND item='ore') IS DISTINCT FROM 900::bigint
 OR (SELECT quantity FROM market_review.resource_claim_projection WHERE owner='b' AND destination='bank' AND item='ore') IS DISTINCT FROM 40::bigint
 OR (SELECT quantity FROM market_review.material_stock_lot WHERE owner='b' AND origin='origin-01' AND destination='inventory:b2') IS DISTINCT FROM 20::bigint
 OR (SELECT quantity FROM market_review.material_stock_lot WHERE owner='b' AND origin='origin-02' AND destination='inventory:b2') IS DISTINCT FROM 40::bigint
 OR (SELECT quantity FROM market_review.material_stock_lot WHERE owner='b' AND origin='origin-02' AND destination='bank') IS DISTINCT FROM 40::bigint
 OR (SELECT gold FROM market_review.wallet WHERE id='b')<>800
 OR (SELECT gold FROM market_review.wallet WHERE id='a')<>1190
 OR (SELECT sum(gold) FROM market_review.wallet)+(SELECT sum(fee) FROM market_review.resource_delivery)<>3000
 THEN RAISE EXCEPTION 'claim_race_conservation_failed'; END IF;
END $$;
SQL
echo "PASS: same-key replay, competing claim keys, destination capacity and safe recovery with preserved origins"

# The same account has 100 collected ore (60 in b2, 40 in Bank).
# Both Market listing and crafting must serialize against that stock.
"${p[@]}" -1 -f tools/market-review/pg17/13_material_consumption_schema.sql
"${p[@]}" -c "update market_review.resource_policy set approved=true where item='ore'"
(
 PGAPPNAME=craft-before-list "${p[@]}" -c "begin; select market_review.consume_material('b','race-craft-60','b2','fixture-ore-consumption',20); select pg_sleep(3); commit;"
) >"$tmp/craft-first.log" 2>&1 &
first=$!
wait_sleep craft-before-list
(
 "${p[@]}" -c "select market_review.resource_act('list','b','race-list-lose','race-list-lose',0,'ore',50,2,200)"
) >"$tmp/list-lose.log" 2>&1 &
loser=$!
wait "$first" || { cat "$tmp/craft-first.log"; exit 1; }
if wait "$loser"; then echo "listing spent materials unexpectedly succeeded" >&2; exit 1; fi
grep -q insufficient_stock "$tmp/list-lose.log" || { cat "$tmp/list-lose.log"; exit 1; }
"${p[@]}" -c "select market_review.assert_material_conservation()"
# Reverse order: listing escrows 30 of the remaining 40. Crafting must not
# draw from escrow. Even a partially attempted debit rolls back completely.
(
 PGAPPNAME=list-before-craft "${p[@]}" -c "begin; select market_review.resource_act('list','b','race-list-30','race-list-30',0,'ore',30,2,200); select pg_sleep(3); commit;"
) >"$tmp/list-first.log" 2>&1 &
first=$!
wait_sleep list-before-craft
(
 "${p[@]}" -c "select market_review.consume_material('b','race-craft-lose','b2','fixture-ore-consumption',4)"
) >"$tmp/craft-lose.log" 2>&1 &
loser=$!
wait "$first" || { cat "$tmp/list-first.log"; exit 1; }
if wait "$loser"; then echo "craft consumed escrowed materials" >&2; exit 1; fi
grep -q insufficient_claimed_materials "$tmp/craft-lose.log" || { cat "$tmp/craft-lose.log"; exit 1; }
"${p[@]}" -c "select market_review.assert_material_conservation()"
# Two different craft requests compete for the last ten available units.
# Exact replay of the winning command still returns the original receipt.
(
 PGAPPNAME=craft-before-craft "${p[@]}" -c "begin; select market_review.consume_material('b','race-craft-6','b2','fixture-ore-consumption',2); select pg_sleep(3); commit;"
) >"$tmp/craft-win.log" 2>&1 &
winner=$!
wait_sleep craft-before-craft
(
 "${p[@]}" -c "select market_review.consume_material('b','race-craft-6-lose','b2','fixture-ore-consumption',2)"
) >"$tmp/craft-6-lose.log" 2>&1 &
loser=$!
(
 "${p[@]}" -c "select market_review.consume_material('b','race-craft-6','b2','fixture-ore-consumption',2)"
) >"$tmp/craft-replay.log" 2>&1 &
replay=$!
wait "$winner" || { cat "$tmp/craft-win.log"; exit 1; }
if wait "$loser"; then echo "competing craft unexpectedly consumed unavailable stock" >&2; exit 1; fi
grep -q insufficient_claimed_materials "$tmp/craft-6-lose.log" || { cat "$tmp/craft-6-lose.log"; exit 1; }
wait "$replay" || { cat "$tmp/craft-replay.log"; exit 1; }
grep -q '"status": "consumed"' "$tmp/craft-replay.log"
"${p[@]}" <<'SQL'
SELECT market_review.assert_material_conservation();
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.material_spend WHERE owner='b')<>2
 OR (SELECT sum(quantity) FROM market_review.material_spent_lot WHERE owner='b') IS DISTINCT FROM 66::numeric
 OR (SELECT sum(quantity) FROM market_review.material_spent_lot WHERE owner='b' AND origin='origin-01') IS DISTINCT FROM 20::numeric
 OR (SELECT sum(quantity) FROM market_review.material_spent_lot WHERE owner='b' AND origin='origin-02') IS DISTINCT FROM 46::numeric
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='ore') IS DISTINCT FROM 4::bigint
 OR (SELECT quantity FROM market_review.resource_claim_projection WHERE owner='b' AND destination='inventory:b2' AND item='ore') IS DISTINCT FROM 0::bigint
 OR (SELECT quantity FROM market_review.resource_claim_projection WHERE owner='b' AND destination='bank' AND item='ore') IS DISTINCT FROM 4::bigint
 OR (SELECT remaining FROM market_review.resource_offer WHERE id='race-list-30') IS DISTINCT FROM 30
 OR (SELECT remaining FROM market_review.material_escrow_lot WHERE offer='race-list-30' AND origin='origin-02') IS DISTINCT FROM 30::bigint
 OR EXISTS(SELECT 1 FROM market_review.resource_offer WHERE id='race-list-lose')
 OR EXISTS(SELECT 1 FROM market_review.request WHERE actor='b' AND request_id IN ('race-list-lose','race-craft-lose','race-craft-6-lose'))
 OR EXISTS(SELECT 1 FROM market_review.material_spend WHERE owner='b' AND request_id IN ('race-craft-lose','race-craft-6-lose'))
 OR (SELECT gold FROM market_review.wallet WHERE id='b')<>800
 OR (SELECT gold FROM market_review.wallet WHERE id='a')<>1190
 OR (SELECT sum(gold) FROM market_review.wallet)+(SELECT sum(fee) FROM market_review.resource_delivery)<>3000
 THEN RAISE EXCEPTION 'craft_market_race_invariant_failed'; END IF;
END $$;
SQL
echo "PASS: craft versus listing in both orders, competing crafts, exact replay and no partial debit"
