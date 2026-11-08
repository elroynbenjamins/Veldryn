-- Hidden Player Market V3: locked whole-lot purchase and Gold settlement.
-- No UI, listing RPC, player purchase route, or externally executable function.
-- All market runtime gates remain hard CHECK FALSE in the foundation migration.
-- A seller-authored offer has no public creation path; draft/active rows are
-- private only. The buyer delivery stays pending and unclaimable until a
-- separate capacity-aware, replay-safe purchase-claim bridge is released.
--
-- First scope: one buyer purchases one complete resource/gem hold. No gear,
-- auction bids, partial purchases, NPC-price inference or tax configured yet.
begin;

create table if not exists private.market_sale_offers_v3 (
  offer_id uuid primary key default pg_catalog.gen_random_uuid(),
  source_hold_id uuid not null unique,
  seller_account_id uuid not null,
  unit_price bigint not null check(unit_price between 1 and 1000000000000),
  quantity integer not null check(quantity between 1 and 2147483647),
  status text not null default 'draft'
    check(status in ('draft','active','sold','cancelled')),
  created_at timestamptz not null default now(),
  sold_at timestamptz,
  constraint market_offer_seller_fk_v3 foreign key(source_hold_id,seller_account_id)
    references private.market_custody_holds_v1(hold_id,owner_account_id)
    on delete restrict,
  constraint market_offer_closed_state_v3 check(
    (status='sold' and sold_at is not null)
    or (status<>'sold' and sold_at is null)
  )
);
create index if not exists market_offer_seller_v3
  on private.market_sale_offers_v3(seller_account_id,created_at)
  where status in ('draft','active');

create table if not exists private.market_purchase_receipts_v3 (
  buyer_account_id uuid not null references public.online_game_states(account_id)
    on delete restrict,
  idempotency_key text not null check(length(idempotency_key) between 8 and 128),
  request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
  offer_id uuid not null unique references private.market_sale_offers_v3(offer_id)
    on delete restrict,
  result jsonb not null check(pg_catalog.jsonb_typeof(result)='object'),
  created_at timestamptz not null default now(),
  primary key(buyer_account_id,idempotency_key)
);

create table if not exists private.market_purchase_deliveries_v3 (
  delivery_id uuid primary key default pg_catalog.gen_random_uuid(),
  source_hold_id uuid not null unique,
  buyer_account_id uuid not null references public.online_game_states(account_id)
    on delete restrict,
  seller_account_id uuid not null,
  item_id text not null check(length(item_id) between 1 and 180),
  asset_kind text not null check(asset_kind in ('resource','gem')),
  quantity bigint not null check(quantity between 1 and 2147483647),
  stack_payload jsonb not null check(pg_catalog.jsonb_typeof(stack_payload)='object'),
  status text not null default 'pending' check(status='pending'),
  created_at timestamptz not null default now(),
  constraint market_purchase_delivery_seller_fk_v3 foreign key(
    source_hold_id,seller_account_id
  ) references private.market_custody_holds_v1(hold_id,owner_account_id)
    on delete restrict,
  check(buyer_account_id<>seller_account_id)
);
create index if not exists market_purchase_delivery_buyer_pending_v3
  on private.market_purchase_deliveries_v3(buyer_account_id,created_at)
  where status='pending';

-- The previous intent table was permanently draft-only. Settlement is still
-- hard-disabled by runtime gates, but its internal testable ledger needs a
-- terminal state with conservation constraints unchanged.
alter table private.market_gold_intents_v2
  drop constraint if exists market_gold_intents_v2_status_check;
alter table private.market_gold_intents_v2
  add constraint market_gold_intent_state_v3
  check(status in ('draft','settled'));

alter table private.market_sale_offers_v3 enable row level security;
alter table private.market_purchase_receipts_v3 enable row level security;
alter table private.market_purchase_deliveries_v3 enable row level security;
revoke all on table private.market_sale_offers_v3,
  private.market_purchase_receipts_v3,
  private.market_purchase_deliveries_v3
  from public,anon,authenticated,service_role;

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
  v_fee bigint:=0;
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
    'party-account:'||pg_catalog.least(p_buyer_account_id::text,v_seller_account_id::text),0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'party-account:'||pg_catalog.greatest(p_buyer_account_id::text,v_seller_account_id::text),0));

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
  v_gross:=(v_offer.unit_price::numeric*v_offer.quantity::numeric)::bigint;
  if v_buyer_gold<v_gross
  then raise exception 'market_insufficient_gold';end if;
  if v_seller_gold>9007199254740991-v_gross
  then raise exception 'market_seller_gold_overflow';end if;
  v_new_buyer_gold:=v_buyer_gold-v_gross;
  v_new_seller_gold:=v_seller_gold+v_gross;

  -- The first prototype charges no fee. A future reviewed policy migration
  -- must deliberately define tax and sinks, never silently invent a rate.
  insert into private.market_gold_intents_v2(
    source_hold_id,buyer_account_id,seller_account_id,buyer_character_id,
    unit_price,quantity,gross_gold,fee_gold,seller_payout_gold,status
  ) values(
    v_hold.hold_id,p_buyer_account_id,v_seller_account_id,v_buyer.character_id,
    v_offer.unit_price,v_offer.quantity,v_gross,v_fee,v_gross,'settled'
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
    'goldSpent',v_gross,'sellerGoldReceived',v_gross,'feeGold',v_fee,
    'buyerRevision',v_buyer.revision+1,'sellerRevision',v_seller.revision+1,
    'itemStatus','pending_delivery','replayed',false);
  insert into private.market_purchase_receipts_v3(
    buyer_account_id,idempotency_key,request_hash,offer_id,result
  ) values(p_buyer_account_id,p_idempotency_key,p_request_hash,p_offer_id,v_result);

  return v_result;
end;
$market_purchase$;

revoke all on function private.market_purchase_stack_offer_v3(
  uuid,uuid,bigint,integer,bigint,bigint,text,text
) from public,anon,authenticated,service_role;

comment on function private.market_purchase_stack_offer_v3(
  uuid,uuid,bigint,integer,bigint,bigint,text,text
) is
  'PRIVATE DISABLED: reconcile both player wallets and snapshots, settle one locked resource lot, and issue pending buyer delivery. No UI or API grants.';

commit;
