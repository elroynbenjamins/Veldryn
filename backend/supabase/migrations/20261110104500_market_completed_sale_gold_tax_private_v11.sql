-- Hidden V11C: 5% seller tax on SETTLED Market sales, rounded upward.
-- Dependent on V11A tax quote function, V11B lot guard and prior private
-- custody + purchase migration chain. Existing runtime guards and RLS remain.
-- Only buyer/seller Gold snapshots and recorded ledger are changed atomically
-- within the existing purchase transaction; no fee on cancellation/expiry.
begin;

create or replace function private.market_purchase_stack_offer_v3(
  p_buyer_account_id uuid,
  p_offer_id uuid,
  p_expected_unit_price bigint,
  p_expected_quantity integer,
  p_buyer_expected_revision bigint,
  p_seller_expected_revision bigint,
  p_idempotency_key text,
  p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_purchase$
declare
  v_seller_account_id uuid;
  v_offer private.market_sale_offers_v3%rowtype;
  v_receipt private.market_purchase_receipts_v3%rowtype;
  v_hold private.market_custody_holds_v1%rowtype;
  v_asset private.market_custody_assets_v1%rowtype;
  v_buyer public.online_game_states%rowtype;
  v_seller public.online_game_states%rowtype;
  v_buyer_wallet bigint;
  v_seller_wallet bigint;
  v_buyer_gold bigint;
  v_seller_gold bigint;
  v_buyer_profile_gold bigint;
  v_seller_profile_gold bigint;
  v_new_buyer_gold bigint;
  v_new_seller_gold bigint;
  v_gross bigint;
  v_fee bigint;
  v_payout bigint;
  v_tax jsonb;
  v_stack jsonb;
  v_delivery_id uuid;
  v_result jsonb;
begin
  if p_buyer_account_id is null or p_offer_id is null
    or p_buyer_expected_revision is null or p_buyer_expected_revision<0
    or p_seller_expected_revision is null or p_seller_expected_revision<0
    or p_expected_unit_price is null or p_expected_unit_price<1
    or p_expected_quantity is null or p_expected_quantity<1
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_market_purchase_request';end if;

  if not exists(select 1 from private.market_runtime_guard_v1
      where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;

  -- Initial offer lookup is only a lock-order hint. After both account locks,
  -- the exact offer identity and status are reloaded FOR UPDATE.
  select seller_account_id into v_seller_account_id
  from private.market_sale_offers_v3 where offer_id=p_offer_id;
  if not found then raise exception 'market_offer_not_found';end if;
  if p_buyer_account_id=v_seller_account_id
  then raise exception 'market_self_trade_denied';end if;

  -- Existing gameplay commits take a party-account advisory transaction lock.
  -- Strict UUID lexical order prevents A->B / B->A deadlocks for buyers/sellers.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'party-account:'||least(p_buyer_account_id::text,v_seller_account_id::text),0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'party-account:'||greatest(p_buyer_account_id::text,v_seller_account_id::text),0));

  select * into v_buyer from public.online_game_states
    where account_id=p_buyer_account_id for update;
  select * into v_seller from public.online_game_states
    where account_id=v_seller_account_id for update;
  if v_buyer.state is null or v_seller.state is null
  then raise exception 'market_account_state_missing';end if;

  select * into v_receipt from private.market_purchase_receipts_v3
    where buyer_account_id=p_buyer_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.request_hash<>p_request_hash
      or v_receipt.offer_id<>p_offer_id
    then raise exception 'market_idempotency_conflict';end if;
    return v_receipt.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;

  if v_buyer.revision<>p_buyer_expected_revision
    or v_seller.revision<>p_seller_expected_revision
  then raise exception 'market_stale_state';end if;

  select * into v_offer from private.market_sale_offers_v3
    where offer_id=p_offer_id for update;
  if not found or v_offer.status<>'active'
    or v_offer.seller_account_id<>v_seller_account_id
    or v_offer.unit_price<>p_expected_unit_price
    or v_offer.quantity<>p_expected_quantity
  then raise exception 'market_offer_not_available';end if;

  select * into v_hold from private.market_custody_holds_v1
    where hold_id=v_offer.source_hold_id and owner_account_id=v_seller_account_id
    for update;
  if not found or v_hold.status<>'held' or v_hold.expires_at<=now()
    or v_hold.held_quantity<>v_offer.quantity
  then raise exception 'market_hold_not_available';end if;
  select * into v_asset from private.market_custody_assets_v1
    where asset_id=v_hold.asset_id and owner_account_id=v_seller_account_id
    for update;
  if not found or v_asset.verification_state<>'verified'
    or v_asset.source_bound
    or v_asset.asset_kind not in ('resource','gem')
    or v_asset.exact_instance_id is not null
    or v_asset.quantity<>v_offer.quantity
    or v_asset.held_quantity<>v_offer.quantity
  then raise exception 'market_asset_not_eligible';end if;

  if not exists(select 1 from private.market_item_policy_v1
    where item_id=v_asset.item_id and asset_kind=v_asset.asset_kind
      and tradable and binding_policy='unbound')
  then raise exception 'market_item_not_verified';end if;

  v_stack:=v_asset.immutable_attributes->'stack';
  if pg_catalog.jsonb_typeof(v_stack) is distinct from 'object'
    or v_stack->>'itemId' is distinct from v_asset.item_id
    or exists(select 1 from pg_catalog.jsonb_object_keys(v_stack) as k(key)
       where k.key not in ('itemId','quantity'))
  then raise exception 'market_purchase_payload_invalid';end if;
  v_stack:=pg_catalog.jsonb_set(v_stack,'{quantity}',
    pg_catalog.to_jsonb(v_offer.quantity),true);

  -- Reconcile buyer/seller Gold across all THREE authoritative surfaces:
  -- current game snapshot, relational wallet and characters projection.
  -- Stale, missing, wrong-owner, malformed, or out-of-safe-integer accounts
  -- fail closed. No implicit wallet creation or trust in client Gold.
  if v_buyer.character_id is null or v_seller.character_id is null
    or v_buyer.state#>>'{character,id}' is distinct from v_buyer.character_id::text
    or v_seller.state#>>'{character,id}' is distinct from v_seller.character_id::text
    or pg_catalog.jsonb_typeof(v_buyer.state#>'{character,gold}') is distinct from 'number'
    or pg_catalog.jsonb_typeof(v_seller.state#>'{character,gold}') is distinct from 'number'
    or coalesce(v_buyer.state#>>'{character,gold}','') !~ '^[0-9]{1,16}$'
    or coalesce(v_seller.state#>>'{character,gold}','') !~ '^[0-9]{1,16}$'
  then raise exception 'market_wallet_identity_unverified';end if;
  v_buyer_gold:=(v_buyer.state#>>'{character,gold}')::bigint;
  v_seller_gold:=(v_seller.state#>>'{character,gold}')::bigint;

  select gold into v_buyer_wallet from public.character_wallets
    where character_id=v_buyer.character_id for update;
  if not found then raise exception 'market_buyer_wallet_missing';end if;
  select gold into v_seller_wallet from public.character_wallets
    where character_id=v_seller.character_id for update;
  if not found then raise exception 'market_seller_wallet_missing';end if;
  select gold into v_buyer_profile_gold from public.characters
    where id=v_buyer.character_id and account_id=p_buyer_account_id for update;
  if not found then raise exception 'market_buyer_character_not_owned';end if;
  select gold into v_seller_profile_gold from public.characters
    where id=v_seller.character_id and account_id=v_seller_account_id for update;
  if not found then raise exception 'market_seller_character_not_owned';end if;

  if v_buyer_gold is distinct from v_buyer_wallet
    or v_buyer_gold is distinct from v_buyer_profile_gold
    or v_seller_gold is distinct from v_seller_wallet
    or v_seller_gold is distinct from v_seller_profile_gold
    or v_buyer_gold>9007199254740991
    or v_seller_gold>9007199254740991
  then raise exception 'market_wallet_not_reconciled';end if;

  if v_offer.unit_price::numeric*v_offer.quantity::numeric>1000000000000000
  then raise exception 'market_purchase_exceeds_limit';end if;
  -- Before touching either wallet, reject stale/unapproved item bands,
  -- quantities and ambiguous settlement pricing.
  if not private.market_offer_price_valid_v10(
       v_asset.item_id,v_asset.asset_kind,v_asset.immutable_attributes,v_offer.unit_price)
    or not private.market_listing_lot_valid_v11(
       v_asset.item_id,v_asset.asset_kind,v_offer.quantity)
  then raise exception 'market_settlement_policy_changed';end if;
  v_gross:=(v_offer.unit_price::numeric*v_offer.quantity::numeric)::bigint;
  v_tax:=private.market_sale_tax_quote_v11(v_gross);
  if v_tax->>'valid' is distinct from 'true'
  then raise exception 'market_tax_quote_invalid';end if;
  v_fee:=(v_tax->>'feeGold')::bigint;
  v_payout:=(v_tax->>'sellerGold')::bigint;
  if v_gross is distinct from v_fee+v_payout or v_fee<1 or v_payout<1
  then raise exception 'market_gold_conservation_failed';end if;
  if v_buyer_gold<v_gross
  then raise exception 'market_insufficient_gold';end if;
  if v_seller_gold>9007199254740991-v_payout
  then raise exception 'market_seller_gold_overflow';end if;
  v_new_buyer_gold:=v_buyer_gold-v_gross;
  v_new_seller_gold:=v_seller_gold+v_payout;

  -- Gold conservation: buyer -gross, seller +net, fee destroyed. The
  -- durable settlement ledger records gross=fee+net atomically.
  insert into private.market_gold_intents_v2(
    source_hold_id,buyer_account_id,seller_account_id,buyer_character_id,
    unit_price,quantity,gross_gold,fee_gold,seller_payout_gold,status
  ) values(
    v_hold.hold_id,p_buyer_account_id,v_seller_account_id,v_buyer.character_id,
    v_offer.unit_price,v_offer.quantity,v_gross,v_fee,v_payout,'settled'
  );

  -- Delivery ownership is durable BEFORE the seller gets paid. All rows and
  -- Gold changes roll back together on any error.
  insert into private.market_purchase_deliveries_v3(
    source_hold_id,buyer_account_id,seller_account_id,item_id,asset_kind,
    quantity,stack_payload
  ) values(
    v_hold.hold_id,p_buyer_account_id,v_seller_account_id,
    v_asset.item_id,v_asset.asset_kind,v_offer.quantity,v_stack
  ) returning delivery_id into v_delivery_id;

  update public.character_wallets
    set gold=v_new_buyer_gold,updated_at=now()
    where character_id=v_buyer.character_id and gold=v_buyer_gold;
  if not found then raise exception 'market_buyer_wallet_changed';end if;
  update public.character_wallets
    set gold=v_new_seller_gold,updated_at=now()
    where character_id=v_seller.character_id and gold=v_seller_gold;
  if not found then raise exception 'market_seller_wallet_changed';end if;
  update public.characters
    set gold=v_new_buyer_gold,updated_at=now()
    where id=v_buyer.character_id and account_id=p_buyer_account_id;
  update public.characters
    set gold=v_new_seller_gold,updated_at=now()
    where id=v_seller.character_id and account_id=v_seller_account_id;

  update public.online_game_states set
    state=pg_catalog.jsonb_set(v_buyer.state,'{character,gold}',
      pg_catalog.to_jsonb(v_new_buyer_gold),false),
    revision=v_buyer.revision+1,updated_at=now()
    where account_id=p_buyer_account_id and revision=v_buyer.revision;
  if not found then raise exception 'market_buyer_state_changed';end if;
  update public.online_game_states set
    state=pg_catalog.jsonb_set(v_seller.state,'{character,gold}',
      pg_catalog.to_jsonb(v_new_seller_gold),false),
    revision=v_seller.revision+1,updated_at=now()
    where account_id=v_seller_account_id and revision=v_seller.revision;
  if not found then raise exception 'market_seller_state_changed';end if;

  update private.market_custody_holds_v1
    set status='settled',closed_at=now()
    where hold_id=v_hold.hold_id and status='held';
  if not found then raise exception 'market_hold_not_available';end if;
  update private.market_custody_assets_v1
    set held_quantity=0,updated_at=now()
    where asset_id=v_asset.asset_id and held_quantity=v_offer.quantity;
  if not found then raise exception 'market_asset_not_eligible';end if;
  update private.market_sale_offers_v3
    set status='sold',sold_at=now()
    where offer_id=v_offer.offer_id and status='active';
  if not found then raise exception 'market_offer_not_available';end if;

  v_result:=pg_catalog.jsonb_build_object(
    'offerId',v_offer.offer_id,'deliveryId',v_delivery_id,
    'buyerAccountId',p_buyer_account_id,'sellerAccountId',v_seller_account_id,
    'quantity',v_offer.quantity,'unitPrice',v_offer.unit_price,
    'goldSpent',v_gross,'sellerGoldReceived',v_payout,'feeGold',v_fee,'taxBasisPoints',500,
    'buyerRevision',v_buyer.revision+1,'sellerRevision',v_seller.revision+1,
    'itemStatus','pending_delivery','replayed',false);
  insert into private.market_purchase_receipts_v3(
    buyer_account_id,idempotency_key,request_hash,offer_id,result
  ) values(p_buyer_account_id,p_idempotency_key,p_request_hash,p_offer_id,v_result);

  return v_result;
end;
$market_purchase$;

create or replace function private.market_purchase_equipment_offer_v9(
  p_buyer_account_id uuid,
  p_offer_id uuid,
  p_expected_unit_price bigint,
  p_expected_quantity integer,
  p_buyer_expected_revision bigint,
  p_seller_expected_revision bigint,
  p_idempotency_key text,
  p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_purchase$
declare
  v_seller_account_id uuid;
  v_offer private.market_sale_offers_v3%rowtype;
  v_receipt private.market_purchase_receipts_v3%rowtype;
  v_hold private.market_custody_holds_v1%rowtype;
  v_asset private.market_custody_assets_v1%rowtype;
  v_gear private.market_equipment_escrows_v8%rowtype;
  v_buyer public.online_game_states%rowtype;
  v_seller public.online_game_states%rowtype;
  v_buyer_wallet bigint;
  v_seller_wallet bigint;
  v_buyer_gold bigint;
  v_seller_gold bigint;
  v_buyer_profile_gold bigint;
  v_seller_profile_gold bigint;
  v_new_buyer_gold bigint;
  v_new_seller_gold bigint;
  v_gross bigint;
  v_fee bigint;
  v_payout bigint;
  v_tax jsonb;
  v_stack jsonb;
  v_delivery_id uuid;
  v_result jsonb;
begin
  if p_buyer_account_id is null or p_offer_id is null
    or p_buyer_expected_revision is null or p_buyer_expected_revision<0
    or p_seller_expected_revision is null or p_seller_expected_revision<0
    or p_expected_unit_price is null or p_expected_unit_price<1
    or p_expected_quantity is null or p_expected_quantity<>1
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_market_purchase_request';end if;

  if not exists(select 1 from private.market_runtime_guard_v1
      where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;

  if not exists(select 1 from private.market_equipment_guard_v8 where singleton and equipment_transfers_enabled)
  then raise exception 'market_disabled';end if;

  -- Initial offer lookup is only a lock-order hint. After both account locks,
  -- the exact offer identity and status are reloaded FOR UPDATE.
  select seller_account_id into v_seller_account_id
  from private.market_sale_offers_v3 where offer_id=p_offer_id;
  if not found then raise exception 'market_offer_not_found';end if;
  if p_buyer_account_id=v_seller_account_id
  then raise exception 'market_self_trade_denied';end if;

  -- Existing gameplay commits take a party-account advisory transaction lock.
  -- Strict UUID lexical order prevents A->B / B->A deadlocks for buyers/sellers.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'party-account:'||least(p_buyer_account_id::text,v_seller_account_id::text),0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'party-account:'||greatest(p_buyer_account_id::text,v_seller_account_id::text),0));

  select * into v_buyer from public.online_game_states
    where account_id=p_buyer_account_id for update;
  select * into v_seller from public.online_game_states
    where account_id=v_seller_account_id for update;
  if v_buyer.state is null or v_seller.state is null
  then raise exception 'market_account_state_missing';end if;

  select * into v_receipt from private.market_purchase_receipts_v3
    where buyer_account_id=p_buyer_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.request_hash<>p_request_hash
      or v_receipt.offer_id<>p_offer_id
    then raise exception 'market_idempotency_conflict';end if;
    return v_receipt.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;

  if v_buyer.revision<>p_buyer_expected_revision
    or v_seller.revision<>p_seller_expected_revision
  then raise exception 'market_stale_state';end if;

  select * into v_offer from private.market_sale_offers_v3
    where offer_id=p_offer_id for update;
  if not found or v_offer.status<>'active'
    or v_offer.seller_account_id<>v_seller_account_id
    or v_offer.unit_price<>p_expected_unit_price
    or v_offer.quantity<>p_expected_quantity
  then raise exception 'market_offer_not_available';end if;

  select * into v_hold from private.market_custody_holds_v1
    where hold_id=v_offer.source_hold_id and owner_account_id=v_seller_account_id
    for update;
  if not found or v_hold.status<>'held' or v_hold.expires_at<=now()
    or v_hold.held_quantity<>v_offer.quantity
  then raise exception 'market_hold_not_available';end if;
  select * into v_asset from private.market_custody_assets_v1
    where asset_id=v_hold.asset_id and owner_account_id=v_seller_account_id
    for update;
  if not found or v_asset.verification_state<>'verified'
    or v_asset.source_bound
    or v_asset.asset_kind<>'equipment'
    or v_asset.exact_instance_id is null
    or v_asset.quantity<>v_offer.quantity
    or v_asset.held_quantity<>v_offer.quantity
  then raise exception 'market_asset_not_eligible';end if;

  if not exists(select 1 from private.market_item_policy_v1
    where item_id=v_asset.item_id and asset_kind=v_asset.asset_kind
      and tradable and binding_policy='unbound')
  then raise exception 'market_item_not_verified';end if;

  select * into v_gear from private.market_equipment_escrows_v8
    where source_hold_id=v_hold.hold_id and owner_account_id=v_seller_account_id
    for update;
  if not found or v_gear.status<>'held'
    or v_gear.asset_id<>v_asset.asset_id
    or v_gear.exact_instance_id<>v_asset.exact_instance_id
    or v_gear.item_id<>v_asset.item_id
    or v_gear.exact_receipt is distinct from v_asset.immutable_attributes->'exactReceipt'
    or v_offer.quantity<>1
  then raise exception 'market_equipment_custody_invalid';end if;
  v_stack:=v_asset.immutable_attributes->'stack';
  if pg_catalog.jsonb_typeof(v_stack) is distinct from 'object'
    or v_stack->>'itemId' is distinct from v_gear.item_id
    or v_stack->>'instanceId' is distinct from v_gear.exact_instance_id
    or v_stack->>'quantity' is distinct from '1'
    or exists(select 1 from pg_catalog.jsonb_object_keys(v_stack) k(key)
       where k.key not in ('itemId','quantity','instanceId'))
    or v_gear.exact_receipt->>'id' is distinct from v_gear.exact_instance_id
    or v_gear.exact_receipt->>'itemId' is distinct from v_gear.item_id
    or v_gear.exact_receipt->>'ownerCharacterId'
       is distinct from v_gear.original_owner_character_id
  then raise exception 'market_equipment_payload_invalid';end if;
  -- Do not take Gold if the buyer's account receipt ledger cannot hold
  -- the exact purchased copy, even when no duplicate instance ID exists.
  if pg_catalog.jsonb_typeof(v_buyer.state#>'{account,craftedGearInstances}')
       is distinct from 'array'
    or pg_catalog.jsonb_array_length(v_buyer.state#>'{account,craftedGearInstances}')>=500
  then raise exception 'market_equipment_buyer_ledger_unavailable';end if;
  -- Recheck every socket against the current curated policy at settlement;
  -- a policy revoked while an offer waits must halt the sale.
  if (v_gear.exact_receipt#>>'{enhancement,statGemId}' is not null
      and not exists(select 1 from private.market_item_policy_v1
        where item_id=v_gear.exact_receipt#>>'{enhancement,statGemId}'
          and asset_kind='gem' and tradable and binding_policy='unbound'))
    or (v_gear.exact_receipt#>>'{enhancement,effectGemId}' is not null
      and not exists(select 1 from private.market_item_policy_v1
        where item_id=v_gear.exact_receipt#>>'{enhancement,effectGemId}'
          and asset_kind='gem' and tradable and binding_policy='unbound'))
  then raise exception 'market_equipment_socket_policy_changed';end if;

  -- Reject known account-wide collisions before charging Gold.
  if pg_catalog.jsonb_path_exists(v_buyer.state,
        '$.**.stacks[*] ? (@.instanceId == $id)',
        pg_catalog.jsonb_build_object('id',v_gear.exact_instance_id))
    or pg_catalog.jsonb_path_exists(v_buyer.state,
        '$.**.equipmentInstanceIds.* ? (@ == $id)',
        pg_catalog.jsonb_build_object('id',v_gear.exact_instance_id))
    or exists(
      select 1 from pg_catalog.jsonb_array_elements(
        case when pg_catalog.jsonb_typeof(v_buyer.state#>'{account,craftedGearInstances}')='array'
          then v_buyer.state#>'{account,craftedGearInstances}'
          else '[]'::jsonb end) e(value)
      where e.value->>'id'=v_gear.exact_instance_id)
  then raise exception 'market_equipment_buyer_identity_collision';end if;

  -- Reconcile buyer/seller Gold across all THREE authoritative surfaces:
  -- current game snapshot, relational wallet and characters projection.
  -- Stale, missing, wrong-owner, malformed, or out-of-safe-integer accounts
  -- fail closed. No implicit wallet creation or trust in client Gold.
  if v_buyer.character_id is null or v_seller.character_id is null
    or v_buyer.state#>>'{character,id}' is distinct from v_buyer.character_id::text
    or v_seller.state#>>'{character,id}' is distinct from v_seller.character_id::text
    or pg_catalog.jsonb_typeof(v_buyer.state#>'{character,gold}') is distinct from 'number'
    or pg_catalog.jsonb_typeof(v_seller.state#>'{character,gold}') is distinct from 'number'
    or coalesce(v_buyer.state#>>'{character,gold}','') !~ '^[0-9]{1,16}$'
    or coalesce(v_seller.state#>>'{character,gold}','') !~ '^[0-9]{1,16}$'
  then raise exception 'market_wallet_identity_unverified';end if;
  v_buyer_gold:=(v_buyer.state#>>'{character,gold}')::bigint;
  v_seller_gold:=(v_seller.state#>>'{character,gold}')::bigint;

  select gold into v_buyer_wallet from public.character_wallets
    where character_id=v_buyer.character_id for update;
  if not found then raise exception 'market_buyer_wallet_missing';end if;
  select gold into v_seller_wallet from public.character_wallets
    where character_id=v_seller.character_id for update;
  if not found then raise exception 'market_seller_wallet_missing';end if;
  select gold into v_buyer_profile_gold from public.characters
    where id=v_buyer.character_id and account_id=p_buyer_account_id for update;
  if not found then raise exception 'market_buyer_character_not_owned';end if;
  select gold into v_seller_profile_gold from public.characters
    where id=v_seller.character_id and account_id=v_seller_account_id for update;
  if not found then raise exception 'market_seller_character_not_owned';end if;

  if v_buyer_gold is distinct from v_buyer_wallet
    or v_buyer_gold is distinct from v_buyer_profile_gold
    or v_seller_gold is distinct from v_seller_wallet
    or v_seller_gold is distinct from v_seller_profile_gold
    or v_buyer_gold>9007199254740991
    or v_seller_gold>9007199254740991
  then raise exception 'market_wallet_not_reconciled';end if;

  if v_offer.unit_price::numeric*v_offer.quantity::numeric>1000000000000000
  then raise exception 'market_purchase_exceeds_limit';end if;
  -- Before touching either wallet, reject stale/unapproved item bands,
  -- quantities and ambiguous settlement pricing.
  if not private.market_offer_price_valid_v10(
       v_asset.item_id,v_asset.asset_kind,v_asset.immutable_attributes,v_offer.unit_price)
    or not private.market_listing_lot_valid_v11(
       v_asset.item_id,v_asset.asset_kind,v_offer.quantity)
  then raise exception 'market_settlement_policy_changed';end if;
  v_gross:=(v_offer.unit_price::numeric*v_offer.quantity::numeric)::bigint;
  v_tax:=private.market_sale_tax_quote_v11(v_gross);
  if v_tax->>'valid' is distinct from 'true'
  then raise exception 'market_tax_quote_invalid';end if;
  v_fee:=(v_tax->>'feeGold')::bigint;
  v_payout:=(v_tax->>'sellerGold')::bigint;
  if v_gross is distinct from v_fee+v_payout or v_fee<1 or v_payout<1
  then raise exception 'market_gold_conservation_failed';end if;
  if v_buyer_gold<v_gross
  then raise exception 'market_insufficient_gold';end if;
  if v_seller_gold>9007199254740991-v_payout
  then raise exception 'market_seller_gold_overflow';end if;
  v_new_buyer_gold:=v_buyer_gold-v_gross;
  v_new_seller_gold:=v_seller_gold+v_payout;

  -- Gold conservation: buyer -gross, seller +net, fee destroyed. The
  -- durable settlement ledger records gross=fee+net atomically.
  insert into private.market_gold_intents_v2(
    source_hold_id,buyer_account_id,seller_account_id,buyer_character_id,
    unit_price,quantity,gross_gold,fee_gold,seller_payout_gold,status
  ) values(
    v_hold.hold_id,p_buyer_account_id,v_seller_account_id,v_buyer.character_id,
    v_offer.unit_price,v_offer.quantity,v_gross,v_fee,v_payout,'settled'
  );

  -- Delivery ownership is durable BEFORE the seller gets paid. All rows and
  -- Gold changes roll back together on any error.
  insert into private.market_equipment_purchase_deliveries_v9(
    source_hold_id,buyer_account_id,seller_account_id,
    exact_instance_id,item_id,stack_payload,receipt_payload
  ) values(
    v_hold.hold_id,p_buyer_account_id,v_seller_account_id,
    v_gear.exact_instance_id,v_gear.item_id,v_stack,v_gear.exact_receipt
  ) returning delivery_id into v_delivery_id;

  update public.character_wallets
    set gold=v_new_buyer_gold,updated_at=now()
    where character_id=v_buyer.character_id and gold=v_buyer_gold;
  if not found then raise exception 'market_buyer_wallet_changed';end if;
  update public.character_wallets
    set gold=v_new_seller_gold,updated_at=now()
    where character_id=v_seller.character_id and gold=v_seller_gold;
  if not found then raise exception 'market_seller_wallet_changed';end if;
  update public.characters
    set gold=v_new_buyer_gold,updated_at=now()
    where id=v_buyer.character_id and account_id=p_buyer_account_id;
  update public.characters
    set gold=v_new_seller_gold,updated_at=now()
    where id=v_seller.character_id and account_id=v_seller_account_id;

  update public.online_game_states set
    state=pg_catalog.jsonb_set(v_buyer.state,'{character,gold}',
      pg_catalog.to_jsonb(v_new_buyer_gold),false),
    revision=v_buyer.revision+1,updated_at=now()
    where account_id=p_buyer_account_id and revision=v_buyer.revision;
  if not found then raise exception 'market_buyer_state_changed';end if;
  update public.online_game_states set
    state=pg_catalog.jsonb_set(v_seller.state,'{character,gold}',
      pg_catalog.to_jsonb(v_new_seller_gold),false),
    revision=v_seller.revision+1,updated_at=now()
    where account_id=v_seller_account_id and revision=v_seller.revision;
  if not found then raise exception 'market_seller_state_changed';end if;

  update private.market_custody_holds_v1
    set status='settled',closed_at=now()
    where hold_id=v_hold.hold_id and status='held';
  if not found then raise exception 'market_hold_not_available';end if;
  update private.market_custody_assets_v1
    set held_quantity=0,updated_at=now()
    where asset_id=v_asset.asset_id and held_quantity=v_offer.quantity;
  if not found then raise exception 'market_asset_not_eligible';end if;
  update private.market_equipment_escrows_v8
    set status='sold',closed_at=now()
    where source_hold_id=v_hold.hold_id and status='held';
  if not found then raise exception 'market_equipment_custody_invalid';end if;

  update private.market_sale_offers_v3
    set status='sold',sold_at=now()
    where offer_id=v_offer.offer_id and status='active';
  if not found then raise exception 'market_offer_not_available';end if;

  v_result:=pg_catalog.jsonb_build_object(
    'offerId',v_offer.offer_id,'deliveryId',v_delivery_id,
    'buyerAccountId',p_buyer_account_id,'sellerAccountId',v_seller_account_id,
    'quantity',v_offer.quantity,'unitPrice',v_offer.unit_price,
    'goldSpent',v_gross,'sellerGoldReceived',v_payout,'feeGold',v_fee,'taxBasisPoints',500,
    'buyerRevision',v_buyer.revision+1,'sellerRevision',v_seller.revision+1,
    'itemStatus','pending_equipment_delivery','instanceId',v_gear.exact_instance_id,'replayed',false);
  insert into private.market_purchase_receipts_v3(
    buyer_account_id,idempotency_key,request_hash,offer_id,result
  ) values(p_buyer_account_id,p_idempotency_key,p_request_hash,p_offer_id,v_result);

  return v_result;
end;
$market_purchase$;

revoke all on function private.market_purchase_stack_offer_v3(
  uuid,uuid,bigint,integer,bigint,bigint,text,text
) from public,anon,authenticated,service_role;
revoke all on function private.market_purchase_equipment_offer_v9(
  uuid,uuid,bigint,integer,bigint,bigint,text,text
) from public,anon,authenticated,service_role;
commit;
