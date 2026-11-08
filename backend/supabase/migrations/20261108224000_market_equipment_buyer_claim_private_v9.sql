-- Hidden V9 buyer claim: preserve exact item/Forge metadata, rebind owner to buyer character.
-- Never callable in live game: global and equipment release gates remain false.
begin;
create or replace function private.market_claim_equipment_purchase_v9(
  p_account_id uuid,p_delivery_id uuid,p_expected_revision bigint,
  p_location text,p_holder text,p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_gear_claim$
declare
  v_game public.online_game_states%rowtype;
  v_delivery private.market_equipment_purchase_deliveries_v9%rowtype;
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
  v_rebound_receipt jsonb;
  v_holder_count bigint;
  v_storage_holder text;
begin
  if p_account_id is null or p_delivery_id is null
    or p_expected_revision is null or p_expected_revision<0
    or p_location is null or p_location not in ('inventory','bank','equipment_pouch')
    or p_holder is null or length(p_holder)=0
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
    if v_action.action<>'claim_equipment_purchase'
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
  select * into v_delivery from private.market_equipment_purchase_deliveries_v9
    where delivery_id=p_delivery_id and buyer_account_id=p_account_id for update;
  if not found then raise exception 'market_equipment_delivery_not_owned';end if;
  if v_delivery.status<>'pending'
  then raise exception 'market_equipment_delivery_already_claimed';end if;

  select * into v_gear from private.market_equipment_escrows_v8
    where source_hold_id=v_delivery.source_hold_id
      and owner_account_id=v_delivery.seller_account_id for update;
  if not found or v_gear.status<>'sold'
    or v_gear.exact_instance_id is distinct from v_delivery.exact_instance_id
    or v_gear.item_id is distinct from v_delivery.item_id
    or v_gear.exact_receipt is distinct from v_delivery.receipt_payload
  then raise exception 'market_equipment_return_ledger_mismatch';end if;
  select * into v_hold from private.market_custody_holds_v1
    where hold_id=v_gear.source_hold_id and owner_account_id=v_delivery.seller_account_id;
  select * into v_asset from private.market_custody_assets_v1
    where asset_id=v_gear.asset_id and owner_account_id=v_delivery.seller_account_id;
  if v_hold.status<>'settled' or v_hold.held_quantity<>1
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

  -- A buyer chooses one of their own active/inactive characters; the Forge
  -- receipt is rebound to that exact ID, with every other attribute intact.
  select count(*) into v_holder_count from (
    select v_game.state->'character' as character
    union all
    select other.value->'character'
      from pg_catalog.jsonb_array_elements(
        case when pg_catalog.jsonb_typeof(v_game.state->'otherCharacters')='array'
        then v_game.state->'otherCharacters' else '[]'::jsonb end) other
  ) owned where owned.character->>'id'=p_holder;
  if v_holder_count<>1
  then raise exception 'market_equipment_buyer_character_not_owned';end if;
  v_receipt_owner:=v_gear.original_owner_character_id;
  if v_delivery.receipt_payload->>'ownerCharacterId' is distinct from v_receipt_owner
  then raise exception 'market_equipment_return_payload_invalid';end if;
  v_rebound_receipt:=pg_catalog.jsonb_set(
    v_delivery.receipt_payload,'{ownerCharacterId}',pg_catalog.to_jsonb(p_holder),false);
  v_storage_holder:=case when p_location='bank' then null else p_holder end;
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
    v_game.state,p_location,v_storage_holder,0);
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
    v_records||pg_catalog.jsonb_build_array(v_rebound_receipt),false);
  update public.online_game_states
    set state=v_next_state,revision=v_game.revision+1,updated_at=now()
    where account_id=p_account_id and revision=v_game.revision;
  if not found then raise exception 'market_stale_state';end if;
  update private.market_equipment_purchase_deliveries_v9
    set status='claimed',claimed_at=now(),destination_location=p_location,
      destination_character_id=p_holder,destination_revision=v_game.revision+1
    where delivery_id=p_delivery_id and buyer_account_id=p_account_id
      and status='pending';
  if not found then raise exception 'market_equipment_delivery_already_claimed';end if;
  v_result:=pg_catalog.jsonb_build_object(
    'deliveryId',p_delivery_id,'instanceId',v_delivery.exact_instance_id,
    'itemId',v_delivery.item_id,'sourceRevision',p_expected_revision,
    'destination',p_location,'destinationCharacterId',p_holder,
    'newRevision',v_game.revision+1,'status','claimed','buyerCharacterId',p_holder,'replayed',false);
  insert into private.market_action_receipts_v2(
    owner_account_id,idempotency_key,request_hash,action,result)
  values(p_account_id,p_idempotency_key,p_request_hash,'claim_equipment_purchase',v_result);
  return v_result;
end;
$market_gear_claim$;


revoke all on function private.market_claim_equipment_purchase_v9(
  uuid,uuid,bigint,text,text,text,text)
  from public,anon,authenticated,service_role;
commit;
