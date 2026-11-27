#!/usr/bin/env bash
# Synthetic local PostgreSQL only. Run after 02_concurrency.sh.
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
"${p[@]}" -c "select market_review.resource_act('list','a','bulk-race-list','bulk-race',0,'ore',100,2,100)"
(
 PGAPPNAME=market-bulk-race "${p[@]}" -c "begin; select id from market_review.resource_offer where id='bulk-race' for update; select pg_sleep(3); select market_review.resource_act('buy','b','bulk-win','bulk-race',0,p_quantity=>60,p_price=>2,p_now=>101); commit;"
) >"$tmp/a.log" 2>&1 &
a=$!
wait_sleep market-bulk-race
(
 "${p[@]}" -c "select market_review.resource_act('buy','c','bulk-lose','bulk-race',0,p_quantity=>60,p_price=>2,p_now=>101)"
) >"$tmp/b.log" 2>&1 &
b=$!
wait "$a" || { cat "$tmp/a.log"; exit 1; }
if wait "$b"; then echo "second fill unexpectedly succeeded"; exit 1; fi
grep -q stale_resource_revision "$tmp/b.log" || { cat "$tmp/b.log"; exit 1; }
# 1 remaining active resource listing plus 18 new ones = 19 active slots.
"${p[@]}" <<'SQL'
DO $$ BEGIN
 FOR i IN 1..18 LOOP
  PERFORM market_review.resource_act('list','a','race-cap-'||i,'race-cap-'||i,0,'ore',10,1,100);
 END LOOP;
END $$;
SQL
(
 PGAPPNAME=market-cap-race "${p[@]}" -c "begin; select id from market_review.wallet where id='a' for update; select pg_sleep(3); select market_review.resource_act('list','a','race-cap-win','race-cap-win',0,'ore',10,1,100); commit;"
) >"$tmp/c.log" 2>&1 &
c=$!
wait_sleep market-cap-race
(
 "${p[@]}" -c "select market_review.resource_act('list','a','race-cap-lose','race-cap-lose',0,'ore',10,1,100)"
) >"$tmp/d.log" 2>&1 &
d=$!
wait "$c" || { cat "$tmp/c.log"; exit 1; }
if wait "$d"; then echo "21st slot unexpectedly succeeded"; exit 1; fi
grep -q account_listing_cap "$tmp/d.log" || { cat "$tmp/d.log"; exit 1; }
"${p[@]}" <<'SQL'
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.resource_delivery)<>1
 OR (SELECT remaining FROM market_review.resource_offer WHERE id='bulk-race')<>40
 OR (SELECT sum(quantity) FROM market_review.resource_stock)+(SELECT sum(remaining) FROM market_review.resource_offer)+(SELECT sum(quantity) FROM market_review.resource_delivery)<>1000
 OR (SELECT sum(gold) FROM market_review.wallet)+(SELECT sum(fee) FROM market_review.sale)+(SELECT sum(fee) FROM market_review.resource_delivery)<>3000
 OR (SELECT count(*) FROM market_review.resource_offer WHERE seller='a' AND status='active')<>20
 OR EXISTS(SELECT 1 FROM market_review.request WHERE request_id IN ('bulk-lose','race-cap-lose'))
 THEN RAISE EXCEPTION 'bulk_race_conservation_failed'; END IF;
END $$;
SQL
echo "PASS: competing partial fills and shared account slot contention"
