#!/usr/bin/env bash
# Synthetic local PostgreSQL only. Run after 02_concurrency.sh and 05_bulk_concurrency.sh.
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
# Run last on the disposable database. Do not mix with earlier rollback fixtures.
"${p[@]}" -1 -f tools/market-review/pg17/07_original_registration_schema.sql
"${p[@]}" <<'SQL'
UPDATE market_review.wallet SET inventory_cap=1 WHERE id IN ('b','c');
INSERT INTO market_review.original_forge_claim VALUES
 ('race-mint-1','race-job-1','race-copy-1','c','c1','equipment-2.0',repeat('a',64),'{"quality":77}'),
 ('race-mint-2','race-job-2','race-copy-2','b','b1','equipment-2.0',repeat('b',64),'{"quality":50}'),
 ('race-mint-3','race-job-3','race-copy-3','b','b1','equipment-2.0',repeat('c',64),'{"quality":90}');
SQL
# The first transaction registers and pauses BEFORE committing. The second
# must wait for the receipt lock, then replay without using a second slot.
(
 PGAPPNAME=market-mint-replay "${p[@]}" -c "begin; select market_review.register_original_forge('race-mint-1','race-copy-1','c','c1',repeat('a',64)); select pg_sleep(3); commit;"
) >"$tmp/mint-a.log" 2>&1 &
a=$!
wait_sleep market-mint-replay
(
 "${p[@]}" -c "select market_review.register_original_forge('race-mint-1','race-copy-1','c','c1',repeat('a',64))"
) >"$tmp/mint-b.log" 2>&1 &
b=$!
wait "$a" || { cat "$tmp/mint-a.log"; exit 1; }
wait "$b" || { cat "$tmp/mint-b.log"; exit 1; }
grep -q '"marketAuthorized": false' "$tmp/mint-b.log"
# Distinct receipts for the same account serialize on its wallet lock.
(
 PGAPPNAME=market-mint-cap "${p[@]}" -c "begin; select market_review.register_original_forge('race-mint-2','race-copy-2','b','b1',repeat('b',64)); select pg_sleep(3); commit;"
) >"$tmp/mint-c.log" 2>&1 &
c=$!
wait_sleep market-mint-cap
(
 "${p[@]}" -c "select market_review.register_original_forge('race-mint-3','race-copy-3','b','b1',repeat('c',64))"
) >"$tmp/mint-d.log" 2>&1 &
d=$!
wait "$c" || { cat "$tmp/mint-c.log"; exit 1; }
if wait "$d"; then echo "competing mint exceeded capacity" >&2; exit 1; fi
grep -q original_inventory_full "$tmp/mint-d.log" || { cat "$tmp/mint-d.log"; exit 1; }
"${p[@]}" <<'SQL'
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.mint WHERE id IN ('race-copy-1','race-copy-2','race-copy-3'))<>2
 OR (SELECT count(*) FROM market_review.custody WHERE id IN ('race-copy-1','race-copy-2') AND state='inventory' AND revision=0)<>2
 OR NOT EXISTS(SELECT 1 FROM market_review.custody WHERE id='race-copy-1' AND owner='c' AND holder='c1')
 OR NOT EXISTS(SELECT 1 FROM market_review.custody WHERE id='race-copy-2' AND owner='b' AND holder='b1')
 OR (SELECT count(*) FROM market_review.policy WHERE id IN ('race-copy-1','race-copy-2') AND NOT approved)<>2
 OR EXISTS(SELECT 1 FROM market_review.custody WHERE id='race-copy-3')
 OR EXISTS(SELECT 1 FROM market_review.policy WHERE id='race-copy-3')
 OR (SELECT count(*) FROM market_review.original_forge_claim)<>3
 OR EXISTS(SELECT 1 FROM market_review.offer WHERE instance IN ('race-copy-1','race-copy-2','race-copy-3'))
 OR (SELECT sum(gold) FROM market_review.wallet)+(SELECT sum(fee) FROM market_review.sale)+(SELECT sum(fee) FROM market_review.resource_delivery)<>3000
 THEN RAISE EXCEPTION 'mint_race_invariant_failed'; END IF;
END $$;
SQL
echo "PASS: same-receipt replay, final-slot contention and no automatic trade approval"
