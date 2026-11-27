#!/usr/bin/env bash
# Synthetic local PostgreSQL only. No external credentials.
set -euo pipefail
[[ "${PGHOST:-}" == 127.0.0.1 && "${PGDATABASE:-}" == eq2_market_review && "${PGUSER:-}" == eq2_market_review ]]
p=(psql -X -v ON_ERROR_STOP=1 -At)
[[ "$("${p[@]}" -c "select current_database() || ':' || current_setting('market_review.disposable',true)")" == eq2_market_review:yes ]]
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
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
"${p[@]}" -c "select market_review.act('list','a','race-list-x','x',0,'race-x',125,100)"
# Both contenders use the same observed revision. A commits while B is waiting.
(
 PGAPPNAME=market-race-x "${p[@]}" -c "begin; select id from market_review.custody where id='x' for update; select pg_sleep(3); select market_review.act('buy','b','race-buy-x','x',1,'race-x',125,101,'b1'); commit;"
) >"$tmp/a.log" 2>&1 &
a=$!
wait_sleep market-race-x
(
 "${p[@]}" -c "select market_review.act('buy','c','race-lose-x','x',1,'race-x',125,101,'c1')"
) >"$tmp/b.log" 2>&1 &
b=$!
wait "$a" || { cat "$tmp/a.log"; exit 1; }
if wait "$b"; then echo "second buyer unexpectedly succeeded"; exit 1; fi
grep -q stale_revision "$tmp/b.log" || { cat "$tmp/b.log"; exit 1; }
"${p[@]}" -c "select market_review.act('list','a','race-list-y','y',0,'race-y',200,100)"
(
 PGAPPNAME=market-race-y "${p[@]}" -c "begin; select id from market_review.custody where id='y' for update; select pg_sleep(3); select market_review.act('cancel','a','race-cancel-y','y',1,'race-y'); commit;"
) >"$tmp/c.log" 2>&1 &
c=$!
wait_sleep market-race-y
(
 "${p[@]}" -c "select market_review.act('buy','c','race-lose-y','y',1,'race-y',200,101,'c1')"
) >"$tmp/d.log" 2>&1 &
d=$!
wait "$c" || { cat "$tmp/c.log"; exit 1; }
if wait "$d"; then echo "purchase after cancellation unexpectedly succeeded"; exit 1; fi
grep -q stale_revision "$tmp/d.log" || { cat "$tmp/d.log"; exit 1; }
"${p[@]}" <<'SQL'
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.sale)<>1
 OR (SELECT gold FROM market_review.wallet WHERE id='a')<>1118
 OR (SELECT gold FROM market_review.wallet WHERE id='b')<>875
 OR (SELECT gold FROM market_review.wallet WHERE id='c')<>1000
 OR (SELECT sum(gold) FROM market_review.wallet)+(SELECT sum(fee) FROM market_review.sale)<>3000
 OR NOT EXISTS(SELECT 1 FROM market_review.custody WHERE id='x' AND owner='b' AND state='pending_delivery' AND revision=2)
 OR NOT EXISTS(SELECT 1 FROM market_review.custody WHERE id='y' AND owner='a' AND state='pending_return' AND revision=2)
 OR EXISTS(SELECT 1 FROM market_review.request WHERE request_id IN ('race-lose-x','race-lose-y'))
 THEN RAISE EXCEPTION 'race_conservation_failed'; END IF;
END $$;
SQL
echo "PASS: competing buyers and cancellation-versus-purchase; one sale and conserved Gold"
