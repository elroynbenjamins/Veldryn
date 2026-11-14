-- Hidden Market V19. Buyer claims and post-claim ownership are protected
-- by an exact-copy, private provenance ledger. No feature activation.
-- This deliberately keeps purchased copies bound to their validated claim
-- recipient until a later audited transfer/disposal path is implemented.
begin;

create table private.market_equipment_provenance_v19 (
  exact_instance_id text primary key check(length(exact_instance_id) between 1 and 180),
  source_hold_id uuid not null unique
    references private.market_equipment_escrows_v8(source_hold_id) on delete restrict,
  buyer_account_id uuid not null
    references public.online_game_states(account_id) on delete restrict,
  buyer_character_id uuid not null,
  item_id text not null check(length(item_id) between 1 and 180),
  required_class_id text not null,
  required_character_level integer not null check(required_character_level between 1 and 108),
  rolled_rarity text not null check(rolled_rarity in
    ('common','uncommon','rare','epic','legendary','mythic')),
  original_receipt jsonb not null check(jsonb_typeof(original_receipt)='object'),
  status text not null default 'pending' check(status in ('pending','claimed')),
  recipient_character_id text,
  acquired_at timestamptz not null default now(),
  claimed_at timestamptz,
  constraint market_provenance_claim_shape_v19 check(
    (status='pending' and recipient_character_id is null and claimed_at is null)
    or (status='claimed' and recipient_character_id is not null and claimed_at is not null))
);
create index market_provenance_by_account_v19
  on private.market_equipment_provenance_v19(buyer_account_id)
  where status='claimed';
alter table private.market_equipment_provenance_v19 enable row level security;
revoke all on table private.market_equipment_provenance_v19
  from public,anon,authenticated,service_role;

-- The V18 before-Gold trigger has already approved the purchase. Capture
-- that exact locked buyer/gear/policy snapshot at the durable delivery insert.
create function private.market_record_equipment_purchase_v19()
returns trigger language plpgsql volatile security invoker set search_path=''
as $market_provenance_purchase$
declare
  v_intent private.market_gold_intents_v2%rowtype;
  v_policy private.market_acquisition_policy_v18%rowtype;
  v_floor integer;
  v_premium integer;
begin
  select * into v_intent from private.market_gold_intents_v2 i
    where i.source_hold_id=new.source_hold_id
      and i.buyer_account_id=new.buyer_account_id
      and i.seller_account_id=new.seller_account_id
      and i.status='settled' and i.quantity=1
    for share;
  if not found or new.status<>'pending'
    or new.receipt_payload->>'id' is distinct from new.exact_instance_id
    or new.receipt_payload->>'itemId' is distinct from new.item_id
    or new.receipt_payload->>'acquireSource' is distinct from 'craft'
  then raise exception 'market_provenance_purchase_invalid';end if;
  select * into v_policy from private.market_acquisition_policy_v18 p
    where p.item_id=new.item_id and p.asset_kind='equipment'
      and p.approved and p.catalog_revision=33 for share;
  if not found then raise exception 'market_item_policy_unapproved';end if;
  v_floor:=case v_policy.source_tier
    when 'T1' then 6 when 'T2' then 18
    when 'T3' then 30 when 'T4' then 52 else null end;
  v_premium:=case new.receipt_payload->>'rarity'
    when 'common' then 0 when 'uncommon' then 0
    when 'rare' then 2 when 'epic' then 4
    when 'legendary' then 6 when 'mythic' then 8
    else null end;
  if v_floor is null or v_premium is null then
    raise exception 'market_provenance_purchase_invalid';end if;
  insert into private.market_equipment_provenance_v19(
    exact_instance_id,source_hold_id,buyer_account_id,buyer_character_id,
    item_id,required_class_id,required_character_level,rolled_rarity,
    original_receipt)
  values(
    new.exact_instance_id,new.source_hold_id,new.buyer_account_id,
    v_intent.buyer_character_id,new.item_id,v_policy.required_class_id,
    greatest(v_floor,v_policy.item_required_level)+v_premium,
    new.receipt_payload->>'rarity',new.receipt_payload);
  return new;
end;
$market_provenance_purchase$;
revoke all on function private.market_record_equipment_purchase_v19()
  from public,anon,authenticated,service_role;
create trigger market_equipment_purchase_provenance_v19
 after insert on private.market_equipment_purchase_deliveries_v9
 for each row execute function private.market_record_equipment_purchase_v19();

-- Inspects the actual prospective full game snapshot. This protects the
-- purchaser's exact receipt through normal online-game saves, character
-- swaps, bank moves and ordinary equip/unequip without touching crafted gear
-- that was never purchased through Market.
create function private.market_owned_copy_valid_v19(
  p_state jsonb,p_owner text,p_instance text,p_item text,p_origin jsonb
) returns boolean
language plpgsql stable security invoker set search_path=''
as $market_owned_copy$
declare
  v_held jsonb;
  v_owner jsonb;
  v_inventory jsonb;
  v_candidate jsonb;
  v_record jsonb;
  v_receipt_count integer:=0;
  v_owner_count integer:=0;
  v_physical_count integer;
  v_local_count integer;
  v_vars jsonb;
begin
  if p_state is null or p_owner is null or p_instance is null
    or p_item is null or p_origin is null
    or pg_catalog.jsonb_typeof(p_state#>'{account,craftedGearInstances}') is distinct from 'array'
  then return false;end if;
  for v_record in select value from pg_catalog.jsonb_array_elements(
    p_state#>'{account,craftedGearInstances}')
  loop
    if v_record->>'id'=p_instance then
      v_receipt_count:=v_receipt_count+1;
      if v_record->>'itemId' is distinct from p_item
        or v_record->>'ownerCharacterId' is distinct from p_owner
        -- Lock/enchants are mutable, but not the actual crafted identity,
        -- rarity, quality, roll, timestamps or source receipt.
        or (v_record-'enhancement'-'locked'-'ownerCharacterId')
             is distinct from (p_origin-'enhancement'-'locked'-'ownerCharacterId')
      then return false;end if;
    end if;
  end loop;
  if v_receipt_count<>1 then return false;end if;
  if p_state#>>'{character,id}'=p_owner then
    v_owner_count:=v_owner_count+1;
    v_owner:=p_state->'character';
    v_inventory:=p_state->'inventory';
  end if;
  for v_held in select value from pg_catalog.jsonb_array_elements(
    case when pg_catalog.jsonb_typeof(p_state->'otherCharacters')='array'
      then p_state->'otherCharacters' else '[]'::jsonb end)
  loop
    if v_held#>>'{character,id}'=p_owner then
      v_owner_count:=v_owner_count+1;
      v_owner:=v_held->'character';
      v_inventory:=v_held->'inventory';
    end if;
  end loop;
  if v_owner_count<>1 or v_owner is null or v_inventory is null
  then return false;end if;
  v_vars:=pg_catalog.jsonb_build_object('inst',p_instance);
  -- Exactly one physical occurrence across all players' inventory, pouch,
  -- bank, saved and equipped slots. Bank copies are never accepted as a
  -- destination for market-acquired gear in this hidden version.
  v_physical_count:=pg_catalog.jsonb_array_length(pg_catalog.jsonb_path_query_array(
    p_state,'$.**.stacks[*] ? (@.instanceId == $inst)',v_vars))
    +pg_catalog.jsonb_array_length(pg_catalog.jsonb_path_query_array(
    p_state,'$.**.equipmentInstanceIds.* ? (@ == $inst)',v_vars));
  if v_physical_count<>1 then return false;end if;
  v_candidate:=pg_catalog.jsonb_build_object(
    'character',v_owner,'inventory',v_inventory);
  v_local_count:=pg_catalog.jsonb_array_length(pg_catalog.jsonb_path_query_array(
    v_candidate,'$.**.stacks[*] ? (@.instanceId == $inst)',v_vars))
    +pg_catalog.jsonb_array_length(pg_catalog.jsonb_path_query_array(
    v_candidate,'$.**.equipmentInstanceIds.* ? (@ == $inst)',v_vars));
  if v_local_count<>1 then return false;end if;
  -- A physical stack must have the expected exact SKU and quantity 1.
  for v_record in select q.value from pg_catalog.jsonb_path_query(
    v_candidate,'$.**.stacks[*] ? (@.instanceId == $inst)',v_vars) as q(value)
  loop
    if v_record->>'itemId' is distinct from p_item
      or v_record->>'quantity' is distinct from '1' then return false;end if;
  end loop;
  return true;
end;
$market_owned_copy$;
revoke all on function private.market_owned_copy_valid_v19(jsonb,text,text,text,jsonb)
 from public,anon,authenticated,service_role;

-- The V9 claim function updates the account state, then flips the delivery
-- from pending to claimed in ONE transaction. The after-state snapshot is
-- visible here, and any rejection rolls the entire claim back. We do not
-- rewrite the V9 claim path or change its idempotency receipts.
create function private.market_enforce_equipment_delivery_v19()
returns trigger language plpgsql volatile security invoker set search_path=''
as $market_provenance_claim$
declare
  v_provenance private.market_equipment_provenance_v19%rowtype;
  v_state jsonb;
  v_entry jsonb;
  v_recipient jsonb;
  v_match_count integer:=0;
  v_xp_text text;
  v_level integer;
begin
  if new.status=old.status then
    if new is distinct from old then raise exception 'market_provenance_delivery_immutable';end if;
    return new;
  end if;
  if old.status<>'pending' or new.status<>'claimed'
    or new.source_hold_id is distinct from old.source_hold_id
    or new.buyer_account_id is distinct from old.buyer_account_id
    or new.seller_account_id is distinct from old.seller_account_id
    or new.exact_instance_id is distinct from old.exact_instance_id
    or new.item_id is distinct from old.item_id
    or new.receipt_payload is distinct from old.receipt_payload
    or new.stack_payload is distinct from old.stack_payload
    or new.claimed_at is null or new.destination_revision is null
    or new.destination_character_id is null
  then raise exception 'market_provenance_delivery_invalid';end if;
  if new.destination_location='bank' then
    raise exception 'market_equipment_shared_bank_restricted';end if;
  select * into v_provenance from private.market_equipment_provenance_v19
    where source_hold_id=new.source_hold_id
      and buyer_account_id=new.buyer_account_id
      and exact_instance_id=new.exact_instance_id
      and status='pending' for update;
  if not found then raise exception 'market_equipment_provenance_missing';end if;
  select s.state into v_state from public.online_game_states s
    where s.account_id=new.buyer_account_id and s.revision=new.destination_revision
    for share;
  if not found or v_state is null then
    raise exception 'market_equipment_claim_state_mismatch';end if;
  if v_state#>>'{character,id}'=new.destination_character_id then
    v_match_count:=v_match_count+1;
    v_recipient:=v_state->'character';
  end if;
  for v_entry in select value from pg_catalog.jsonb_array_elements(
    case when pg_catalog.jsonb_typeof(v_state->'otherCharacters')='array'
      then v_state->'otherCharacters' else '[]'::jsonb end)
  loop
    if v_entry#>>'{character,id}'=new.destination_character_id then
      v_match_count:=v_match_count+1;
      v_recipient:=v_entry->'character';
    end if;
  end loop;
  if v_match_count<>1 or not exists(select 1 from public.characters c
    where c.id::text=new.destination_character_id
      and c.account_id=new.buyer_account_id
      and c.class_id::text=v_provenance.required_class_id)
    or v_recipient->>'classId' is distinct from v_provenance.required_class_id
  then raise exception 'market_class_or_recipient_required';end if;
  if pg_catalog.jsonb_typeof(v_recipient->'xp') is distinct from 'number'
    or coalesce(v_recipient->>'xp','') !~ '^[0-9]{1,16}$'
  then raise exception 'market_character_xp_invalid';end if;
  v_xp_text:=v_recipient->>'xp';
  if v_xp_text::numeric>9007199254740991 then
    raise exception 'market_character_xp_invalid';end if;
  v_level:=private.market_character_level_from_xp_v18(v_xp_text::bigint);
  if v_level<v_provenance.required_character_level then
    raise exception using message='market_level_required',
      detail='Requires character level '||v_provenance.required_character_level::text;
  end if;
  if not private.market_owned_copy_valid_v19(
    v_state,new.destination_character_id,new.exact_instance_id,
    new.item_id,v_provenance.original_receipt)
  then raise exception 'market_equipment_claim_snapshot_invalid';end if;
  update private.market_equipment_provenance_v19
    set status='claimed',recipient_character_id=new.destination_character_id,
      claimed_at=new.claimed_at
    where source_hold_id=new.source_hold_id and status='pending';
  if not found then raise exception 'market_equipment_provenance_missing';end if;
  return new;
end;
$market_provenance_claim$;
revoke all on function private.market_enforce_equipment_delivery_v19()
 from public,anon,authenticated,service_role;
create trigger market_equipment_purchase_claim_guard_v19
 before update on private.market_equipment_purchase_deliveries_v9
 for each row execute function private.market_enforce_equipment_delivery_v19();

-- This also catches normal game snapshot writes that do not call a Market
-- function (e.g., bank withdrawal, character switch, loadout edit). For
-- market-purchased copies only, a single validated destination is pinned.
-- Changing that character or moving the item to the shared bank is blocked
-- until a future reviewed, atomic recipient-transfer mechanism is added.
create function private.market_guard_owned_equipment_snapshot_v19()
returns trigger language plpgsql volatile security invoker set search_path=''
as $market_saved_provenance$
declare
  v_provenance private.market_equipment_provenance_v19%rowtype;
begin
  for v_provenance in select * from private.market_equipment_provenance_v19 p
    where p.buyer_account_id=new.account_id and p.status='claimed'
  loop
    if not private.market_owned_copy_valid_v19(
      new.state,v_provenance.recipient_character_id,
      v_provenance.exact_instance_id,v_provenance.item_id,
      v_provenance.original_receipt)
    then raise exception 'market_equipment_provenance_transfer_blocked';end if;
  end loop;
  return new;
end;
$market_saved_provenance$;
revoke all on function private.market_guard_owned_equipment_snapshot_v19()
 from public,anon,authenticated,service_role;
create trigger market_guard_online_equipment_provenance_v19
 before update of state on public.online_game_states
 for each row execute function private.market_guard_owned_equipment_snapshot_v19();

-- Purchases, claims, and all policy approvals remain entirely disabled.
commit;
