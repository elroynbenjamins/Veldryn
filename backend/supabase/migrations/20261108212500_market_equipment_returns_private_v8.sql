-- Hidden Market V8b: safe escrow unwind for one exact Forge equipment copy.
-- Equipment is still NOT sellable. No buyer claim, Gold or public RPC exists.
-- A cancellation records a durable private entitlement, never auto-injects
-- equipment into a full or ambiguous game inventory.
begin;

create table private.market_equipment_return_deliveries_v8(
  delivery_id uuid primary key default pg_catalog.gen_random_uuid(),
  source_hold_id uuid not null unique
    references private.market_equipment_escrows_v8(source_hold_id) on delete restrict,
  recipient_account_id uuid not null references public.online_game_states(account_id)
    on delete restrict,
  exact_instance_id text not null,
  item_id text not null,
  stack_payload jsonb not null check(pg_catalog.jsonb_typeof(stack_payload)='object'),
  receipt_payload jsonb not null check(pg_catalog.jsonb_typeof(receipt_payload)='object'),
  status text not null default 'pending' check(status in ('pending','claimed')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  destination_location text,
  destination_character_id text,
  destination_revision bigint,
  constraint market_gear_return_claim_shape_v8 check(
    (status='pending' and claimed_at is null and destination_location is null
      and destination_character_id is null and destination_revision is null)
    or (status='claimed' and claimed_at is not null
      and destination_location in ('inventory','bank','equipment_pouch')
      and destination_revision>=0
      and ((destination_location='bank' and destination_character_id is null)
        or (destination_location<>'bank' and destination_character_id is not null)))
  )
);
create index market_equipment_return_pending_v8
  on private.market_equipment_return_deliveries_v8(recipient_account_id,created_at)
  where status='pending';
alter table private.market_equipment_return_deliveries_v8 enable row level security;
revoke all on table private.market_equipment_return_deliveries_v8
  from public,anon,authenticated,service_role;

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
     where source_hold_id=p_hold_id)
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

create or replace function private.market_claim_equipment_return_v8(
  p_account_id uuid,p_delivery_id uuid,p_expected_revision bigint,
  p_location text,p_holder text,p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_gear_claim$
declare
  v_game public.online_game_states%rowtype;
  v_delivery private.market_equipment_return_deliveries_v8%rowtype;
  v_gear private.market_equipment_escrows_v8%rowtype;
  v_action private.market_action_receipts_v2%rowtype;
  v_hold private.market_custody_holds_v1%rowtype;
  v_asset private.market_custody_assets_v1%rowtype;
  v_path text[];
  v_stack_path text[];
  v_stacks jsonb;
  v_records jsonb;
  v_next_state jsonb;
  v_capacity bigint;
  v_receipt_owner text;
  v_result jsonb;
begin
  if p_account_id is null or p_delivery_id is null
    or p_expected_revision is null or p_expected_revision<0
    or p_location is null or p_location not in ('inventory','bank','equipment_pouch')
    or (p_location='bank' and p_holder is not null)
    or (p_location<>'bank' and (p_holder is null or length(p_holder)=0))
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
  then raise exception 'market_equipment_invalid_claim';end if;
  if not exists(select 1 from private.market_runtime_guard_v1
       where singleton and trading_enabled and snapshot_bridge_ready)
    or not exists(select 1 from private.market_equipment_guard_v8
       where singleton and equipment_transfers_enabled)
  then raise exception 'market_disabled';end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_account_id::text,0));
  select * into v_game from public.online_game_states
    where account_id=p_account_id for update;
  if not found or v_game.state is null then raise exception 'market_state_missing';end if;
  select * into v_action from private.market_action_receipts_v2
    where owner_account_id=p_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_action.action<>'claim_equipment_return'
      or v_action.request_hash<>p_request_hash
      or v_action.result->>'deliveryId' is distinct from p_delivery_id::text
      or v_action.result->>'sourceRevision' is distinct from p_expected_revision::text
      or v_action.result->>'destination' is distinct from p_location
      or v_action.result->>'destinationCharacterId' is distinct from p_holder
    then raise exception 'market_idempotency_conflict';end if;
    return v_action.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;
  if v_game.revision<>p_expected_revision
  then raise exception 'market_stale_state';end if;
  select * into v_delivery from private.market_equipment_return_deliveries_v8
    where delivery_id=p_delivery_id and recipient_account_id=p_account_id for update;
  if not found then raise exception 'market_equipment_delivery_not_owned';end if;
  if v_delivery.status<>'pending'
  then raise exception 'market_equipment_delivery_already_claimed';end if;

  select * into v_gear from private.market_equipment_escrows_v8
    where source_hold_id=v_delivery.source_hold_id
      and owner_account_id=p_account_id for update;
  if not found or v_gear.status<>'returned'
    or v_gear.exact_instance_id is distinct from v_delivery.exact_instance_id
    or v_gear.item_id is distinct from v_delivery.item_id
    or v_gear.exact_receipt is distinct from v_delivery.receipt_payload
  then raise exception 'market_equipment_return_ledger_mismatch';end if;
  select * into v_hold from private.market_custody_holds_v1
    where hold_id=v_gear.source_hold_id and owner_account_id=p_account_id;
  select * into v_asset from private.market_custody_assets_v1
    where asset_id=v_gear.asset_id and owner_account_id=p_account_id;
  if v_hold.status<>'released' or v_hold.held_quantity<>1
    or v_asset.asset_kind<>'equipment' or v_asset.held_quantity<>0
    or v_asset.immutable_attributes->'exactReceipt' is distinct from v_delivery.receipt_payload
    or v_asset.immutable_attributes->'stack' is distinct from v_delivery.stack_payload
  then raise exception 'market_equipment_return_ledger_mismatch';end if;

  if v_delivery.receipt_payload->>'id' is distinct from v_delivery.exact_instance_id
    or v_delivery.receipt_payload->>'itemId' is distinct from v_delivery.item_id
    or v_delivery.receipt_payload->>'ownerCharacterId' is distinct from v_gear.original_owner_character_id
    or v_delivery.stack_payload->>'instanceId' is distinct from v_delivery.exact_instance_id
    or v_delivery.stack_payload->>'itemId' is distinct from v_delivery.item_id
    or v_delivery.stack_payload->>'quantity' is distinct from '1'
  then raise exception 'market_equipment_return_payload_invalid';end if;

  -- The buyer in the future will need an explicit copy-rebind step. For this
  -- seller-only return, original owner character is preserved byte-for-byte.
  v_receipt_owner:=v_gear.original_owner_character_id;
  if p_location<>'bank' and p_holder<>v_receipt_owner
  then raise exception 'market_equipment_return_wrong_character';end if;
  v_records:=v_game.state#>'{account,craftedGearInstances}';
  if pg_catalog.jsonb_typeof(v_records) is distinct from 'array'
    or pg_catalog.jsonb_array_length(v_records)>=500
    or exists(select 1 from pg_catalog.jsonb_array_elements(v_records) e(value)
       where e.value->>'id'=v_delivery.exact_instance_id)
    or pg_catalog.jsonb_path_exists(v_game.state,
      '$.**.stacks[*] ? (@.instanceId == $inst)',
      pg_catalog.jsonb_build_object('inst',v_delivery.exact_instance_id))
    or pg_catalog.jsonb_path_exists(v_game.state,
      '$.**.equipmentInstanceIds.* ? (@ == $inst)',
      pg_catalog.jsonb_build_object('inst',v_delivery.exact_instance_id))
  then raise exception 'market_equipment_destination_identity_conflict';end if;

  v_path:=private.market_source_stack_path_v2(
    v_game.state,p_location,p_holder,0);
  if v_path is null then raise exception 'market_equipment_destination_character_missing';end if;
  v_stack_path:=v_path[1:pg_catalog.array_length(v_path,1)-1];
  v_stacks:=v_game.state#>v_stack_path;
  if pg_catalog.jsonb_typeof(v_stacks) is distinct from 'array'
  then raise exception 'market_equipment_destination_storage_missing';end if;
  v_capacity:=(v_game.state#>>(v_stack_path[1:pg_catalog.array_length(v_stack_path,1)-1]
    ||array['capacity']))::bigint;
  if v_capacity is null or v_capacity<1 or v_capacity>1000
  then raise exception 'market_equipment_capacity_unverified';end if;
  if pg_catalog.jsonb_array_length(v_stacks)>=v_capacity
  then raise exception 'market_equipment_destination_full';end if;

  v_next_state:=pg_catalog.jsonb_set(v_game.state,v_stack_path,
    v_stacks||pg_catalog.jsonb_build_array(v_delivery.stack_payload),false);
  v_next_state:=pg_catalog.jsonb_set(v_next_state,'{account,craftedGearInstances}',
    v_records||pg_catalog.jsonb_build_array(v_delivery.receipt_payload),false);
  update public.online_game_states
    set state=v_next_state,revision=v_game.revision+1,updated_at=now()
    where account_id=p_account_id and revision=v_game.revision;
  if not found then raise exception 'market_stale_state';end if;
  update private.market_equipment_return_deliveries_v8
    set status='claimed',claimed_at=now(),destination_location=p_location,
      destination_character_id=p_holder,destination_revision=v_game.revision+1
    where delivery_id=p_delivery_id and recipient_account_id=p_account_id
      and status='pending';
  if not found then raise exception 'market_equipment_delivery_already_claimed';end if;
  v_result:=pg_catalog.jsonb_build_object(
    'deliveryId',p_delivery_id,'instanceId',v_delivery.exact_instance_id,
    'itemId',v_delivery.item_id,'sourceRevision',p_expected_revision,
    'destination',p_location,'destinationCharacterId',p_holder,
    'newRevision',v_game.revision+1,'status','claimed','replayed',false);
  insert into private.market_action_receipts_v2(
    owner_account_id,idempotency_key,request_hash,action,result)
  values(p_account_id,p_idempotency_key,p_request_hash,'claim_equipment_return',v_result);
  return v_result;
end;
$market_gear_claim$;

revoke all on function private.market_claim_equipment_return_v8(
  uuid,uuid,bigint,text,text,text,text)
  from public,anon,authenticated,service_role;

-- The Market tab will later union these claims with purchased and sold items;
-- this private read model does not expose a user-facing inbox route today.
create or replace function private.market_equipment_return_inbox_v8(
  p_account_id uuid,p_history boolean default false
) returns jsonb
language sql stable security invoker set search_path=''
as $market_gear_inbox$
  select case when not exists(
    select 1 from private.market_runtime_guard_v1
      where singleton and trading_enabled and snapshot_bridge_ready)
    or not exists(select 1 from private.market_equipment_guard_v8
      where singleton and equipment_transfers_enabled)
  then pg_catalog.jsonb_build_object('released',false,'entries','[]'::jsonb)
  else pg_catalog.jsonb_build_object('released',false,
    'entries',coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'deliveryId',d.delivery_id,'kind','returned_equipment',
        'instanceId',d.exact_instance_id,'itemId',d.item_id,
        'status',d.status,'createdAt',d.created_at)
        order by d.created_at desc)
      from private.market_equipment_return_deliveries_v8 d
      where d.recipient_account_id=p_account_id
        and (d.status='claimed')=p_history
    ),'[]'::jsonb))
  end;
$market_gear_inbox$;
revoke all on function private.market_equipment_return_inbox_v8(uuid,boolean)
  from public,anon,authenticated,service_role;

commit;
