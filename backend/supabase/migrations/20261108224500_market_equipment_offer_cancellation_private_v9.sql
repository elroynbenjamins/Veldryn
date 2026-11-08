-- Hidden V9 equipment-offer cancellation: no stranded seller escrow.
-- The listed hold may be returned only after its offer has closed.
begin;
create or replace function private.market_cancel_exact_equipment_v8(
  p_account_id uuid,p_hold_id uuid,p_idempotency_key text,p_request_hash text,
  p_expiration boolean default false
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_gear_cancel$
declare
  v_hold private.market_custody_holds_v1%rowtype;
  v_asset private.market_custody_assets_v1%rowtype;
  v_gear private.market_equipment_escrows_v8%rowtype;
  v_action private.market_action_receipts_v2%rowtype;
  v_delivery_id uuid;
  v_result jsonb;
  v_action_name text;
  v_stack jsonb;
begin
  if p_account_id is null or p_hold_id is null
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
    or p_expiration is null
  then raise exception 'market_equipment_invalid_cancel';end if;
  if not exists(select 1 from private.market_runtime_guard_v1
       where singleton and trading_enabled and snapshot_bridge_ready)
    or not exists(select 1 from private.market_equipment_guard_v8
       where singleton and equipment_transfers_enabled)
  then raise exception 'market_disabled';end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_account_id::text,0));
  v_action_name:='cancel_equipment';
  select * into v_action from private.market_action_receipts_v2
    where owner_account_id=p_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_action.action<>v_action_name
      or v_action.request_hash<>p_request_hash
      or v_action.result->>'holdId' is distinct from p_hold_id::text
      or v_action.result->>'expired' is distinct from p_expiration::text
    then raise exception 'market_idempotency_conflict';end if;
    return v_action.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;

  -- V5 published offers remain resource/gem-only. If any future listing row
  -- points to this gear, fail closed until the offer lifecycle is integrated.
  if exists(select 1 from private.market_sale_offers_v3
     where source_hold_id=p_hold_id and status in ('draft','active','sold'))
  then raise exception 'market_equipment_listing_lifecycle_not_ready';end if;

  select * into v_hold from private.market_custody_holds_v1
    where hold_id=p_hold_id and owner_account_id=p_account_id for update;
  if not found then raise exception 'market_equipment_hold_not_owned';end if;
  if v_hold.status<>'held' or v_hold.held_quantity<>1
    or (p_expiration and v_hold.expires_at>now())
  then raise exception 'market_equipment_hold_not_open';end if;

  select * into v_gear from private.market_equipment_escrows_v8
    where source_hold_id=p_hold_id and owner_account_id=p_account_id for update;
  if not found or v_gear.status<>'held'
  then raise exception 'market_equipment_custody_missing';end if;

  select * into v_asset from private.market_custody_assets_v1
    where asset_id=v_hold.asset_id and owner_account_id=p_account_id for update;
  if not found or v_asset.asset_id<>v_gear.asset_id
    or v_asset.held_quantity<>1 or v_asset.quantity<>1
    or v_asset.asset_kind<>'equipment' or v_asset.source_bound
    or v_asset.verification_state<>'verified'
    or v_asset.exact_instance_id is distinct from v_gear.exact_instance_id
    or v_asset.item_id is distinct from v_gear.item_id
    or v_asset.immutable_attributes->'exactReceipt' is distinct from v_gear.exact_receipt
  then raise exception 'market_equipment_escrow_identity_mismatch';end if;
  v_stack:=v_asset.immutable_attributes->'stack';
  if pg_catalog.jsonb_typeof(v_stack)<>'object'
    or v_stack->>'itemId' is distinct from v_gear.item_id
    or v_stack->>'instanceId' is distinct from v_gear.exact_instance_id
    or v_stack->>'quantity' is distinct from '1'
  then raise exception 'market_equipment_escrow_payload_unverified';end if;

  insert into private.market_equipment_return_deliveries_v8(
    source_hold_id,recipient_account_id,exact_instance_id,item_id,
    stack_payload,receipt_payload
  ) values(
    p_hold_id,p_account_id,v_gear.exact_instance_id,v_gear.item_id,
    v_stack,v_gear.exact_receipt
  ) returning delivery_id into v_delivery_id;
  update private.market_custody_holds_v1
    set status='released',closed_at=now()
    where hold_id=p_hold_id and status='held';
  if not found then raise exception 'market_equipment_hold_not_open';end if;
  update private.market_custody_assets_v1
    set held_quantity=0,updated_at=now()
    where asset_id=v_asset.asset_id and held_quantity=1;
  if not found then raise exception 'market_equipment_escrow_identity_mismatch';end if;
  update private.market_equipment_escrows_v8
    set status='returned',closed_at=now()
    where source_hold_id=p_hold_id and status='held';
  if not found then raise exception 'market_equipment_custody_missing';end if;

  v_result:=pg_catalog.jsonb_build_object(
    'holdId',p_hold_id,'deliveryId',v_delivery_id,
    'instanceId',v_gear.exact_instance_id,'itemId',v_gear.item_id,
    'expired',p_expiration,'status','pending_return','replayed',false);
  insert into private.market_action_receipts_v2(
    owner_account_id,idempotency_key,request_hash,action,result
  ) values(p_account_id,p_idempotency_key,p_request_hash,v_action_name,v_result);
  return v_result;
end;
$market_gear_cancel$;

revoke all on function private.market_cancel_exact_equipment_v8(
 uuid,uuid,text,text,boolean)
 from public,anon,authenticated,service_role;

create or replace function private.market_cancel_equipment_offer_v9(
  p_seller_account_id uuid,p_offer_id uuid,
  p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_cancel_offer$
declare
  v_offer private.market_sale_offers_v3%rowtype;
  v_gear private.market_equipment_escrows_v8%rowtype;
  v_receipt private.market_action_receipts_v2%rowtype;
  v_return jsonb;
  v_result jsonb;
begin
  if p_seller_account_id is null or p_offer_id is null
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_market_cancel_offer_request';end if;

  if not exists(select 1 from private.market_runtime_guard_v1
    where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;

  if not exists(select 1 from private.market_equipment_guard_v8
     where singleton and equipment_transfers_enabled)
  then raise exception 'market_disabled';end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_seller_account_id::text,0));
  select * into v_receipt from private.market_action_receipts_v2
    where owner_account_id=p_seller_account_id
      and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.action<>'cancel_equipment_offer' or v_receipt.request_hash<>p_request_hash
    then raise exception 'market_idempotency_conflict';end if;
    return v_receipt.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;

  select * into v_offer from private.market_sale_offers_v3
    where offer_id=p_offer_id and seller_account_id=p_seller_account_id
    for update;
  if not found then raise exception 'market_offer_not_owned';end if;
  if v_offer.status not in ('draft','active')
  then raise exception 'market_offer_not_cancelable';end if;

  select * into v_gear from private.market_equipment_escrows_v8
    where source_hold_id=v_offer.source_hold_id
      and owner_account_id=p_seller_account_id for update;
  if not found or v_gear.status<>'held'
  then raise exception 'market_equipment_offer_custody_invalid';end if;

  -- The hold is released only after its offer is marked cancelled. Both the
  -- delivery entitlement and offer transition are one PostgreSQL transaction.
  update private.market_sale_offers_v3
    set status='cancelled'
    where offer_id=v_offer.offer_id and status in ('draft','active');
  if not found then raise exception 'market_offer_changed';end if;

  v_return:=private.market_cancel_exact_equipment_v8(
    p_seller_account_id,v_offer.source_hold_id,
    'offer_cancel_'||pg_catalog.replace(p_offer_id::text,'-',''),
    p_request_hash,false
  );

  v_result:=pg_catalog.jsonb_build_object(
    'offerId',p_offer_id,'returnDeliveryId',v_return->>'deliveryId',
    'itemId',v_return->>'itemId','instanceId',v_return->>'instanceId',
    'status','pending_return','replayed',false);
  insert into private.market_action_receipts_v2(
    owner_account_id,idempotency_key,request_hash,action,result
  ) values(
    p_seller_account_id,p_idempotency_key,p_request_hash,'cancel_equipment_offer',v_result
  );
  return v_result;
end;
$market_cancel_offer$;

revoke all on function private.market_cancel_equipment_offer_v9(
 uuid,uuid,text,text)
 from public,anon,authenticated,service_role;
commit;
