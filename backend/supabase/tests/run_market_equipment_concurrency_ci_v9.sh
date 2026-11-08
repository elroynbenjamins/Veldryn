#!/usr/bin/env bash
# REAL two-session exact Forge equipment concurrency test. Run ONLY on disposable GH
# postgres:17 service. Never point PGHOST/PGDATABASE at staging/production.
set -euo pipefail

: "$PGHOST"
: "$PGDATABASE"
if [[ "$PGDATABASE" != "veldryn_market_ci" || "$PGHOST" != "localhost" ]]; then
  echo "Refusing to run market concurrency fixture outside disposable local CI database" >&2
  exit 2
fi
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
psql_run() { psql -X -v ON_ERROR_STOP=1 -q "$@"; }
psql_value() { psql -X -v ON_ERROR_STOP=1 -Atqc "$1"; }

SELLER="00000000-0000-4000-8000-000000000001"
BUYER="00000000-0000-4000-8000-000000000002"
RIVAL="00000000-0000-4000-8000-000000000003"
CHARACTER="00000000-0000-4000-8000-000000000101"
CI_DIR="$ROOT/backend/supabase/tests"
LOG_DIR="$(mktemp -d)"
trap 'rm -rf "$LOG_DIR"' EXIT

psql_run -f "$CI_DIR/player_market_concurrency_bootstrap_ci_v6.sql"
for file in \
  20261108171500_player_market_private_custody_foundation_v1.sql \
  20261108173000_market_atomic_stack_reservation_private_v2.sql \
  20261108173100_market_safe_cancellation_private_v2.sql \
  20261108174500_market_return_claims_private_v3.sql \
  20261108175500_market_gold_purchase_private_v3.sql \
  20261108181000_market_purchase_claims_private_v4.sql \
  20261108181100_market_inbox_projection_private_v4.sql \
  20261108183000_market_seller_offer_lifecycle_private_v5.sql \
  20261108211500_market_exact_equipment_escrow_private_v8.sql \
  20261108212500_market_equipment_returns_private_v8.sql \
  20261108222500_market_equipment_buyer_ledger_private_v9.sql \
  20261108223000_market_equipment_offer_private_v9.sql \
  20261108223500_market_equipment_purchase_private_v9.sql \
  20261108224000_market_equipment_buyer_claim_private_v9.sql \
  20261108224500_market_equipment_offer_cancellation_private_v9.sql \
  20261108225000_market_equipment_inbox_private_v9.sql
do
  psql_run -f "$ROOT/backend/supabase/migrations/$file"
done
psql_run -f "$CI_DIR/player_market_equipment_concurrency_seed_ci_v9.sql"

offer_for_price() {
  psql_value "select offer_id from private.market_sale_offers_v3 where seller_account_id='$SELLER' and unit_price=$1 limit 1"
}
check_failure() {
  local status="$1" log="$2" expected="$3"
  if [[ "$status" -eq 0 ]]; then
    echo "Race loser unexpectedly succeeded:" >&2
    cat "$log" >&2
    exit 1
  fi
  if ! grep -Eq "$expected" "$log"; then
    echo "Race loser failed for the wrong reason:" >&2
    cat "$log" >&2
    exit 1
  fi
}
verify() {
  psql_run <<SQL
do \$verify\$
begin
  if (select count(*) from private.market_equipment_purchase_deliveries_v9)<>$1
    or (select count(*) from private.market_equipment_return_deliveries_v8)<>$2
    or (select gold from public.character_wallets where character_id='00000000-0000-4000-8000-000000000101')<>$3
    or (select gold from public.character_wallets where character_id='00000000-0000-4000-8000-000000000102')<>$4
    or (select gold from public.character_wallets where character_id='00000000-0000-4000-8000-000000000103')<>700
    or (select gold from public.characters where id='00000000-0000-4000-8000-000000000101')<>$3
    or (select gold from public.characters where id='00000000-0000-4000-8000-000000000102')<>$4
    or (select (state#>>'{character,gold}')::bigint from public.online_game_states where account_id='$SELLER')<>$3
    or (select (state#>>'{character,gold}')::bigint from public.online_game_states where account_id='$BUYER')<>$4
    or (select count(*) from private.market_equipment_escrows_v8 where status='sold')<>$1
    or (select count(*) from private.market_equipment_escrows_v8 where status='returned')<>$2
    or (select count(*) from private.market_gold_intents_v2 where status='settled')<>$1
    or (select count(*) from private.market_sale_offers_v3 where status='sold')<>$1
    or (select count(*) from private.market_sale_offers_v3 where status='cancelled')<>$2
  then raise exception 'market_v9_concurrent_invariant_failed';end if;
end
\$verify\$;
SQL
}

# Race 1: two separate PG connections purchase the same single escrow hold.
# Buyer A holds the real seller advisory lock first; rival B is guaranteed to
# wait, then see updated revision/offer status and must NOT debit or deliver.
OFFER1="$(offer_for_price 80)"
psql_run >"$LOG_DIR/buyer-a" 2>&1 <<SQL &
begin;
select pg_advisory_xact_lock(hashtextextended('party-account:$SELLER',0));
select pg_sleep(1.4);
select private.market_purchase_equipment_offer_v9(
 '$BUYER'::uuid,'$OFFER1'::uuid,80,1,7,6,
 'buy-concurrent-a1',repeat('a',64));
commit;
SQL
pid_a=$!
sleep 0.25
psql_run >"$LOG_DIR/buyer-b" 2>&1 <<SQL &
select private.market_purchase_equipment_offer_v9(
 '$RIVAL'::uuid,'$OFFER1'::uuid,80,1,9,6,
 'buy-concurrent-b1',repeat('b',64));
SQL
pid_b=$!
wait "$pid_a"
set +e
wait "$pid_b"
status_b=$?
set -e
check_failure "$status_b" "$LOG_DIR/buyer-b" "market_stale_state|market_offer_not_available"
verify 1 0 180 420
echo "PASS: two simultaneous buyers yield exactly one sale, one item delivery and one Gold transfer"

# Race 2: seller cancellation obtains the same advisory lock BEFORE purchase.
# The competing buyer must never be charged once the offer is cancelled.
psql_run <<SQL
do \$seed_second\$
declare r jsonb; v bigint;
begin
 select revision into v from public.online_game_states where account_id='$SELLER';
 r:=private.market_reserve_exact_equipment_v8(
  '$SELLER'::uuid,v,'inventory','$CHARACTER',0,'FORGE_T1_BASTION','gear-v9-race-2',
  'reserve-race-two',repeat('c',64));
 perform private.market_publish_equipment_offer_v9(
  '$SELLER'::uuid,(r->>'holdId')::uuid,60,1,'publish-race-two',repeat('d',64));
end
\$seed_second\$;
SQL
OFFER2="$(offer_for_price 60)"
psql_run >"$LOG_DIR/cancel-a" 2>&1 <<SQL &
begin;
select pg_advisory_xact_lock(hashtextextended('party-account:$SELLER',0));
select pg_sleep(1.4);
select private.market_cancel_equipment_offer_v9(
 '$SELLER'::uuid,'$OFFER2'::uuid,'cancel-race-a2',repeat('e',64));
commit;
SQL
pid_a=$!
sleep 0.25
psql_run >"$LOG_DIR/cancel-b" 2>&1 <<SQL &
select private.market_purchase_equipment_offer_v9(
 '$BUYER'::uuid,'$OFFER2'::uuid,60,1,8,8,
 'buy-race-b2',repeat('f',64));
SQL
pid_b=$!
wait "$pid_a"
set +e
wait "$pid_b"
status_b=$?
set -e
check_failure "$status_b" "$LOG_DIR/cancel-b" "market_offer_not_available|market_hold_not_available"
verify 1 1 180 420
echo "PASS: cancellation wins race; one return delivery and no extra Gold debit"

# Race 3: buyer obtains seller lock BEFORE cancellation. Cancellation must not
# return the now-settled item, even with simultaneous requests.
psql_run <<SQL
do \$seed_third\$
declare r jsonb; v bigint;
begin
 select revision into v from public.online_game_states where account_id='$SELLER';
 r:=private.market_reserve_exact_equipment_v8(
  '$SELLER'::uuid,v,'inventory','$CHARACTER',0,'FORGE_T1_BASTION','gear-v9-race-3',
  'reserve-race-three',repeat('1',64));
 perform private.market_publish_equipment_offer_v9(
  '$SELLER'::uuid,(r->>'holdId')::uuid,40,1,'publish-race-three',repeat('2',64));
end
\$seed_third\$;
SQL
OFFER3="$(offer_for_price 40)"
psql_run >"$LOG_DIR/purchase-first" 2>&1 <<SQL &
begin;
select pg_advisory_xact_lock(hashtextextended('party-account:$SELLER',0));
select pg_sleep(1.4);
select private.market_purchase_equipment_offer_v9(
 '$BUYER'::uuid,'$OFFER3'::uuid,40,1,8,9,
 'buy-race-a3',repeat('3',64));
commit;
SQL
pid_a=$!
sleep 0.25
psql_run >"$LOG_DIR/cancel-late" 2>&1 <<SQL &
select private.market_cancel_equipment_offer_v9(
 '$SELLER'::uuid,'$OFFER3'::uuid,'cancel-race-b3',repeat('4',64));
SQL
pid_b=$!
wait "$pid_a"
set +e
wait "$pid_b"
status_b=$?
set -e
check_failure "$status_b" "$LOG_DIR/cancel-late" "market_offer_not_cancelable"
verify 2 1 220 380
echo "PASS: purchase wins race; late cancellation cannot refund sold assets"
echo "PASS: REAL two-session PG17 market races preserve holdings, seller proceeds and buyer Gold"

