-- Hidden Market V21: private, exact-copy Forge shared-bank vault.
-- Never approve trading, expose public RPC, or permit generic save bypasses.
begin;

alter table private.market_equipment_provenance_v19
  add column storage_state text not null default 'character'
  check(storage_state in ('character','bank'));
comment on column private.market_equipment_provenance_v19.storage_state is
  'Private custody authority. Bank mode only via V21 atomic deposit/withdrawal.';

create table private.market_equipment_bank_actions_v21 (
  account_id uuid not null references public.online_game_states(account_id) on delete restrict,
  idempotency_key text not null check(idempotency_key ~ '^[A-Za-z0-9_-]{8,128}$'),
  request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
  exact_instance_id text not null references private.market_equipment_provenance_v19(exact_instance_id)
    on delete restrict,
  action text not null check(action in ('deposit','withdraw')),
  character_id text not null,
  character_location text not null check(character_location in ('inventory','equipment_pouch')),
  character_index integer not null check(character_index between 0 and 10000),
  bank_index integer not null check(bank_index between 0 and 10000),
  source_revision bigint not null check(source_revision>=0),
  result jsonb not null check(pg_catalog.jsonb_typeof(result)='object'),
  created_at timestamptz not null default now(),
  primary key(account_id,idempotency_key)
);
create index market_bank_actions_copy_v21
 on private.market_equipment_bank_actions_v21(exact_instance_id,created_at desc);
alter table private.market_equipment_bank_actions_v21 enable row level security;
revoke all on table private.market_equipment_bank_actions_v21
 from public,anon,authenticated,service_role;

-- V19 intentionally rejects a bank-held exact copy. V21 adds a distinct
-- validator rather than weakening the character-held predicate. The last
-- owner's ID stays on the receipt while banked: this is custody, not transfer.
create function private.market_owned_banked_copy_valid_v21(
  p_state jsonb,p_last_owner text,p_instance text,p_item text,p_origin jsonb
) returns boolean
language plpgsql stable security invoker set search_path=''
as $market_banked_copy$
declare
  v_records jsonb;
  v_bank jsonb;
  v_stack jsonb;
  v_receipt jsonb;
  v_receipt_count integer:=0;
  v_owner_count integer:=0;
  v_total integer;
  v_vars jsonb;
begin
  if p_state is null or p_last_owner is null or p_instance is null or p_item is null
    or p_origin is null
    or pg_catalog.jsonb_typeof(p_state#>'{account,craftedGearInstances}')<>'array'
    or pg_catalog.jsonb_typeof(p_state#>'{bank,stacks}')<>'array'
  then return false;end if;
  v_records:=p_state#>'{account,craftedGearInstances}';
  v_bank:=p_state#>'{bank,stacks}';
  for v_receipt in select value from pg_catalog.jsonb_array_elements(v_records)
  loop
    if v_receipt->>'id'=p_instance then
      v_receipt_count:=v_receipt_count+1;
      if v_receipt->>'ownerCharacterId' is distinct from p_last_owner
        or v_receipt->>'itemId' is distinct from p_item
        or (v_receipt-'enhancement'-'locked'-'ownerCharacterId')
          is distinct from (p_origin-'enhancement'-'locked'-'ownerCharacterId')
      then return false;end if;
    end if;
  end loop;
  if v_receipt_count<>1 then return false;end if;
  if p_state#>>'{character,id}'=p_last_owner
  then v_owner_count:=v_owner_count+1;end if;
  for v_receipt in select value from pg_catalog.jsonb_array_elements(
    case when pg_catalog.jsonb_typeof(p_state->'otherCharacters')='array'
      then p_state->'otherCharacters' else '[]'::jsonb end)
  loop
    if v_receipt#>>'{character,id}'=p_last_owner
    then v_owner_count:=v_owner_count+1;end if;
  end loop;
  if v_owner_count<>1 then return false;end if;
  v_vars:=pg_catalog.jsonb_build_object('inst',p_instance);
  v_total:=pg_catalog.jsonb_array_length(pg_catalog.jsonb_path_query_array(
    p_state,'$.**.stacks[*] ? (@.instanceId == $inst)',v_vars))
    +pg_catalog.jsonb_array_length(pg_catalog.jsonb_path_query_array(
    p_state,'$.**.equipmentInstanceIds.* ? (@ == $inst)',v_vars));
  if v_total<>1 then return false;end if;
  if (select count(*) from pg_catalog.jsonb_array_elements(v_bank) entry(value)
    where entry.value->>'instanceId'=p_instance)<>1
  then return false;end if;
  select value into v_stack from pg_catalog.jsonb_array_elements(v_bank) entry(value)
    where entry.value->>'instanceId'=p_instance;
  if v_stack->>'itemId' is distinct from p_item
    or v_stack->>'quantity' is distinct from '1'
    or exists(select 1 from pg_catalog.jsonb_object_keys(v_stack) k(name)
      where k.name not in ('itemId','quantity','instanceId'))
  then return false;end if;
  return true;
end;
$market_banked_copy$;
revoke all on function private.market_owned_banked_copy_valid_v21(jsonb,text,text,text,jsonb)
 from public,anon,authenticated,service_role;

-- V19 uses a trigger on every game state update. Replace only its private
-- body: both character and bank states remain strict and mutually exclusive.
create or replace function private.market_guard_owned_equipment_snapshot_v19()
returns trigger language plpgsql volatile security definer set search_path=''
as $market_saved_provenance$
declare
  v_provenance private.market_equipment_provenance_v19%rowtype;
  v_valid boolean;
begin
  for v_provenance in select * from private.market_equipment_provenance_v19 p
    where p.buyer_account_id=new.account_id and p.status='claimed'
  loop
    if v_provenance.storage_state='character' then
      v_valid:=private.market_owned_copy_valid_v19(
        new.state,v_provenance.recipient_character_id,v_provenance.exact_instance_id,
        v_provenance.item_id,v_provenance.original_receipt);
    elsif v_provenance.storage_state='bank' then
      v_valid:=private.market_owned_banked_copy_valid_v21(
        new.state,v_provenance.recipient_character_id,v_provenance.exact_instance_id,
        v_provenance.item_id,v_provenance.original_receipt);
    else v_valid:=false;end if;
    if v_valid is distinct from true then
      raise exception 'market_equipment_provenance_transfer_blocked';end if;
  end loop;
  return new;
end;
$market_saved_provenance$;
revoke all on function private.market_guard_owned_equipment_snapshot_v19()
 from public,anon,authenticated,service_role;

-- One private atomic movement. Inputs are authoritative identifiers and
-- optimistic revision; never trust an unverified client-supplied receipt.
create function private.market_move_purchased_equipment_bank_v21(
  p_account_id uuid,p_instance_id text,p_action text,
  p_character_id text,p_character_location text,p_character_index integer,
  p_bank_index integer,p_expected_revision bigint,
  p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_bank_move$
declare
  v_row public.online_game_states%rowtype;
  v_provenance private.market_equipment_provenance_v19%rowtype;
  v_previous private.market_equipment_bank_actions_v21%rowtype;
  v_state jsonb;
  v_source_path text[];
  v_target_path text[];
  v_source_stacks_path text[];
  v_target_stacks_path text[];
  v_source_stacks jsonb;
  v_target_stacks jsonb;
  v_copy jsonb;
  v_capacity bigint;
  v_target_character jsonb;
  v_roster_entry jsonb;
  v_character_count integer:=0;
  v_receipt jsonb;
  v_receipt_index bigint;
  v_receipt_count integer;
  v_level integer;
  v_vars jsonb;
  v_result jsonb;
begin
  if p_account_id is null or p_instance_id is null or length(p_instance_id) not between 1 and 180
    or p_action is null or p_action not in ('deposit','withdraw')
    or p_character_id is null or length(p_character_id)=0
    or p_character_location is null
    or p_character_location not in ('inventory','equipment_pouch')
    or p_character_index is null or p_character_index not between 0 and 10000
    or p_bank_index is null or p_bank_index not between 0 and 10000
    or (p_action='deposit' and p_bank_index<>0)
    or (p_action='withdraw' and p_character_index<>0)
    or p_expected_revision is null or p_expected_revision<0
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
  then raise exception 'market_bank_invalid_request';end if;
  if not exists(select 1 from private.market_runtime_guard_v1
      where singleton and trading_enabled and snapshot_bridge_ready)
    or not exists(select 1 from private.market_equipment_guard_v8
      where singleton and equipment_transfers_enabled)
  then raise exception 'market_disabled';end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_account_id::text,0));
  select * into v_row from public.online_game_states
    where account_id=p_account_id for update;
  if not found or v_row.state is null then raise exception 'market_state_missing';end if;
  select * into v_previous from private.market_equipment_bank_actions_v21 a
    where a.account_id=p_account_id and a.idempotency_key=p_idempotency_key;
  if found then
    if v_previous.request_hash<>p_request_hash
      or v_previous.exact_instance_id<>p_instance_id
      or v_previous.action<>p_action or v_previous.character_id<>p_character_id
      or v_previous.character_location<>p_character_location
      or v_previous.character_index<>p_character_index
      or v_previous.bank_index<>p_bank_index
      or v_previous.source_revision<>p_expected_revision
    then raise exception 'market_idempotency_conflict';end if;
    return v_previous.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;
  if v_row.revision<>p_expected_revision then raise exception 'market_stale_state';end if;
  select * into v_provenance from private.market_equipment_provenance_v19 p
    where p.exact_instance_id=p_instance_id and p.buyer_account_id=p_account_id
      and p.status='claimed' for update;
  if not found then raise exception 'market_equipment_source_not_owned';end if;
  if (p_action='deposit' and
       (v_provenance.storage_state<>'character' or
        v_provenance.recipient_character_id<>p_character_id))
    or (p_action='withdraw' and v_provenance.storage_state<>'bank')
  then raise exception 'market_equipment_custody_state_invalid';end if;

  -- The recipient must be unique in the server-owned roster and relational
  -- character table, including an inactive alternate character.
  if v_row.state#>>'{character,id}'=p_character_id then
    v_character_count:=v_character_count+1;
    v_target_character:=v_row.state->'character';
  end if;
  for v_roster_entry in select value from pg_catalog.jsonb_array_elements(
    case when pg_catalog.jsonb_typeof(v_row.state->'otherCharacters')='array'
      then v_row.state->'otherCharacters' else '[]'::jsonb end)
  loop
    if v_roster_entry#>>'{character,id}'=p_character_id then
      v_character_count:=v_character_count+1;
      v_target_character:=v_roster_entry->'character';
    end if;
  end loop;
  if v_character_count<>1
    or not exists(select 1 from public.characters c
      where c.id::text=p_character_id and c.account_id=p_account_id)
  then raise exception 'market_class_or_recipient_required';end if;

  if p_action='deposit' then
    if not private.market_owned_copy_valid_v19(
      v_row.state,p_character_id,p_instance_id,v_provenance.item_id,
      v_provenance.original_receipt)
    then raise exception 'market_equipment_source_identity_invalid';end if;
  else
    if not private.market_owned_banked_copy_valid_v21(
      v_row.state,v_provenance.recipient_character_id,p_instance_id,
      v_provenance.item_id,v_provenance.original_receipt)
    then raise exception 'market_equipment_bank_identity_invalid';end if;
    if v_target_character->>'classId' is distinct from v_provenance.required_class_id
      or not exists(select 1 from public.characters c
        where c.id::text=p_character_id and c.account_id=p_account_id
          and c.class_id::text=v_provenance.required_class_id)
    then raise exception 'market_class_or_recipient_required';end if;
    if pg_catalog.jsonb_typeof(v_target_character->'xp') is distinct from 'number'
      or coalesce(v_target_character->>'xp','') !~ '^[0-9]{1,16}$'
      or (v_target_character->>'xp')::numeric>9007199254740991
    then raise exception 'market_character_xp_invalid';end if;
    v_level:=private.market_character_level_from_xp_v18(
      (v_target_character->>'xp')::bigint);
    if v_level<v_provenance.required_character_level then
      raise exception using message='market_level_required',
        detail='Requires character level '||v_provenance.required_character_level::text;
    end if;
  end if;

  v_vars:=pg_catalog.jsonb_build_object('inst',p_instance_id,'item',v_provenance.item_id);
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
  select count(*) into v_receipt_count from pg_catalog.jsonb_array_elements(
    case when pg_catalog.jsonb_typeof(v_row.state#>'{account,craftedGearInstances}')='array'
      then v_row.state#>'{account,craftedGearInstances}' else '[]'::jsonb end) entry(value)
    where entry.value->>'id'=p_instance_id;
  if v_receipt_count<>1 then raise exception 'market_equipment_receipt_identity_conflict';end if;
  select entry.value,entry.ordinality-1 into v_receipt,v_receipt_index
    from pg_catalog.jsonb_array_elements(v_row.state#>'{account,craftedGearInstances}')
      with ordinality as entry(value,ordinality)
    where entry.value->>'id'=p_instance_id;
  if v_receipt->>'itemId' is distinct from v_provenance.item_id
    or v_receipt->>'ownerCharacterId' is distinct from v_provenance.recipient_character_id
    or v_receipt->>'locked'='true'
  then raise exception 'market_equipment_receipt_identity_conflict';end if;

  if p_action='deposit' then
    v_source_path:=private.market_source_stack_path_v2(
      v_row.state,p_character_location,p_character_id,p_character_index);
    v_target_path:=array['bank','stacks','0'];
  else
    v_source_path:=array['bank','stacks',p_bank_index::text];
    v_target_path:=private.market_source_stack_path_v2(
      v_row.state,p_character_location,p_character_id,0);
  end if;
  if v_source_path is null or v_target_path is null
  then raise exception 'market_equipment_storage_location_invalid';end if;
  v_source_stacks_path:=v_source_path[1:pg_catalog.array_length(v_source_path,1)-1];
  v_target_stacks_path:=v_target_path[1:pg_catalog.array_length(v_target_path,1)-1];
  v_source_stacks:=v_row.state#>v_source_stacks_path;
  v_target_stacks:=v_row.state#>v_target_stacks_path;
  v_copy:=v_row.state#>v_source_path;
  if pg_catalog.jsonb_typeof(v_source_stacks) is distinct from 'array'
    or pg_catalog.jsonb_typeof(v_target_stacks) is distinct from 'array'
    or pg_catalog.jsonb_typeof(v_copy) is distinct from 'object'
    or v_copy->>'itemId' is distinct from v_provenance.item_id
    or v_copy->>'instanceId' is distinct from p_instance_id
    or v_copy->>'quantity' is distinct from '1'
    or exists(select 1 from pg_catalog.jsonb_object_keys(v_copy) k(name)
      where k.name not in ('itemId','quantity','instanceId'))
  then raise exception 'market_equipment_storage_location_invalid';end if;
  if pg_catalog.jsonb_array_length(v_target_stacks)>=1000
  then raise exception 'market_equipment_destination_full';end if;
  v_capacity:=(v_row.state#>>(
    v_target_stacks_path[1:pg_catalog.array_length(v_target_stacks_path,1)-1]
      ||array['capacity']))::bigint;
  if v_capacity is null or v_capacity<1 or v_capacity>1000
  then raise exception 'market_equipment_capacity_unverified';end if;
  if pg_catalog.jsonb_array_length(v_target_stacks)>=v_capacity
  then raise exception 'market_equipment_destination_full';end if;

  v_state:=pg_catalog.jsonb_set(v_row.state,v_source_stacks_path,
    v_source_stacks-(case when p_action='deposit'
      then p_character_index else p_bank_index end),false);
  v_state:=pg_catalog.jsonb_set(v_state,v_target_stacks_path,
    v_target_stacks||pg_catalog.jsonb_build_array(v_copy),false);
  if p_action='withdraw' then
    v_state:=pg_catalog.jsonb_set(
      v_state,
      array['account','craftedGearInstances',v_receipt_index::text,'ownerCharacterId'],
      pg_catalog.to_jsonb(p_character_id),false);
  end if;
  update private.market_equipment_provenance_v19
    set storage_state=case when p_action='deposit' then 'bank' else 'character' end,
        recipient_character_id=case when p_action='withdraw'
          then p_character_id else recipient_character_id end
    where exact_instance_id=p_instance_id and buyer_account_id=p_account_id
      and status='claimed' and storage_state=case when p_action='deposit'
        then 'character' else 'bank' end;
  if not found then raise exception 'market_equipment_custody_state_invalid';end if;
  -- The private V19 state trigger now strictly validates the selected custody
  -- mode. On error: provenance, stacks, receipt and audit all roll back.
  update public.online_game_states
    set state=v_state,revision=v_row.revision+1,updated_at=now()
    where account_id=p_account_id and revision=v_row.revision;
  if not found then raise exception 'market_stale_state';end if;
  v_result:=pg_catalog.jsonb_build_object(
    'instanceId',p_instance_id,'itemId',v_provenance.item_id,
    'action',p_action,'characterId',p_character_id,
    'characterLocation',p_character_location,
    'sourceRevision',p_expected_revision,'revision',v_row.revision+1,
    'storageState',case when p_action='deposit' then 'bank' else 'character' end,
    'requiredCharacterLevel',v_provenance.required_character_level,
    'replayed',false);
  insert into private.market_equipment_bank_actions_v21 (
    account_id,idempotency_key,request_hash,exact_instance_id,
    action,character_id,character_location,character_index,
    bank_index,source_revision,result
  ) values(p_account_id,p_idempotency_key,p_request_hash,p_instance_id,
    p_action,p_character_id,p_character_location,p_character_index,
    p_bank_index,p_expected_revision,v_result);
  return v_result;
end;
$market_bank_move$;
revoke all on function private.market_move_purchased_equipment_bank_v21(
  uuid,text,text,text,text,integer,integer,bigint,text,text)
 from public,anon,authenticated,service_role;

-- Hidden: no grants, approved SKUs, paid transactions or runtime flags.
commit;
