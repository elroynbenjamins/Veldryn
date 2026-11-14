#!/usr/bin/env bash
# Disposable PG17 only. NEVER aim at staging or production.
set -euo pipefail
: "${PGDATABASE:?}" "${PGHOST:?}"
if [[ "$PGDATABASE" != "veldryn_market_ci" || "$PGHOST" != "localhost" ]]; then
  echo "Refusing Market V12 synthetic tests outside disposable CI" >&2
  exit 2
fi
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MIGRATIONS="$ROOT/backend/supabase/migrations"
psql -X -v ON_ERROR_STOP=1 -q -f "$ROOT/backend/supabase/tests/player_market_concurrency_bootstrap_ci_v6.sql"
for migration in \
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
  20261108225000_market_equipment_inbox_private_v9.sql \
  20261110095000_market_private_price_bands_v10.sql \
  20261110095500_market_private_offer_price_guard_v10.sql \
  20261110103500_market_lot_tax_policy_foundation_v11.sql \
  20261110104000_market_offer_minimum_lots_private_v11.sql \
  20261110104500_market_completed_sale_gold_tax_private_v11.sql \
  20261110105000_market_verified_sale_review_private_v11.sql \
  20261110110000_market_verified_browse_private_v12.sql \
  20261110112000_market_completed_sale_history_v13.sql \
  20261113043000_market_purchase_acquisition_guard_private_v18.sql \
  20261113050000_market_equipment_provenance_private_v19.sql \
  20261113063000_market_direct_recipient_transfer_private_v20.sql \
  20261113073000_market_purchased_gear_bank_vault_private_v21.sql \
  20261113083000_market_resale_chain_guard_private_v22.sql \
  20261113100000_market_resale_custody_private_v23.sql \
  20261113103000_market_resale_settlement_private_v23.sql \
  20261113110000_market_unified_browse_private_v24.sql \
  20261113111000_market_unified_inbox_private_v24.sql \
  20261113112000_market_resale_expiry_private_v24.sql \
  20261113112500_market_v12_browser_reconciliation_private_v24.sql
do
  psql -X -v ON_ERROR_STOP=1 -q -f "$MIGRATIONS/$migration"
done
echo "PASS: all 35 dependency-ordered private Market migrations compile on clean PG17"
psql -X -v ON_ERROR_STOP=1 -q -f "$ROOT/backend/supabase/tests/player_market_acquisition_v18.sql"
psql -X -v ON_ERROR_STOP=1 -q -f "$ROOT/backend/supabase/tests/player_market_provenance_v19.sql"
psql -X -v ON_ERROR_STOP=1 -q -f "$ROOT/backend/supabase/tests/player_market_recipient_transfer_v20.sql"
psql -X -v ON_ERROR_STOP=1 -q -f "$ROOT/backend/supabase/tests/player_market_bank_vault_v21.sql"
psql -X -v ON_ERROR_STOP=1 -q -f "$ROOT/backend/supabase/tests/player_market_resale_chain_v22.sql"
psql -X -v ON_ERROR_STOP=1 -q -f "$ROOT/backend/supabase/tests/player_market_resale_lifecycle_v23.sql"
psql -X -v ON_ERROR_STOP=1 -q -f "$ROOT/backend/supabase/tests/player_market_visibility_expiry_v24.sql"
psql -X -v ON_ERROR_STOP=1 -q -f "$ROOT/backend/supabase/tests/player_market_v12_resource_tax_lifecycle.sql"
psql -X -v ON_ERROR_STOP=1 -q -f "$ROOT/backend/supabase/tests/player_market_v12_equipment_tax_lifecycle.sql"
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
do $check$
begin
 if exists(select 1 from private.market_runtime_guard_v1
   where trading_enabled or snapshot_bridge_ready)
 or exists(select 1 from private.market_equipment_guard_v8
   where equipment_transfers_enabled)
 or exists(select 1 from private.market_item_policy_v1 where tradable)
 or exists(select 1 from private.market_price_bands_v10 where approved)
 or exists(select 1 from private.market_equipment_tier_bands_v10 where approved)
 or exists(select 1 from private.market_listing_lot_policies_v11 where approved)
 or exists(select 1 from private.market_gold_intents_v2)
 or exists(select 1 from private.market_sale_offers_v3)
 or exists(select 1 from private.market_completed_sale_history_v13)
 or exists(select 1 from private.market_acquisition_policy_v18 where approved)
 or exists(select 1 from private.market_equipment_provenance_v19)
 or exists(select 1 from private.market_equipment_recipient_transfers_v20)
 or exists(select 1 from private.market_equipment_bank_actions_v21)
 or exists(select 1 from private.market_equipment_sale_chain_v22)
 or exists(select 1 from private.market_equipment_resale_offers_v23)
 or exists(select 1 from private.market_equipment_resale_chain_v23)
 or exists(select 1 from private.market_equipment_resale_deliveries_v23)
 or exists(select 1 from private.market_resale_gold_intents_v23)
 or exists(select 1 from private.market_resale_action_receipts_v23)
 or has_function_privilege('authenticated','private.market_sale_tax_quote_v11(bigint)','EXECUTE')
 or has_function_privilege('anon','private.market_verified_completed_sales_v11(text,text,timestamptz)','EXECUTE')
 or has_function_privilege('authenticated','private.market_completed_price_chart_v13(text,text,integer,text)','EXECUTE')
 or has_table_privilege('authenticated','private.market_acquisition_policy_v18','SELECT')
 or has_table_privilege('authenticated','private.market_equipment_provenance_v19','SELECT')
 or has_table_privilege('authenticated','private.market_equipment_recipient_transfers_v20','SELECT')
 or has_table_privilege('authenticated','private.market_equipment_bank_actions_v21','SELECT')
 or has_table_privilege('authenticated','private.market_equipment_sale_chain_v22','SELECT')
 or has_table_privilege('authenticated','private.market_equipment_resale_offers_v23','SELECT')
 or has_table_privilege('authenticated','private.market_equipment_resale_chain_v23','SELECT')
 or has_function_privilege('authenticated','private.market_purchase_equipment_resale_v23(uuid,uuid,bigint,bigint,bigint,text,text)','EXECUTE')
 or has_function_privilege('authenticated','private.market_browse_combined_v24(text,text,text,text,bigint,bigint,integer,integer)','EXECUTE')
 or has_function_privilege('authenticated','private.market_inbox_unified_v24(uuid,boolean,integer)','EXECUTE')
 or has_function_privilege('service_role','private.market_due_resales_v24(integer)','EXECUTE')
 or has_function_privilege('service_role','private.market_expire_resale_v24(uuid,text,text)','EXECUTE')
 or has_function_privilege('authenticated','private.market_resale_preflight_v22(uuid,text,text,text,integer)','EXECUTE')
 or has_function_privilege('authenticated','private.market_move_purchased_equipment_bank_v21(uuid,text,text,text,text,integer,integer,bigint,text,text)','EXECUTE')
 or has_function_privilege('authenticated','private.market_transfer_purchased_equipment_v20(uuid,text,text,text,integer,text,text,bigint,text,text)','EXECUTE')
 or has_function_privilege('service_role','private.market_owned_copy_valid_v19(jsonb,text,text,text,jsonb)','EXECUTE')
 then raise exception 'private_market_v12_post_rollback_release_gate_failure';end if;
end
$check$;
SQL
echo "PASS: no synthetic trades survive rollback; all launch flags, asset policies, prices, lot approvals and public access remain OFF"
# The multi-session race requires a committed fixture visible to concurrent
# PostgreSQL sessions; it runs LAST in this disposable CI-only database.
# No fixture is ever created in staging, production, or a persistent DB.
bash -n "$ROOT/backend/supabase/tests/player_market_resale_buy_race_v24_ci.sh"
bash "$ROOT/backend/supabase/tests/player_market_resale_buy_race_v24_ci.sh"
