-- Hidden Player Market V17: account-owned bulk resource listings and partial fills.
-- Existing V5 seller limits (20 per ACCOUNT), V2 seven-day held-lot expiry,
-- V5 expiry/return outbox and V4 capacity-aware claim remain authoritative.
-- Release gates remain CHECK FALSE. No public/anon/authenticated/service_role
-- execute grants, routes, UI or market policy approvals are introduced.
--
-- Rather than weaken V3/V11/V13 whole-lot Gold, delivery and sale-history
-- invariants, each partial purchase atomically carves a verifiable child lot
-- from an already escrowed resource offer, immediately settles that child
-- through the audited whole-lot purchase path, and leaves the remainder
-- listed under the ORIGINAL offer and ORIGINAL seven-day expiry.
begin;

create table if not exists private.market_partial_fills_v17 (
  buyer_account_id uuid not null references public.online_game_states(account_id)
    on delete restrict,
  idempotency_key text not null check(idempotency_key ~ '^[A-Za-z0-9_-]{8,128}$'),
  request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
  source_offer_id uuid not null references private.market_sale_offers_v3(offer_id)
    on delete restrict,
  execution_offer_id uuid not null unique references private.market_sale_offers_v3(offer_id)
    on delete restrict,
  requested_quantity integer not null check(requested_quantity between 1 and 2147483647),
  expected_unit_price bigint not null check(expected_unit_price between 1 and 1000000000000),
  result jsonb not null check(pg_catalog.jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  primary key(buyer_account_id,idempotency_key)
);
create index if not exists market_partial_source_offer_v17
 on private.market_partial_fills_v17(source_offer_id,created_at);

-- Derived custody must be traceable to exactly one pre-existing escrow source.
-- No new inventory items are minted: parent decreases before child is inserted
-- and the child is SETTLED within the same transaction or everything rolls back.
create table if not exists private.market_partial_custody_lineage_v17 (
  child_offer_id uuid primary key references private.market_sale_offers_v3(offer_id)
    on delete restrict,
  child_hold_id uuid not null unique references private.market_custody_holds_v1(hold_id)
    on delete restrict,
  child_asset_id uuid not null unique references private.market_custody_assets_v1(asset_id)
    on delete restrict,
  source_offer_id uuid not null references private.market_sale_offers_v3(offer_id)
    on delete restrict,
  source_hold_id uuid not null references private.market_custody_holds_v1(hold_id)
    on delete restrict,
  source_asset_id uuid not null references private.market_custody_assets_v1(asset_id)
    on delete restrict,
  seller_account_id uuid not null references public.online_game_states(account_id)
    on delete restrict,
  quantity integer not null check(quantity between 1 and 2147483647),
  created_at timestamptz not null default now(),
  check(child_offer_id<>source_offer_id and child_hold_id<>source_hold_id
    and child_asset_id<>source_asset_id)
);

alter table private.market_partial_fills_v17 enable row level security;
alter table private.market_partial_custody_lineage_v17 enable row level security;
revoke all on table private.market_partial_fills_v17,
  private.market_partial_custody_lineage_v17
  from public,anon,authenticated,service_role;

create or replace function private.market_purchase_resource_quantity_v17(
  p_buyer_account_id uuid,
  p_source_offer_id uuid,
  p_expected_unit_price bigint,
  p_requested_quantity integer,
  p_buyer_expected_revision bigint,
  p_seller_expected_revision bigint,
  p_idempotency_key text,
  p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_partial_resource$
declare
  v_seller_account_id uuid;
  v_offer private.market_sale_offers_v3%rowtype;
  v_hold private.market_custody_holds_v1%rowtype;
  v_asset private.market_custody_assets_v1%rowtype;
  v_previous private.market_partial_fills_v17%rowtype;
  v_buyer public.online_game_states%rowtype;
  v_seller public.online_game_states%rowtype;
  v_execution_offer_id uuid;
  v_child_hold_id uuid;
  v_child_asset_id uuid;
  v_remaining integer;
  v_child_attributes jsonb;
  v_remaining_attributes jsonb;
  v_purchase jsonb;
  v_result jsonb;
begin
  if p_buyer_account_id is null or p_source_offer_id is null
    or p_expected_unit_price is null or p_expected_unit_price not between 1 and 1000000000000
    or p_requested_quantity is null or p_requested_quantity<1
    or p_buyer_expected_revision is null or p_buyer_expected_revision<0
    or p_seller_expected_revision is null or p_seller_expected_revision<0
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
    or p_requested_quantity::numeric*p_expected_unit_price::numeric>1000000000000000
  then raise exception 'invalid_market_partial_request';end if;

  if not exists(select 1 from private.market_runtime_guard_v1
    where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;

  -- Account ownership, never the selected character or a client-supplied
  -- social name, determines selling rights, self-trade checks and the 20
  -- listing allowance. Multi-character accounts are not extra traders.
  select seller_account_id into v_seller_account_id
    from private.market_sale_offers_v3 where offer_id=p_source_offer_id;
  if not found then raise exception 'market_offer_not_found';end if;
  if v_seller_account_id=p_buyer_account_id
  then raise exception 'market_self_trade_denied';end if;

  -- Match the V3/11 purchase lock order before checking or splitting lots.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'party-account:'||least(p_buyer_account_id::text,v_seller_account_id::text),0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'party-account:'||greatest(p_buyer_account_id::text,v_seller_account_id::text),0));

  select * into v_previous from private.market_partial_fills_v17
    where buyer_account_id=p_buyer_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_previous.request_hash<>p_request_hash
      or v_previous.source_offer_id<>p_source_offer_id
      or v_previous.requested_quantity<>p_requested_quantity
      or v_previous.expected_unit_price<>p_expected_unit_price
    then raise exception 'market_idempotency_conflict';end if;
    return v_previous.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;

  select * into v_buyer from public.online_game_states
    where account_id=p_buyer_account_id for update;
  select * into v_seller from public.online_game_states
    where account_id=v_seller_account_id for update;
  if v_buyer.state is null or v_seller.state is null
  then raise exception 'market_account_state_missing';end if;
  if v_buyer.revision<>p_buyer_expected_revision
    or v_seller.revision<>p_seller_expected_revision
  then raise exception 'market_stale_state';end if;

  select * into v_offer from private.market_sale_offers_v3
    where offer_id=p_source_offer_id for update;
  if not found or v_offer.seller_account_id<>v_seller_account_id
    or v_offer.status<>'active'
    or v_offer.unit_price<>p_expected_unit_price
    or p_requested_quantity>v_offer.quantity
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
  if not found or v_asset.asset_kind<>'resource'
    or v_asset.exact_instance_id is not null or v_asset.source_bound
    or v_asset.verification_state<>'verified'
    or v_asset.held_quantity<>v_offer.quantity
    or v_asset.quantity<>v_offer.quantity
  then raise exception 'market_asset_not_eligible';end if;

  if not exists(select 1 from private.market_item_policy_v1
    where item_id=v_asset.item_id and asset_kind='resource'
      and tradable and binding_policy='unbound')
    or not private.market_offer_price_valid_v10(
      v_asset.item_id,'resource',v_asset.immutable_attributes,v_offer.unit_price)
  then raise exception 'market_settlement_policy_changed';end if;

  v_remaining:=v_offer.quantity-p_requested_quantity;
  -- Never strand an unbuyable remainder below the configured minimum lot.
  if not private.market_listing_lot_valid_v11(
      v_asset.item_id,'resource',p_requested_quantity)
    or (v_remaining>0 and not private.market_listing_lot_valid_v11(
      v_asset.item_id,'resource',v_remaining))
  then raise exception 'market_partial_lot_not_approved';end if;

  if pg_catalog.jsonb_typeof(v_asset.immutable_attributes->'stack')<>'object'
    or v_asset.immutable_attributes#>>'{stack,itemId}' is distinct from v_asset.item_id
    or exists(select 1 from pg_catalog.jsonb_object_keys(
        v_asset.immutable_attributes->'stack') as k(key)
        where k.key not in ('itemId','quantity'))
  then raise exception 'market_partial_payload_unverified';end if;

  v_execution_offer_id:=v_offer.offer_id;
  if v_remaining>0 then
    v_child_asset_id:=pg_catalog.gen_random_uuid();
    v_child_hold_id:=pg_catalog.gen_random_uuid();
    v_child_attributes:=pg_catalog.jsonb_set(v_asset.immutable_attributes,
      '{stack,quantity}',pg_catalog.to_jsonb(p_requested_quantity),true);
    v_remaining_attributes:=pg_catalog.jsonb_set(v_asset.immutable_attributes,
      '{stack,quantity}',pg_catalog.to_jsonb(v_remaining),true);

    -- Under the seller account advisory + escrow row locks. The original
    -- virtual asset loses EXACTLY what the derived purchase receives.
    update private.market_custody_assets_v1
      set quantity=v_remaining,held_quantity=v_remaining,
        immutable_attributes=v_remaining_attributes,updated_at=now()
      where asset_id=v_asset.asset_id and owner_account_id=v_seller_account_id
        and quantity=v_offer.quantity and held_quantity=v_offer.quantity;
    if not found then raise exception 'market_asset_changed';end if;
    update private.market_custody_holds_v1
      set held_quantity=v_remaining
      where hold_id=v_hold.hold_id and status='held'
        and held_quantity=v_offer.quantity;
    if not found then raise exception 'market_hold_changed';end if;
    update private.market_sale_offers_v3
      set quantity=v_remaining
      where offer_id=v_offer.offer_id and status='active'
        and quantity=v_offer.quantity;
    if not found then raise exception 'market_offer_changed';end if;

    -- This derived lot can never be reserved from the game snapshot again.
    -- Its origin is audited separately below, and it is settled immediately.
    insert into private.market_custody_assets_v1(
      asset_id,owner_account_id,source_revision,source_location,
      source_character_id,source_locator,item_id,asset_kind,
      quantity,held_quantity,source_bound,verification_state,immutable_attributes
    ) values (
      v_child_asset_id,v_seller_account_id,v_asset.source_revision,v_asset.source_location,
      v_asset.source_character_id,'market-partial:'||v_child_hold_id::text,
      v_asset.item_id,'resource',p_requested_quantity,p_requested_quantity,
      false,'verified',v_child_attributes
    );
    insert into private.market_custody_holds_v1(
      hold_id,asset_id,owner_account_id,request_key,request_hash,
      held_quantity,status,source_revision,expires_at
    ) values (
      v_child_hold_id,v_child_asset_id,v_seller_account_id,
      'partial_'||pg_catalog.replace(v_child_hold_id::text,'-',''),
      p_request_hash,p_requested_quantity,'held',v_hold.source_revision,v_hold.expires_at
    );
    insert into private.market_sale_offers_v3(
      source_hold_id,seller_account_id,unit_price,quantity,status
    ) values (
      v_child_hold_id,v_seller_account_id,v_offer.unit_price,
      p_requested_quantity,'active'
    ) returning offer_id into v_execution_offer_id;

    insert into private.market_partial_custody_lineage_v17(
      child_offer_id,child_hold_id,child_asset_id,source_offer_id,
      source_hold_id,source_asset_id,seller_account_id,quantity
    ) values(
      v_execution_offer_id,v_child_hold_id,v_child_asset_id,v_offer.offer_id,
      v_hold.hold_id,v_asset.asset_id,v_seller_account_id,p_requested_quantity
    );
  end if;

  -- Reuse the V11 path: all three wallet surfaces reconcile, 5% Gold tax
  -- burns once, capacity-safe delivery is durable, V13 history triggers
  -- only on committed purchases, and replays cannot duplicate a fill.
  v_purchase:=private.market_purchase_stack_offer_v3(
    p_buyer_account_id,v_execution_offer_id,p_expected_unit_price,
    p_requested_quantity,p_buyer_expected_revision,p_seller_expected_revision,
    p_idempotency_key,p_request_hash
  );
  v_result:=v_purchase||pg_catalog.jsonb_build_object(
    'sourceOfferId',p_source_offer_id,'executionOfferId',v_execution_offer_id,
    'filledQuantity',p_requested_quantity,'remainingQuantity',v_remaining,
    'partiallyFilled',v_remaining>0,'replayed',false
  );
  insert into private.market_partial_fills_v17(
    buyer_account_id,idempotency_key,request_hash,
    source_offer_id,execution_offer_id,requested_quantity,expected_unit_price,result
  ) values (
    p_buyer_account_id,p_idempotency_key,p_request_hash,
    p_source_offer_id,v_execution_offer_id,p_requested_quantity,p_expected_unit_price,v_result
  );
  return v_result;
end;
$market_partial_resource$;

revoke all on function private.market_purchase_resource_quantity_v17(
  uuid,uuid,bigint,integer,bigint,bigint,text,text
) from public,anon,authenticated,service_role;

comment on function private.market_purchase_resource_quantity_v17(
  uuid,uuid,bigint,integer,bigint,bigint,text,text
) is 'PRIVATE, DISABLED. One account-owned, atomic resource fill; preserve the source listing, seven-day expiry, ownership chain and exact Gold conservation.';

commit;
