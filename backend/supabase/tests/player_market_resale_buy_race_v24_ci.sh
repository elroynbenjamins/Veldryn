#!/usr/bin/env bash
# Disposable PG17 CI ONLY. Creates committed synthetic fixture intentionally,
# then tests two real PostgreSQL sessions purchasing one exact resale.
# Never run against staging/production or a remotely hosted database.
set -euo pipefail
: "${PGDATABASE:?}" "${PGHOST:?}"
if [[ "$PGDATABASE" != "veldryn_market_ci" || "$PGHOST" != "localhost" ]]; then
  echo "Refusing committed Market V24 race fixture outside disposable localhost CI" >&2
  exit 2
fi
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
create table private.market_v24_race_fixture (
  seller_id uuid not null,
  buyer1_id uuid not null,
  buyer2_id uuid not null,
  resale_id uuid not null,
  seller_revision bigint not null,
  buyer1_revision bigint not null,
  buyer2_revision bigint not null
);
SQL

# Reuse the verified first-sale -> claim -> bank -> resale fixture.
# Stop before the first V23 cancel or purchase and commit ONLY in disposable
# CI so concurrent sessions can see identical saved-state revisions.
awk '
  /^  v_retry:=private\.market_reserve_equipment_resale_v23\(/ { found=1; exit }
  { print }
  END { if (!found) exit 1 }
' "$ROOT/backend/supabase/tests/player_market_v12_equipment_tax_lifecycle.sql" \
  > "$tmp/fixture.sql"
cat >> "$tmp/fixture.sql" <<'SQL'
  -- Both competing buyers have real class, XP, Gold and relational wallets.
  update public.online_game_states
    set state=pg_catalog.jsonb_set(
      pg_catalog.jsonb_set(state,'{character,classId}','"BASTION"'::jsonb,true),
      '{character,xp}','10000000'::jsonb,true)
    where account_id in (v_rival,v_seller);
  insert into private.market_v24_race_fixture(
    seller_id,buyer1_id,buyer2_id,resale_id,
    seller_revision,buyer1_revision,buyer2_revision)
  select v_buyer,v_rival,v_seller,v_resale_id,
    (select revision from public.online_game_states where account_id=v_buyer),
    (select revision from public.online_game_states where account_id=v_rival),
    (select revision from public.online_game_states where account_id=v_seller);
end
$v9_test$;
commit;
SQL
psql -X -v ON_ERROR_STOP=1 -q -f "$tmp/fixture.sql"
IFS='|' read -r seller buyer1 buyer2 resale seller_rev buyer1_rev buyer2_rev \
 < <(psql -X -v ON_ERROR_STOP=1 -At -F '|' -c \
 'select seller_id,buyer1_id,buyer2_id,resale_id,seller_revision,buyer1_revision,buyer2_revision from private.market_v24_race_fixture limit 1')
if [[ -z "${seller:-}" || -z "${buyer1:-}" || -z "${buyer2:-}" ||
  -z "${resale:-}" ]]; then
  echo "Missing V24 synthetic race fixture" >&2
  exit 1
fi

# Hold the same account advisory lock the game save/market purchase uses.
# Queue two independent buyers behind it, then let them contend.
psql -X -v ON_ERROR_STOP=1 -q -c \
 "select pg_advisory_lock(hashtextextended('party-account:$seller',0));
  select pg_sleep(8);
  select pg_advisory_unlock(hashtextextended('party-account:$seller',0));" \
 > "$tmp/barrier.log" 2>&1 &
barrier=$!
barrier_ready=0
for _ in $(seq 1 30); do
  held="$(psql -X -v ON_ERROR_STOP=1 -At -c \
    "select pg_try_advisory_lock(hashtextextended('party-account:$seller',0));")"
  if [[ "$held" == "f" ]]; then barrier_ready=1;break;fi
  sleep 0.2
done
if [[ "$barrier_ready" -ne 1 ]]; then
  echo "Could not verify V24 race contention barrier" >&2
  exit 1
fi
psql -X -v ON_ERROR_STOP=1 -At -c \
 "select private.market_purchase_equipment_resale_v23(
   '$buyer1'::uuid,'$resale'::uuid,125,$buyer1_rev,$seller_rev,
   'v24-race-buyer-one',repeat('a',64));" \
 > "$tmp/buyer1.log" 2>&1 &
pid1=$!
psql -X -v ON_ERROR_STOP=1 -At -c \
 "select private.market_purchase_equipment_resale_v23(
   '$buyer2'::uuid,'$resale'::uuid,125,$buyer2_rev,$seller_rev,
   'v24-race-buyer-two',repeat('b',64));" \
 > "$tmp/buyer2.log" 2>&1 &
pid2=$!
rc1=0;rc2=0
wait "$pid1" || rc1=$?
wait "$pid2" || rc2=$?
wait "$barrier"
if [[ $(( (rc1 == 0) + (rc2 == 0) )) -ne 1 ]]; then
  echo "Exactly one V24 competing buyer must settle" >&2
  cat "$tmp/buyer1.log" "$tmp/buyer2.log" >&2
  exit 1
fi
if [[ "$rc1" -ne 0 ]]; then
  grep -Eq 'market_stale_state|market_offer_not_available' "$tmp/buyer1.log" || {
    cat "$tmp/buyer1.log" >&2;exit 1;
  }
fi
if [[ "$rc2" -ne 0 ]]; then
  grep -Eq 'market_stale_state|market_offer_not_available' "$tmp/buyer2.log" || {
    cat "$tmp/buyer2.log" >&2;exit 1;
  }
fi

res="$(psql -X -v ON_ERROR_STOP=1 -At -c "
  select (
    (select count(*) from private.market_resale_gold_intents_v23 g
      where g.resale_id='$resale'::uuid and g.gross_gold=125
        and g.fee_gold=7 and g.seller_payout_gold=118)=1
    and (select count(*) from private.market_equipment_resale_chain_v23 c
      where c.resale_id='$resale'::uuid and c.sale_ordinal=2)=1
    and (select count(*) from private.market_equipment_resale_deliveries_v23 d
      where d.resale_id='$resale'::uuid and d.status='pending')=1
    and (select count(*) from private.market_resale_action_receipts_v23 a
      where a.action='purchase'
        and a.result->>'resaleId'='$resale')=1
    and (select status from private.market_equipment_resale_offers_v23 o
      where o.resale_id='$resale'::uuid)='sold'
    and (select gold from public.character_wallets w
      join public.online_game_states s on s.character_id=w.character_id
      where s.account_id='$seller'::uuid)=493
  );")"
if [[ "$res" != "t" ]]; then
  echo "V24 race violated single-sale, Gold or Forge delivery invariant" >&2
  exit 1
fi
echo "PASS: two real PG17 buyer sessions contend; exactly one resale settles, fee and copy are conserved"
# Fixture exists only in disposable CI database, destroyed with the job.
