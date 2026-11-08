-- Hidden Player Market V3: account-owned, capacity-aware delivery claims.
-- NO public/client/server API route and NO production trading release.
-- Runtime market gates remain hard CHECK FALSE; private mutating RPC is
-- SECURITY INVOKER without any anon/authenticated/service_role EXECUTE.
-- A cancelled/expired escrow lot is claimed exactly once into a server-owned
-- online_game_states stack, or stays pending unchanged if storage is full.
begin;

alter table private.market_action_receipts_v2
  drop constraint if exists market_action_receipts_v2_action_check;
alter table private.market_action_receipts_v2
  add constraint market_action_receipt_action_v3
  check(action in ('reserve','cancel','expire','claim_return'));

alter table private.market_return_deliveries_v2
  drop constraint if exists market_return_deliveries_v2_status_check;
alter table private.market_return_deliveries_v2
  add column if not exists claimed_at timestamptz,
  add column if not exists destination_location text,
  add column if not exists destination_character_id text,
  add column if not exists destination_revision bigint;

alter table private.market_return_deliveries_v2
  add constraint market_return_claimed_shape_v3 check(
    (status='pending' and claimed_at is null and destination_location is null
      and destination_character_id is null and destination_revision is null)
    or (status='claimed' and claimed_at is not null
      and destination_location in ('inventory','bank','gem_pouch')
      and destination_revision is not null and destination_revision>=0
      and ((destination_location='inventory' and destination_character_id is not null)
        or (destination_location in ('bank','gem_pouch') and destination_character_id is null)))
  );

-- New explicit status constraint replaces V2's permanent pending-only lock.
-- Operations remain unreachable because the independent global runtime and
-- item-policy hard-false gates have NOT been relaxed.
alter table private.market_return_deliveries_v2
  add constraint market_return_status_v3 check(status in ('pending','claimed'));

create or replace function private.market_claim_return_delivery_v3(
  p_account_id uuid,
  p_delivery_id uuid,
  p_expected_revision bigint,
  p_destination_location text,
  p_destination_character_id text,
  p_idempotency_key text,
  p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_claim_return$
declare
  v_state public.online_game_states%rowtype;
  v_delivery private.market_return_deliveries_v2%rowtype;
  v_receipt private.market_action_receipts_v2%rowtype;
  v_origin_hold private.market_custody_holds_v1%rowtype;
  v_stacks_path text[];
  v_stacks jsonb;
  v_existing jsonb;
  v_payload jsonb;
  v_next_stacks jsonb;
  v_next_state jsonb;
  v_capacity bigint;
  v_existing_qty bigint;
  v_target_ordinal bigint;
  v_new_qty bigint;
  v_ordinal bigint;
  v_result jsonb;
  v_created_slot boolean:=false;
begin
  if p_account_id is null or p_delivery_id is null
    or p_expected_revision is null or p_expected_revision<0
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
    or p_destination_location is null
    or p_destination_location not in ('inventory','bank','gem_pouch')
    or (p_destination_location='inventory' and p_destination_character_id is null)
    or (p_destination_location<>'inventory' and p_destination_character_id is not null)
  then raise exception 'invalid_market_claim_request';end if;

  -- Keep all return claims unavailable until end-to-end market release.
  if not exists(select 1 from private.market_runtime_guard_v1
      where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_account_id::text,0));
  select * into v_state from public.online_game_states
    where account_id=p_account_id for update;
  if not found or v_state.state is null
  then raise exception 'market_claim_account_missing';end if;

  select * into v_receipt from private.market_action_receipts_v2
    where owner_account_id=p_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.action<>'claim_return'
      or v_receipt.request_hash<>p_request_hash
    then raise exception 'market_idempotency_conflict';end if;
    return v_receipt.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;

  if v_state.revision<>p_expected_revision
  then raise exception 'market_stale_state';end if;

  select * into v_delivery from private.market_return_deliveries_v2
    where delivery_id=p_delivery_id and recipient_account_id=p_account_id for update;
  if not found then raise exception 'market_delivery_not_owned';end if;
  if v_delivery.status<>'pending' then raise exception 'market_delivery_already_claimed';end if;

  select * into v_origin_hold from private.market_custody_holds_v1
    where hold_id=v_delivery.source_hold_id and owner_account_id=p_account_id;
  if not found or v_origin_hold.status<>'released'
    or v_origin_hold.held_quantity<>v_delivery.quantity
  then raise exception 'market_return_not_verified';end if;
  if v_delivery.asset_kind not in ('resource','gem')
    or (p_destination_location='gem_pouch' and v_delivery.asset_kind<>'gem')
    or v_delivery.quantity<1 or v_delivery.quantity>2147483647
  then raise exception 'market_return_storage_invalid';end if;

  v_payload:=v_delivery.stack_payload;
  if pg_catalog.jsonb_typeof(v_payload) is distinct from 'object'
    or v_payload->>'itemId' is distinct from v_delivery.item_id
    or pg_catalog.jsonb_typeof(v_payload->'quantity') is distinct from 'number'
    or v_payload->>'quantity' is distinct from v_delivery.quantity::text
    or exists(select 1 from pg_catalog.jsonb_object_keys(v_payload) as k(key)
      where k.key not in ('itemId','quantity'))
  then raise exception 'market_return_payload_unverified';end if;

  -- Resolve a valid holder and exact authoritative storage path, including
  -- inactive characters, without trusting a client-supplied state snapshot.
  v_stacks_path:=private.market_source_stack_path_v2(
    v_state.state,p_destination_location,p_destination_character_id,0);
  if v_stacks_path is null then raise exception 'market_claim_character_missing';end if;
  v_stacks_path:=v_stacks_path[1:pg_catalog.array_length(v_stacks_path,1)-1];
  v_stacks:=v_state.state#>v_stacks_path;
  if pg_catalog.jsonb_typeof(v_stacks) is distinct from 'array'
  then raise exception 'market_destination_not_initialized';end if;

  if p_destination_location='inventory' then
    v_capacity:=(v_state.state#>>(v_stacks_path[1:pg_catalog.array_length(v_stacks_path,1)-1]
      ||array['capacity']))::bigint;
  else
    v_capacity:=(v_state.state#>>(v_stacks_path[1:pg_catalog.array_length(v_stacks_path,1)-1]
      ||array['capacity']))::bigint;
  end if;
  -- Strict finite slot bound. No capacity multiplier or auto-upgrade.
  if v_capacity is null or v_capacity<1 or v_capacity>1000
  then raise exception 'market_storage_capacity_unverified';end if;

  -- Any existing stack with extra ownership/binding metadata is ambiguous.
  -- Refuse the entire claim, rather than merging with a legacy instance.
  for v_existing,v_ordinal in
    select element.value,element.ordinality
    from pg_catalog.jsonb_array_elements(v_stacks)
      with ordinality as element(value,ordinality)
    where element.value->>'itemId'=v_delivery.item_id
  loop
    if pg_catalog.jsonb_typeof(v_existing) is distinct from 'object'
      or pg_catalog.jsonb_typeof(v_existing->'quantity') is distinct from 'number'
      or coalesce(v_existing->>'quantity','') !~ '^[0-9]{1,10}$'
      or exists(select 1 from pg_catalog.jsonb_object_keys(v_existing) as k(key)
        where k.key not in ('itemId','quantity'))
    then raise exception 'market_destination_stack_unverified';end if;
    v_existing_qty:=(v_existing->>'quantity')::bigint;
    if v_existing_qty<1 or v_existing_qty>2147483647
    then raise exception 'market_destination_stack_unverified';end if;
    -- Exactly one plain matching stack; duplicate matches fail closed.
    if v_target_ordinal is not null
    then raise exception 'market_destination_duplicate_stacks';end if;
    v_target_ordinal:=v_ordinal-1;
  end loop;

  if v_target_ordinal is not null then
    v_new_qty:=v_existing_qty+v_delivery.quantity;
    if v_new_qty>2147483647
    then raise exception 'market_destination_quantity_overflow';end if;
    v_next_stacks:=pg_catalog.jsonb_set(
      v_stacks,array[v_target_ordinal::text,'quantity'],
      pg_catalog.to_jsonb(v_new_qty::integer),false);
  else
    if pg_catalog.jsonb_array_length(v_stacks)>=v_capacity
    then raise exception 'market_destination_full';end if;
    v_next_stacks:=v_stacks||pg_catalog.jsonb_build_array(v_payload);
    v_created_slot:=true;
  end if;

  v_next_state:=pg_catalog.jsonb_set(v_state.state,v_stacks_path,v_next_stacks,false);
  update public.online_game_states
    set state=v_next_state,revision=v_state.revision+1,updated_at=now()
    where account_id=p_account_id and revision=v_state.revision;
  if not found then raise exception 'market_stale_state';end if;

  update private.market_return_deliveries_v2
    set status='claimed',claimed_at=now(),
      destination_location=p_destination_location,
      destination_character_id=p_destination_character_id,
      destination_revision=v_state.revision+1
    where delivery_id=p_delivery_id and recipient_account_id=p_account_id
      and status='pending';
  if not found then raise exception 'market_delivery_already_claimed';end if;

  v_result:=pg_catalog.jsonb_build_object(
    'deliveryId',p_delivery_id,'quantity',v_delivery.quantity,
    'itemId',v_delivery.item_id,'destination',p_destination_location,
    'newRevision',v_state.revision+1,'createdSlot',v_created_slot,
    'replayed',false);
  insert into private.market_action_receipts_v2(
    owner_account_id,idempotency_key,request_hash,action,result)
    values(p_account_id,p_idempotency_key,p_request_hash,'claim_return',v_result);
  return v_result;
end;
$market_claim_return$;

revoke all on function private.market_claim_return_delivery_v3(
  uuid,uuid,bigint,text,text,text,text)
  from public,anon,authenticated,service_role;

comment on function private.market_claim_return_delivery_v3(
  uuid,uuid,bigint,text,text,text,text) is
  'Private, disabled: atomically claim a pending cancellation/expiry delivery into one verified server-owned stack; full storage preserves the entitlement.';

commit;
