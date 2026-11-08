-- Hidden Market V5: seller offer lifecycle and cancel/purchase serialization.
-- NO user-visible Market, no public RPC/Edge route, no API EXECUTE grants.
-- Runtime + tradability checks remain hard-false in the earlier migrations.
-- This migration prevents ghost offers when escrow is cancelled/expired.
begin;

alter table private.market_action_receipts_v2
  drop constraint if exists market_action_receipt_action_v4;
alter table private.market_action_receipts_v2
  add constraint market_action_receipt_action_v5 check(
    action in ('reserve','cancel','expire','claim_return','claim_purchase',
      'publish_offer','cancel_offer')
  );

-- Only a verified escrow lot can be published. Maximum 20 simultaneous
-- listings; no partial fills or equipment trades in this iteration.
create or replace function private.market_publish_sale_offer_v5(
  p_seller_account_id uuid,p_hold_id uuid,p_unit_price bigint,
  p_expected_quantity integer,p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_publish$
declare
  v_hold private.market_custody_holds_v1%rowtype;
  v_asset private.market_custody_assets_v1%rowtype;
  v_receipt private.market_action_receipts_v2%rowtype;
  v_offer_id uuid;
  v_result jsonb;
begin
  if p_seller_account_id is null or p_hold_id is null
    or p_unit_price is null or p_unit_price<1
    or p_unit_price>1000000000000
    or p_expected_quantity is null or p_expected_quantity<1
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
    or p_unit_price::numeric*p_expected_quantity::numeric>1000000000000000
  then raise exception 'invalid_market_offer_request';end if;

  if not exists(select 1 from private.market_runtime_guard_v1
      where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_seller_account_id::text,0));
  select * into v_receipt from private.market_action_receipts_v2
    where owner_account_id=p_seller_account_id
      and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.action<>'publish_offer'
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
    or v_asset.source_bound or v_asset.exact_instance_id is not null
    or v_asset.asset_kind not in ('resource','gem')
    or v_asset.held_quantity<>p_expected_quantity
    or v_asset.quantity<>p_expected_quantity
  then raise exception 'market_asset_not_eligible';end if;

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
    'itemId',v_asset.item_id,'quantity',p_expected_quantity,
    'unitPrice',p_unit_price,'expiresAt',v_hold.expires_at,
    'status','active','replayed',false);
  insert into private.market_action_receipts_v2(
    owner_account_id,idempotency_key,request_hash,action,result
  ) values(
    p_seller_account_id,p_idempotency_key,p_request_hash,'publish_offer',v_result
  );
  return v_result;
end;
$market_publish$;

revoke all on function private.market_publish_sale_offer_v5(
  uuid,uuid,bigint,integer,text,text)
from public,anon,authenticated,service_role;

-- Replaced V2 helper: a direct cancellation can no longer abandon an active
-- listing; expiry safely changes active/draft offer status to cancelled.

create or replace function private.market_cancel_stack_hold_v2(
  p_account_id uuid,p_hold_id uuid,p_idempotency_key text,
  p_request_hash text,p_expiration boolean default false
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_cancel$
declare
  v_hold private.market_custody_holds_v1%rowtype;
  v_asset private.market_custody_assets_v1%rowtype;
  v_receipt private.market_action_receipts_v2%rowtype;
  v_delivery uuid;
  v_stack jsonb;
  v_result jsonb;
  v_action text;
  v_listing_status text;
begin
  if p_account_id is null or p_hold_id is null
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[a-zA-Z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
    or p_expiration is null
  then raise exception 'invalid_market_request';end if;

  -- Inert until a future audited migration unlocks both server-owned gates.
  if not exists(select 1 from private.market_runtime_guard_v1
    where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_account_id::text,0));

  v_action:=case when p_expiration then 'expire' else 'cancel' end;
  select * into v_receipt from private.market_action_receipts_v2
  where owner_account_id=p_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.action<>v_action or v_receipt.request_hash<>p_request_hash
    then raise exception 'market_idempotency_conflict';end if;
    return v_receipt.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;

  -- Hold lifecycle and offer lifecycle must close together. Buyers lock the
  -- offer before the hold; use the same order to avoid purchase/cancel races.
  select status into v_listing_status from private.market_sale_offers_v3
  where source_hold_id=p_hold_id and seller_account_id=p_account_id for update;
  if found and v_listing_status in ('active','draft') then
    if not p_expiration then
      raise exception 'market_active_listing_requires_cancel_offer';
    end if;
    -- Automatic expiry closes the offer before producing the return outbox
    -- row; all changes rollback together if any later step fails.
    update private.market_sale_offers_v3 set status='cancelled'
    where source_hold_id=p_hold_id and seller_account_id=p_account_id
      and status in ('active','draft');
    if not found then raise exception 'market_offer_changed';end if;
  end if;

  select * into v_hold from private.market_custody_holds_v1
  where hold_id=p_hold_id and owner_account_id=p_account_id for update;
  if not found then raise exception 'market_hold_not_owned';end if;
  if v_hold.status<>'held' then raise exception 'market_hold_not_open';end if;
  if p_expiration and v_hold.expires_at>now()
  then raise exception 'market_hold_not_due';end if;

  select * into v_asset from private.market_custody_assets_v1
  where asset_id=v_hold.asset_id and owner_account_id=p_account_id for update;
  if not found or v_asset.verification_state<>'verified'
    or v_asset.asset_kind not in ('resource','gem')
    or v_asset.held_quantity<>v_hold.held_quantity
    or v_asset.quantity<>v_hold.held_quantity
    or v_asset.source_bound
  then raise exception 'market_hold_asset_mismatch';end if;
  v_stack:=v_asset.immutable_attributes->'stack';
  if pg_catalog.jsonb_typeof(v_stack) is distinct from 'object'
    or v_stack->>'itemId' is distinct from v_asset.item_id
    or (v_stack ? 'instanceId')
  then raise exception 'market_return_payload_invalid';end if;

  -- The hold can close only if exactly one durable return entitlement is
  -- inserted. All statements are atomic in one transaction.
  v_stack:=pg_catalog.jsonb_set(v_stack,'{quantity}',
    pg_catalog.to_jsonb(v_hold.held_quantity::integer),true);
  insert into private.market_return_deliveries_v2(
    source_hold_id,recipient_account_id,item_id,asset_kind,quantity,stack_payload
  ) values(
    v_hold.hold_id,p_account_id,v_asset.item_id,
    v_asset.asset_kind,v_hold.held_quantity,v_stack
  ) returning delivery_id into v_delivery;

  update private.market_custody_holds_v1
  set status='released',closed_at=now()
  where hold_id=v_hold.hold_id and status='held';
  if not found then raise exception 'market_hold_not_open';end if;

  update private.market_custody_assets_v1
  set held_quantity=0,updated_at=now()
  where asset_id=v_asset.asset_id and held_quantity=v_hold.held_quantity;
  if not found then raise exception 'market_hold_asset_mismatch';end if;

  v_result:=pg_catalog.jsonb_build_object(
    'holdId',v_hold.hold_id,
    'deliveryId',v_delivery,
    'itemId',v_asset.item_id,
    'quantity',v_hold.held_quantity,
    'status','pending_return',
    'replayed',false);
  insert into private.market_action_receipts_v2(
    owner_account_id,idempotency_key,request_hash,action,result)
  values(p_account_id,p_idempotency_key,p_request_hash,v_action,v_result);
  return v_result;
end;
$market_cancel$;

revoke all on function private.market_cancel_stack_hold_v2(
  uuid,uuid,text,text,boolean
) from public,anon,authenticated,service_role;


create or replace function private.market_cancel_sale_offer_v5(
  p_seller_account_id uuid,p_offer_id uuid,
  p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_cancel_offer$
declare
  v_offer private.market_sale_offers_v3%rowtype;
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_seller_account_id::text,0));
  select * into v_receipt from private.market_action_receipts_v2
    where owner_account_id=p_seller_account_id
      and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.action<>'cancel_offer' or v_receipt.request_hash<>p_request_hash
    then raise exception 'market_idempotency_conflict';end if;
    return v_receipt.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;

  select * into v_offer from private.market_sale_offers_v3
    where offer_id=p_offer_id and seller_account_id=p_seller_account_id
    for update;
  if not found then raise exception 'market_offer_not_owned';end if;
  if v_offer.status not in ('draft','active')
  then raise exception 'market_offer_not_cancelable';end if;

  -- The hold is released only after its offer is marked cancelled. Both the
  -- delivery entitlement and offer transition are one PostgreSQL transaction.
  update private.market_sale_offers_v3
    set status='cancelled'
    where offer_id=v_offer.offer_id and status in ('draft','active');
  if not found then raise exception 'market_offer_changed';end if;

  v_return:=private.market_cancel_stack_hold_v2(
    p_seller_account_id,v_offer.source_hold_id,
    'offer_cancel_'||pg_catalog.replace(p_offer_id::text,'-',''),
    p_request_hash,false
  );

  v_result:=pg_catalog.jsonb_build_object(
    'offerId',p_offer_id,'returnDeliveryId',v_return->>'deliveryId',
    'itemId',v_return->>'itemId','quantity',v_return->'quantity',
    'status','pending_return','replayed',false);
  insert into private.market_action_receipts_v2(
    owner_account_id,idempotency_key,request_hash,action,result
  ) values(
    p_seller_account_id,p_idempotency_key,p_request_hash,'cancel_offer',v_result
  );
  return v_result;
end;
$market_cancel_offer$;

revoke all on function private.market_cancel_sale_offer_v5(
  uuid,uuid,text,text)
from public,anon,authenticated,service_role;

-- Seller-facing read-model is PRIVATE until authenticated RPCs are reviewed.
-- No client can enumerate another seller's holdings.
create or replace function private.market_seller_offers_snapshot_v5(
  p_seller_account_id uuid,p_history boolean default false,p_offset integer default 0
) returns jsonb
language plpgsql stable security invoker set search_path=''
as $market_seller_offers$
declare
  v_snapshot jsonb;
begin
  if p_seller_account_id is null or p_history is null
    or p_offset is null or p_offset<0 or p_offset>10000
  then raise exception 'invalid_market_seller_query';end if;
  if not exists(select 1 from private.market_runtime_guard_v1
      where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;
  with offers as (
    select o.offer_id as id,o.status,a.item_id as "itemId",
      a.asset_kind as "assetKind",o.quantity,o.unit_price as "unitPrice",
      o.created_at as "createdAt",o.sold_at as "soldAt",
      h.expires_at as "expiresAt",
      case when o.status='active' and h.expires_at<=now()
        then 'expired' else o.status end as "displayStatus"
    from private.market_sale_offers_v3 o
    join private.market_custody_holds_v1 h on h.hold_id=o.source_hold_id
      and h.owner_account_id=o.seller_account_id
    join private.market_custody_assets_v1 a on a.asset_id=h.asset_id
      and a.owner_account_id=o.seller_account_id
    where o.seller_account_id=p_seller_account_id
  ), scoped as (
    select * from offers where
      (status in ('sold','cancelled'))=p_history
  ), page as (
    select * from scoped order by "createdAt" desc,id limit 30 offset p_offset
  )
  select pg_catalog.jsonb_build_object(
    'entries',coalesce((
       select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p)
        order by p."createdAt" desc,p.id) from page p),'[]'::jsonb),
    'activeCount',(select count(*) from offers
       where status='active' and "expiresAt">now()),
    'total',(select count(*) from scoped)
  ) into v_snapshot;
  return v_snapshot;
end;
$market_seller_offers$;

revoke all on function private.market_seller_offers_snapshot_v5(
  uuid,boolean,integer)
from public,anon,authenticated,service_role;

commit;
