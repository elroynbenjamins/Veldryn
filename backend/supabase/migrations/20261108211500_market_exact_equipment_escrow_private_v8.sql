-- Hidden Market V8a: exact crafted equipment custody, no sale or payout.
-- No RPC grants, client routes or production release. The independent hard
-- false global guard, default-deny policy and gear guard must all pass.
begin;

create table private.market_equipment_guard_v8(
  singleton boolean primary key default true check(singleton),
  equipment_transfers_enabled boolean not null default false
    check(equipment_transfers_enabled=false)
);
insert into private.market_equipment_guard_v8(singleton,equipment_transfers_enabled)
 values(true,false);
alter table private.market_equipment_guard_v8 enable row level security;
revoke all on table private.market_equipment_guard_v8
  from public,anon,authenticated,service_role;

alter table private.market_action_receipts_v2
  drop constraint if exists market_action_receipt_action_v5;
alter table private.market_action_receipts_v2
  add constraint market_action_receipt_action_v8
    check(action in ('reserve','cancel','expire','claim_return','claim_purchase',
      'publish_offer','cancel_offer','reserve_equipment',
      'cancel_equipment','claim_equipment_return'));

-- No listing or sale of equipment is enabled in V8. This ledger owns the
-- exact per-copy Forge receipt whenever the server removes its physical stack.
create table private.market_equipment_escrows_v8(
  source_hold_id uuid primary key
    references private.market_custody_holds_v1(hold_id) on delete restrict,
  asset_id uuid not null unique
    references private.market_custody_assets_v1(asset_id) on delete restrict,
  owner_account_id uuid not null references public.online_game_states(account_id)
    on delete restrict,
  exact_instance_id text not null check(length(exact_instance_id) between 1 and 180),
  item_id text not null check(length(item_id) between 1 and 180),
  original_owner_character_id text not null,
  exact_receipt jsonb not null check(jsonb_typeof(exact_receipt)='object'),
  status text not null default 'held' check(status in ('held','returned')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index market_equipment_instance_escrow_v8
  on private.market_equipment_escrows_v8(exact_instance_id);
alter table private.market_equipment_escrows_v8 enable row level security;
revoke all on table private.market_equipment_escrows_v8
  from public,anon,authenticated,service_role;

create or replace function private.market_reserve_exact_equipment_v8(
  p_account_id uuid,p_expected_revision bigint,p_location text,p_holder text,
  p_index integer,p_item_id text,p_instance_id text,
  p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_gear_reserve$
declare
  v_state public.online_game_states%rowtype;
  v_action private.market_action_receipts_v2%rowtype;
  v_path text[];
  v_stack jsonb;
  v_receipt jsonb;
  v_records jsonb;
  v_remaining_records jsonb;
  v_new_state jsonb;
  v_asset_id uuid;
  v_hold_id uuid;
  v_result jsonb;
  v_stack_count integer;
  v_receipt_count integer;
  v_owner_count integer;
  v_ordinal bigint;
  v_slot text;
  v_item text;
  v_preset jsonb;
  v_char jsonb;
  v_enh jsonb;
  v_stat text;
  v_effect text;
  v_gems jsonb;
  v_asset_source text;
begin
  if p_account_id is null or p_expected_revision is null or p_expected_revision<0
    or p_location is null or p_location not in ('inventory','bank','equipment_pouch')
    or p_index is null or p_index<0 or p_index>10000
    or p_item_id is null or length(p_item_id) not between 1 and 180
    or p_instance_id is null or length(p_instance_id) not between 1 and 180
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
    or (p_location='bank' and p_holder is not null)
    or (p_location<>'bank' and (p_holder is null or length(p_holder)=0))
  then raise exception 'market_equipment_invalid_request';end if;

  if not exists(select 1 from private.market_runtime_guard_v1
      where singleton and trading_enabled and snapshot_bridge_ready)
    or not exists(select 1 from private.market_equipment_guard_v8
      where singleton and equipment_transfers_enabled)
  then raise exception 'market_disabled';end if;
  if not exists(select 1 from private.market_item_policy_v1
      where item_id=p_item_id and asset_kind='equipment'
        and tradable and binding_policy='unbound')
  then raise exception 'market_equipment_not_tradable';end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_account_id::text,0));
  select * into v_state from public.online_game_states
    where account_id=p_account_id for update;
  if not found or v_state.state is null then raise exception 'market_state_missing';end if;

  select * into v_action from private.market_action_receipts_v2
    where owner_account_id=p_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_action.action<>'reserve_equipment'
      or v_action.request_hash<>p_request_hash
      or v_action.result->>'itemId' is distinct from p_item_id
      or v_action.result->>'instanceId' is distinct from p_instance_id
      or v_action.result->>'sourceLocation' is distinct from p_location
      or v_action.result->>'sourceCharacterId' is distinct from p_holder
      or v_action.result->>'sourceIndex' is distinct from p_index::text
      or v_action.result->>'sourceRevision' is distinct from p_expected_revision::text
    then raise exception 'market_idempotency_conflict';end if;
    return v_action.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;
  if v_state.revision<>p_expected_revision then raise exception 'market_stale_state';end if;
  v_path:=private.market_source_stack_path_v2(
    v_state.state,p_location,p_holder,p_index);
  if v_path is null then raise exception 'market_equipment_holder_unverified';end if;
  v_stack:=v_state.state#>v_path;
  if pg_catalog.jsonb_typeof(v_stack) is distinct from 'object'
    or v_stack->>'itemId' is distinct from p_item_id
    or v_stack->>'instanceId' is distinct from p_instance_id
    or v_stack->>'quantity' is distinct from '1'
    or exists(select 1 from pg_catalog.jsonb_object_keys(v_stack) k(key)
      where k.key not in ('itemId','quantity','instanceId'))
  then raise exception 'market_equipment_source_unverified';end if;

  v_records:=v_state.state#>'{account,craftedGearInstances}';
  if pg_catalog.jsonb_typeof(v_records) is distinct from 'array'
  then raise exception 'market_equipment_receipt_ledger_missing';end if;
  select count(*) into v_receipt_count
    from pg_catalog.jsonb_array_elements(v_records) entry(value)
    where entry.value->>'id'=p_instance_id;
  select entry.value into v_receipt
    from pg_catalog.jsonb_array_elements(v_records) entry(value)
    where entry.value->>'id'=p_instance_id limit 1;
  if v_receipt_count<>1 or v_receipt->>'itemId' is distinct from p_item_id
    or v_receipt->>'acquireSource' is distinct from 'craft'
    or nullif(v_receipt->>'sourceReceiptKey','') is null
    or nullif(v_receipt->>'ownerCharacterId','') is null
    or coalesce(v_receipt->>'rarity','') not in
       ('common','uncommon','rare','epic','legendary','mythic')
    or v_receipt->>'locked'='true'
    or pg_catalog.jsonb_typeof(v_receipt->'quality') is distinct from 'number'
    or coalesce(v_receipt->>'quality','') !~ '^(100|[1-9]?[0-9])$'
    or pg_catalog.jsonb_typeof(v_receipt->'createdAtMs') is distinct from 'number'
    or coalesce(v_receipt->>'createdAtMs','') !~ '^(0|[1-9][0-9]{0,15})$'
    or (v_receipt ? 'statRoll' and
        (pg_catalog.jsonb_typeof(v_receipt->'statRoll') is distinct from 'number'
         or (v_receipt->>'statRoll')::numeric<0
         or (v_receipt->>'statRoll')::numeric>=1))
  then raise exception 'market_equipment_receipt_unverified';end if;

  -- The original owner must be a character saved on the seller account.
  select count(*) into v_owner_count
  from (
    select v_state.state->'character' as value
    union all
    select item.value->'character' from
      pg_catalog.jsonb_array_elements(
       case when pg_catalog.jsonb_typeof(v_state.state->'otherCharacters')='array'
         then v_state.state->'otherCharacters' else '[]'::jsonb end) item
  ) chars
  where chars.value->>'id'=v_receipt->>'ownerCharacterId';
  if v_owner_count<>1 then raise exception 'market_equipment_original_owner_missing';end if;

  select count(*) into v_stack_count
  from pg_catalog.jsonb_path_query(v_state.state,
    '$.**.stacks[*] ? (@.instanceId == $instance)',
    pg_catalog.jsonb_build_object('instance',p_instance_id)) as copies;
  if v_stack_count<>1
    or pg_catalog.jsonb_path_exists(v_state.state,
        '$.**.equipmentInstanceIds.* ? (@ == $instance)',
        pg_catalog.jsonb_build_object('instance',p_instance_id))
    or pg_catalog.jsonb_path_exists(v_state.state,
        '$.**.stacks[*] ? (@.itemId == $item && !exists(@.instanceId))',
        pg_catalog.jsonb_build_object('item',p_item_id))
  then raise exception 'market_equipment_identity_ambiguous';end if;

  if coalesce(v_state.state#>'{settings,lockedItemIds}','[]'::jsonb)
      @>pg_catalog.jsonb_build_array(p_item_id)
    or coalesce(v_state.state#>'{settings,favoriteItemIds}','[]'::jsonb)
      @>pg_catalog.jsonb_build_array(p_item_id)
  then raise exception 'market_equipment_protected';end if;
  if pg_catalog.jsonb_path_exists(v_state.state,
      '$.**.progressionGoals[*] ? (@.itemId == $item || @.outputItemId == $item)',
      pg_catalog.jsonb_build_object('item',p_item_id))
    or pg_catalog.jsonb_path_exists(v_state.state,
      '$.**.reservedInputs[*] ? (@.itemId == $item)',
      pg_catalog.jsonb_build_object('item',p_item_id))
  then raise exception 'market_equipment_reserved';end if;

  -- Every active/inactive character's saved loadouts and old per-item upgrades
  -- are checked, not just the currently selected character.
  for v_char in select value from (
    select v_state.state->'character' as value
    union all
    select elem.value->'character' from
      pg_catalog.jsonb_array_elements(
       case when pg_catalog.jsonb_typeof(v_state.state->'otherCharacters')='array'
         then v_state.state->'otherCharacters' else '[]'::jsonb end) elem
  ) chars loop
    if pg_catalog.jsonb_typeof(v_char->'gearEnhancements')='object'
      and v_char->'gearEnhancements' ? p_item_id
      and (
        coalesce((v_char#>array['gearEnhancements',p_item_id,'rank'])::text,'0')<>'0'
        or coalesce((v_char#>array['gearEnhancements',p_item_id,'failures'])::text,'0')<>'0'
        or v_char#>array['gearEnhancements',p_item_id,'statGemId'] is not null
        or v_char#>array['gearEnhancements',p_item_id,'effectGemId'] is not null
        or coalesce(v_char#>array['gearEnhancements',p_item_id,'gemIds'],'[]'::jsonb)<>'[]'::jsonb
      )
    then raise exception 'market_equipment_legacy_enhancement';end if;
    if pg_catalog.jsonb_typeof(v_char->'savedLoadouts')='array' then
      for v_preset in select value from pg_catalog.jsonb_array_elements(v_char->'savedLoadouts') loop
        if pg_catalog.jsonb_typeof(v_preset->'equipment')='object' then
          for v_slot,v_item in select key,value from pg_catalog.jsonb_each_text(v_preset->'equipment') loop
            if v_item=p_item_id and (
               v_preset#>>array['equipmentInstanceIds',v_slot] is null
               or v_preset#>>array['equipmentInstanceIds',v_slot]=p_instance_id)
            then raise exception 'market_equipment_saved_loadout';end if;
          end loop;
        end if;
      end loop;
    end if;
  end loop;

  -- No gem can silently be fabricated or unbound by a market transfer.
  v_enh:=v_receipt->'enhancement';
  if pg_catalog.jsonb_typeof(v_enh) is distinct from 'object'
    or coalesce(v_enh->>'rank','') !~ '^[0-4]$'
    or coalesce(v_enh->>'failures','') !~ '^(0|[1-9][0-9]{0,9})$'
    or pg_catalog.jsonb_typeof(v_enh->'gemIds') is distinct from 'array'
    or pg_catalog.jsonb_array_length(v_enh->'gemIds')>2
  then raise exception 'market_equipment_enhancement_unverified';end if;
  v_stat:=v_enh->>'statGemId';
  v_effect:=v_enh->>'effectGemId';
  if (v_stat is not null and v_stat !~ '^gem:stat_[a-z_]+:g[1-5]$')
     or (v_effect is not null and v_effect !~ '^gem:effect_[a-z_]+:g[1-5]$')
  then raise exception 'market_equipment_socket_unverified';end if;
  v_gems:='[]'::jsonb;
  if v_stat is not null then
    if not exists(select 1 from private.market_item_policy_v1
        where item_id=v_stat and asset_kind='gem'
          and tradable and binding_policy='unbound')
    then raise exception 'market_equipment_socket_unverified';end if;
    v_gems:=v_gems||pg_catalog.jsonb_build_array(v_stat);
  end if;
  if v_effect is not null then
    if not exists(select 1 from private.market_item_policy_v1
        where item_id=v_effect and asset_kind='gem'
          and tradable and binding_policy='unbound')
    then raise exception 'market_equipment_socket_unverified';end if;
    v_gems:=v_gems||pg_catalog.jsonb_build_array(v_effect);
  end if;
  if v_enh->'gemIds'<>v_gems
  then raise exception 'market_equipment_socket_unverified';end if;

  -- Remove EXACTLY the one physical copy and its exact Forge receipt. If any
  -- later insert fails both go back together, never an inventory-only debit.
  select coalesce(pg_catalog.jsonb_agg(e.value order by e.ordinality),'[]'::jsonb)
    into v_remaining_records
  from pg_catalog.jsonb_array_elements(v_records) with ordinality as e(value,ordinality)
  where e.value->>'id' is distinct from p_instance_id;
  v_new_state:=pg_catalog.jsonb_set(v_state.state#-v_path,
    '{account,craftedGearInstances}',v_remaining_records,false);
  v_asset_source:=pg_catalog.array_to_string(v_path,':');
  insert into private.market_custody_assets_v1(
    owner_account_id,source_revision,source_location,source_character_id,
    source_locator,item_id,asset_kind,exact_instance_id,source_receipt_key,
    quantity,held_quantity,source_bound,verification_state,immutable_attributes
  ) values(
    p_account_id,v_state.revision,p_location,p_holder,v_asset_source,
    p_item_id,'equipment',p_instance_id,v_receipt->>'sourceReceiptKey',
    1,1,false,'verified',
    pg_catalog.jsonb_build_object('stack',v_stack,'exactReceipt',v_receipt,
      'sourcePath',pg_catalog.to_jsonb(v_path))
  ) returning asset_id into v_asset_id;
  insert into private.market_custody_holds_v1(
    asset_id,owner_account_id,request_key,request_hash,held_quantity,
    status,source_revision,expires_at
  ) values(
    v_asset_id,p_account_id,p_idempotency_key,p_request_hash,1,
    'held',v_state.revision,now()+interval '7 days'
  ) returning hold_id into v_hold_id;
  insert into private.market_equipment_escrows_v8(
    source_hold_id,asset_id,owner_account_id,exact_instance_id,item_id,
    original_owner_character_id,exact_receipt
  ) values(
    v_hold_id,v_asset_id,p_account_id,p_instance_id,p_item_id,
    v_receipt->>'ownerCharacterId',v_receipt
  );
  update public.online_game_states
    set state=v_new_state,revision=v_state.revision+1,updated_at=now()
    where account_id=p_account_id and revision=v_state.revision;
  if not found then raise exception 'market_stale_state';end if;

  v_result:=pg_catalog.jsonb_build_object(
    'holdId',v_hold_id,'assetId',v_asset_id,
    'instanceId',p_instance_id,'itemId',p_item_id,
    'sourceLocation',p_location,'sourceCharacterId',p_holder,
    'sourceIndex',p_index,'sourceRevision',v_state.revision,
    'revision',v_state.revision+1,'status','held','replayed',false);
  insert into private.market_action_receipts_v2(
    owner_account_id,idempotency_key,request_hash,action,result)
  values(p_account_id,p_idempotency_key,p_request_hash,'reserve_equipment',v_result);
  return v_result;
end;
$market_gear_reserve$;

revoke all on function private.market_reserve_exact_equipment_v8(
  uuid,bigint,text,text,integer,text,text,text,text)
  from public,anon,authenticated,service_role;

comment on function private.market_reserve_exact_equipment_v8(
  uuid,bigint,text,text,integer,text,text,text,text) is
  'Hidden, disabled: exact Forge copy escrow + atomic authoritative state and receipt debit; no sales or transfers.';
commit;
