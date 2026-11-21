-- Hidden Player Market V20: atomic same-account recipient transfer of one
-- already-purchased exact Forge copy. No bank staging, resale or public RPC.
-- Intended to run only on the complete V1-V19 private custody schema.
begin;

-- Normal online snapshot commits may execute as service_role, which has
-- deliberately been REVOKED from reading all private Market ledgers.
-- Keep the V19 validation trigger private while giving that trigger the
-- trusted owner's read permissions; its search_path is pinned to '' and it
-- performs no writes, dynamic SQL, or externally readable data projection.
alter function private.market_guard_owned_equipment_snapshot_v19()
  security definer;
revoke all on function private.market_guard_owned_equipment_snapshot_v19()
  from public,anon,authenticated,service_role;

create table private.market_equipment_recipient_transfers_v20 (
  account_id uuid not null references public.online_game_states(account_id)
    on delete restrict,
  idempotency_key text not null check(idempotency_key ~ '^[A-Za-z0-9_-]{8,128}$'),
  request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
  exact_instance_id text not null references
    private.market_equipment_provenance_v19(exact_instance_id) on delete restrict,
  source_character_id text not null,
  recipient_character_id text not null,
  source_location text not null check(source_location in ('inventory','equipment_pouch')),
  destination_location text not null check(destination_location in ('inventory','equipment_pouch')),
  source_index integer not null check(source_index between 0 and 10000),
  source_revision bigint not null check(source_revision>=0),
  result jsonb not null check(pg_catalog.jsonb_typeof(result)='object'),
  created_at timestamptz not null default now(),
  primary key(account_id,idempotency_key),
  check(source_character_id<>recipient_character_id)
);
create index market_recipient_transfer_copy_v20
  on private.market_equipment_recipient_transfers_v20(exact_instance_id,created_at desc);
alter table private.market_equipment_recipient_transfers_v20 enable row level security;
revoke all on table private.market_equipment_recipient_transfers_v20
  from public,anon,authenticated,service_role;

create function private.market_transfer_purchased_equipment_v20(
  p_account_id uuid,
  p_instance_id text,
  p_source_character_id text,
  p_source_location text,
  p_source_index integer,
  p_recipient_character_id text,
  p_destination_location text,
  p_expected_revision bigint,
  p_idempotency_key text,
  p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_transfer$
declare
  v_row public.online_game_states%rowtype;
  v_provenance private.market_equipment_provenance_v19%rowtype;
  v_previous private.market_equipment_recipient_transfers_v20%rowtype;
  v_source_path text[];
  v_source_stacks_path text[];
  v_source_stacks jsonb;
  v_source_copy jsonb;
  v_target_path text[];
  v_target_stacks_path text[];
  v_target_stacks jsonb;
  v_target_capacity bigint;
  v_snapshot jsonb;
  v_receipts jsonb;
  v_receipt jsonb;
  v_receipt_index bigint:=-1;
  v_receipt_matches integer:=0;
  v_entry jsonb;
  v_destination jsonb;
  v_target_count integer:=0;
  v_xp_text text;
  v_target_level integer;
  v_result jsonb;
  v_vars jsonb;
begin
  if p_account_id is null or p_instance_id is null
    or length(p_instance_id) not between 1 and 180
    or p_source_character_id is null or p_recipient_character_id is null
    or p_source_character_id=p_recipient_character_id
    or p_source_location is null or p_source_location not in ('inventory','equipment_pouch')
    or p_destination_location is null or p_destination_location not in ('inventory','equipment_pouch')
    or p_source_index is null or p_source_index not between 0 and 10000
    or p_expected_revision is null or p_expected_revision<0
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
  then raise exception 'market_transfer_invalid_request';end if;
  if not exists(select 1 from private.market_runtime_guard_v1
      where singleton and trading_enabled and snapshot_bridge_ready)
    or not exists(select 1 from private.market_equipment_guard_v8
      where singleton and equipment_transfers_enabled)
  then raise exception 'market_disabled';end if;

  -- Same account-wide serialization lock as server saves and all prior
  -- market actions. Never take a second account lock (no cross-account move).
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_account_id::text,0));
  select * into v_row from public.online_game_states
    where account_id=p_account_id for update;
  if not found or v_row.state is null
  then raise exception 'market_state_missing';end if;
  select * into v_previous from private.market_equipment_recipient_transfers_v20
    where account_id=p_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_previous.request_hash<>p_request_hash
      or v_previous.exact_instance_id<>p_instance_id
      or v_previous.source_character_id<>p_source_character_id
      or v_previous.recipient_character_id<>p_recipient_character_id
      or v_previous.source_location<>p_source_location
      or v_previous.destination_location<>p_destination_location
      or v_previous.source_index<>p_source_index
      or v_previous.source_revision<>p_expected_revision
    then raise exception 'market_idempotency_conflict';end if;
    return v_previous.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;
  if v_row.revision<>p_expected_revision
  then raise exception 'market_stale_state';end if;

  select * into v_provenance from private.market_equipment_provenance_v19
    where exact_instance_id=p_instance_id and buyer_account_id=p_account_id
      and recipient_character_id=p_source_character_id and status='claimed'
    for update;
  if not found then raise exception 'market_equipment_source_not_owned';end if;
  if not private.market_owned_copy_valid_v19(
    v_row.state,p_source_character_id,p_instance_id,v_provenance.item_id,
    v_provenance.original_receipt)
  then raise exception 'market_equipment_source_identity_invalid';end if;
  if not exists(select 1 from public.characters c
      where c.account_id=p_account_id
        and c.id::text=p_source_character_id)
  then raise exception 'market_equipment_source_not_owned';end if;

  -- Destination must be one unique *other* character on this same account.
  if v_row.state#>>'{character,id}'=p_recipient_character_id then
    v_target_count:=v_target_count+1;
    v_destination:=v_row.state->'character';
  end if;
  for v_entry in select value from pg_catalog.jsonb_array_elements(
    case when pg_catalog.jsonb_typeof(v_row.state->'otherCharacters')='array'
      then v_row.state->'otherCharacters' else '[]'::jsonb end)
  loop
    if v_entry#>>'{character,id}'=p_recipient_character_id then
      v_target_count:=v_target_count+1;
      v_destination:=v_entry->'character';
    end if;
  end loop;
  if v_target_count<>1
    or v_destination->>'classId' is distinct from v_provenance.required_class_id
    or not exists(select 1 from public.characters c
      where c.account_id=p_account_id and c.id::text=p_recipient_character_id
        and c.class_id::text=v_provenance.required_class_id)
  then raise exception 'market_class_or_recipient_required';end if;
  if pg_catalog.jsonb_typeof(v_destination->'xp') is distinct from 'number'
    or coalesce(v_destination->>'xp','') !~ '^[0-9]{1,16}$'
    or (v_destination->>'xp')::numeric>9007199254740991
  then raise exception 'market_character_xp_invalid';end if;
  v_xp_text:=v_destination->>'xp';
  v_target_level:=private.market_character_level_from_xp_v18(v_xp_text::bigint);
  if v_target_level<v_provenance.required_character_level then
    raise exception using message='market_level_required',
      detail='Requires character level '||v_provenance.required_character_level::text;
  end if;

  -- No equipped copy or loadout reference may be silently detached.
  v_vars:=pg_catalog.jsonb_build_object(
    'inst',p_instance_id,'item',v_provenance.item_id);
  if pg_catalog.jsonb_path_exists(v_row.state,
      '$.**.savedLoadouts[*].equipment.* ? (@ == $item)',v_vars)
    or pg_catalog.jsonb_path_exists(v_row.state,
      '$.**.savedLoadouts[*].equipmentInstanceIds.* ? (@ == $inst)',v_vars)
    or pg_catalog.jsonb_path_exists(v_row.state,
      '$.**.equipmentInstanceIds.* ? (@ == $inst)',v_vars)
    or coalesce(v_row.state#>'{settings,lockedItemIds}','[]'::jsonb)
      @>pg_catalog.jsonb_build_array(v_provenance.item_id)
    or coalesce(v_row.state#>'{settings,favoriteItemIds}','[]'::jsonb)
      @>pg_catalog.jsonb_build_array(v_provenance.item_id)
  then raise exception 'market_equipment_transfer_reserved';end if;

  v_source_path:=private.market_source_stack_path_v2(
    v_row.state,p_source_location,p_source_character_id,p_source_index);
  if v_source_path is null
  then raise exception 'market_equipment_source_location_invalid';end if;
  v_source_stacks_path:=v_source_path[
    1:pg_catalog.array_length(v_source_path,1)-1];
  v_source_stacks:=v_row.state#>v_source_stacks_path;
  v_source_copy:=v_row.state#>v_source_path;
  if pg_catalog.jsonb_typeof(v_source_stacks) is distinct from 'array'
    or pg_catalog.jsonb_typeof(v_source_copy) is distinct from 'object'
    or v_source_copy->>'itemId' is distinct from v_provenance.item_id
    or v_source_copy->>'instanceId' is distinct from p_instance_id
    or v_source_copy->>'quantity' is distinct from '1'
    or exists(select 1 from pg_catalog.jsonb_object_keys(v_source_copy) key(name)
      where key.name not in ('itemId','instanceId','quantity'))
  then raise exception 'market_equipment_source_location_invalid';end if;

  v_receipts:=v_row.state#>'{account,craftedGearInstances}';
  if pg_catalog.jsonb_typeof(v_receipts) is distinct from 'array'
  then raise exception 'market_equipment_receipt_ledger_missing';end if;
  select count(*) into v_receipt_matches
    from pg_catalog.jsonb_array_elements(v_receipts) entry(value)
    where entry.value->>'id'=p_instance_id;
  if v_receipt_matches<>1
  then raise exception 'market_equipment_receipt_identity_conflict';end if;
  select entry.value,entry.ordinality-1 into v_receipt,v_receipt_index
    from pg_catalog.jsonb_array_elements(v_receipts)
      with ordinality as entry(value,ordinality)
    where entry.value->>'id'=p_instance_id;
  if v_receipt->>'ownerCharacterId' is distinct from p_source_character_id
    or v_receipt->>'itemId' is distinct from v_provenance.item_id
    or v_receipt->>'locked'='true'
  then raise exception 'market_equipment_receipt_identity_conflict';end if;

  -- Remove one exact physical stack before resolving destination against
  -- the updated snapshot (source and destination are distinct characters).
  v_snapshot:=pg_catalog.jsonb_set(
    v_row.state,v_source_stacks_path,
    v_source_stacks - p_source_index,false);
  v_target_path:=private.market_source_stack_path_v2(
    v_snapshot,p_destination_location,p_recipient_character_id,0);
  if v_target_path is null
  then raise exception 'market_equipment_destination_character_missing';end if;
  v_target_stacks_path:=v_target_path[
    1:pg_catalog.array_length(v_target_path,1)-1];
  v_target_stacks:=v_snapshot#>v_target_stacks_path;
  if pg_catalog.jsonb_typeof(v_target_stacks) is distinct from 'array'
  then raise exception 'market_equipment_destination_storage_missing';end if;
  if pg_catalog.jsonb_array_length(v_target_stacks)>=1000
  then raise exception 'market_equipment_destination_full';end if;
  v_target_capacity:=(v_snapshot#>>(
    v_target_stacks_path[1:pg_catalog.array_length(v_target_stacks_path,1)-1]
    ||array['capacity']))::bigint;
  if v_target_capacity is null or v_target_capacity<1
    or v_target_capacity>1000
  then raise exception 'market_equipment_capacity_unverified';end if;
  if pg_catalog.jsonb_array_length(v_target_stacks)>=v_target_capacity
  then raise exception 'market_equipment_destination_full';end if;
  v_snapshot:=pg_catalog.jsonb_set(
    v_snapshot,v_target_stacks_path,
    v_target_stacks||pg_catalog.jsonb_build_array(v_source_copy),false);
  v_snapshot:=pg_catalog.jsonb_set(
    v_snapshot,
    array['account','craftedGearInstances',v_receipt_index::text,'ownerCharacterId'],
    pg_catalog.to_jsonb(p_recipient_character_id),false);

  -- The V19 snapshot guard sees the new recipient while validating the
  -- whole future snapshot, and transaction rollback restores BOTH rows.
  update private.market_equipment_provenance_v19
    set recipient_character_id=p_recipient_character_id
    where exact_instance_id=p_instance_id and buyer_account_id=p_account_id
      and status='claimed' and recipient_character_id=p_source_character_id;
  if not found then raise exception 'market_equipment_source_not_owned';end if;
  update public.online_game_states
    set state=v_snapshot,revision=v_row.revision+1,updated_at=now()
    where account_id=p_account_id and revision=v_row.revision;
  if not found then raise exception 'market_stale_state';end if;

  v_result:=pg_catalog.jsonb_build_object(
    'instanceId',p_instance_id,
    'itemId',v_provenance.item_id,
    'sourceCharacterId',p_source_character_id,
    'recipientCharacterId',p_recipient_character_id,
    'sourceLocation',p_source_location,
    'destinationLocation',p_destination_location,
    'sourceIndex',p_source_index,
    'sourceRevision',p_expected_revision,
    'revision',v_row.revision+1,
    'requiredCharacterLevel',v_provenance.required_character_level,
    'status','transferred','replayed',false);
  insert into private.market_equipment_recipient_transfers_v20(
    account_id,idempotency_key,request_hash,exact_instance_id,
    source_character_id,recipient_character_id,source_location,
    destination_location,source_index,source_revision,result)
  values(p_account_id,p_idempotency_key,p_request_hash,p_instance_id,
    p_source_character_id,p_recipient_character_id,p_source_location,
    p_destination_location,p_source_index,p_expected_revision,v_result);
  return v_result;
end;
$market_transfer$;
revoke all on function private.market_transfer_purchased_equipment_v20(
  uuid,text,text,text,integer,text,text,bigint,text,text)
from public,anon,authenticated,service_role;

-- No public market API, transfers, buyer/seller Gold changes, or released flags.
commit;
