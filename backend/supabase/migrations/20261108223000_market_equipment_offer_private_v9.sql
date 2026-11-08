-- Hidden equipment listing offer: one exact whole-copy escrow, no release.
begin;
create or replace function private.market_publish_equipment_offer_v9(
  p_seller_account_id uuid,p_hold_id uuid,p_unit_price bigint,
  p_expected_quantity integer,p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_publish$
declare
  v_hold private.market_custody_holds_v1%rowtype;
  v_asset private.market_custody_assets_v1%rowtype;
  v_gear private.market_equipment_escrows_v8%rowtype;
  v_receipt private.market_action_receipts_v2%rowtype;
  v_offer_id uuid;
  v_result jsonb;
begin
  if p_seller_account_id is null or p_hold_id is null
    or p_unit_price is null or p_unit_price<1
    or p_unit_price>1000000000000
    or p_expected_quantity is null or p_expected_quantity<>1
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
    or p_unit_price::numeric*p_expected_quantity::numeric>1000000000000000
  then raise exception 'invalid_market_offer_request';end if;

  if not exists(select 1 from private.market_runtime_guard_v1
      where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;

  if not exists(select 1 from private.market_equipment_guard_v8 where singleton and equipment_transfers_enabled)
  then raise exception 'market_disabled';end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_seller_account_id::text,0));
  select * into v_receipt from private.market_action_receipts_v2
    where owner_account_id=p_seller_account_id
      and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.action<>'publish_equipment_offer'
      or v_receipt.request_hash<>p_request_hash
    then raise exception 'market_idempotency_conflict';end if;
    return v_receipt.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;

  -- Lock the existing listing row first if it exists; immutable source-hold
  -- uniqueness rejects a new listing after cancellation/sale.
  select offer_id into v_offer_id from private.market_sale_offers_v3
    where source_hold_id=p_hold_id and seller_account_id=p_seller_account_id
    for update;
  if found then raise exception 'market_hold_already_listed';end if;

  select * into v_hold from private.market_custody_holds_v1
    where hold_id=p_hold_id and owner_account_id=p_seller_account_id
    for update;
  if not found then raise exception 'market_hold_not_owned';end if;
  if v_hold.status<>'held' or v_hold.expires_at<=now()
    or v_hold.held_quantity<>p_expected_quantity
  then raise exception 'market_hold_not_eligible';end if;

  select * into v_asset from private.market_custody_assets_v1
    where asset_id=v_hold.asset_id and owner_account_id=p_seller_account_id
    for update;
  if not found or v_asset.verification_state<>'verified'
    or v_asset.source_bound or v_asset.exact_instance_id is null
    or v_asset.asset_kind<>'equipment'
    or v_asset.held_quantity<>p_expected_quantity
    or v_asset.quantity<>p_expected_quantity
  then raise exception 'market_asset_not_eligible';end if;

  select * into v_gear from private.market_equipment_escrows_v8
    where source_hold_id=v_hold.hold_id and owner_account_id=p_seller_account_id
    for update;
  if not found or v_gear.status<>'held' or v_gear.asset_id<>v_asset.asset_id
    or v_gear.exact_instance_id<>v_asset.exact_instance_id
    or v_asset.immutable_attributes->'exactReceipt' is distinct from v_gear.exact_receipt
    or v_asset.immutable_attributes->'stack'->>'instanceId'
      is distinct from v_gear.exact_instance_id
  then raise exception 'market_equipment_escrow_not_verified';end if;

  if not exists(select 1 from private.market_item_policy_v1
      where item_id=v_asset.item_id and asset_kind=v_asset.asset_kind
        and tradable and binding_policy='unbound')
  then raise exception 'market_item_not_verified';end if;

  if (select count(*) from private.market_sale_offers_v3
      where seller_account_id=p_seller_account_id and status='active')>=20
  then raise exception 'market_seller_listing_cap';end if;

  insert into private.market_sale_offers_v3(
    source_hold_id,seller_account_id,unit_price,quantity,status
  ) values(
    v_hold.hold_id,p_seller_account_id,p_unit_price,p_expected_quantity,'active'
  ) returning offer_id into v_offer_id;

  v_result:=pg_catalog.jsonb_build_object(
    'offerId',v_offer_id,'holdId',v_hold.hold_id,
    'itemId',v_asset.item_id,'quantity',p_expected_quantity,'instanceId',v_gear.exact_instance_id,
    'unitPrice',p_unit_price,'expiresAt',v_hold.expires_at,
    'status','active','replayed',false);
  insert into private.market_action_receipts_v2(
    owner_account_id,idempotency_key,request_hash,action,result
  ) values(
    p_seller_account_id,p_idempotency_key,p_request_hash,'publish_equipment_offer',v_result
  );
  return v_result;
end;
$market_publish$;


revoke all on function private.market_publish_equipment_offer_v9(uuid,uuid,bigint,integer,text,text)
  from public,anon,authenticated,service_role;
commit;
