-- Hidden Player Market V22: immutable exact Forge sale genealogy and resale
-- preflight. Second-sale settlement remains EXPLICITLY DISABLED. Do not relax
-- lifetime escrow indexes or current-owner provenance until the full resale
-- reservation, cancellation, buyer claim and return path is audited.
begin;

-- A historical sale is a separate, immutable cycle. Do not overwrite the
-- source hold or receipt from the first sale when an item changes owners.
create table private.market_equipment_sale_chain_v22 (
  source_hold_id uuid primary key
    references private.market_equipment_escrows_v8(source_hold_id) on delete restrict,
  exact_instance_id text not null check(length(exact_instance_id) between 1 and 180),
  sale_ordinal integer not null check(sale_ordinal between 1 and 100),
  previous_source_hold_id uuid references
    private.market_equipment_sale_chain_v22(source_hold_id) on delete restrict,
  seller_account_id uuid not null
    references public.online_game_states(account_id) on delete restrict,
  buyer_account_id uuid not null
    references public.online_game_states(account_id) on delete restrict,
  buyer_character_id uuid not null,
  item_id text not null,
  original_receipt jsonb not null check(pg_catalog.jsonb_typeof(original_receipt)='object'),
  gross_gold bigint not null check(gross_gold between 1 and 1000000000000000),
  fee_gold bigint not null check(fee_gold>=0 and fee_gold<gross_gold),
  seller_payout_gold bigint not null check(seller_payout_gold>0),
  recorded_at timestamptz not null default now(),
  unique(exact_instance_id,sale_ordinal),
  unique(previous_source_hold_id),
  constraint market_sale_chain_consistency_v22 check(
    seller_account_id<>buyer_account_id
    and gross_gold=fee_gold+seller_payout_gold
    and ((sale_ordinal=1 and previous_source_hold_id is null)
      or (sale_ordinal>1 and previous_source_hold_id is not null))
  )
);
create index market_sale_chain_instance_v22
 on private.market_equipment_sale_chain_v22(exact_instance_id,sale_ordinal desc);
alter table private.market_equipment_sale_chain_v22 enable row level security;
revoke all on private.market_equipment_sale_chain_v22
 from public,anon,authenticated,service_role;

create function private.market_block_sale_chain_mutation_v22()
returns trigger language plpgsql volatile security invoker set search_path=''
as $market_chain_immutable$
begin
  raise exception 'market_sale_chain_immutable';
end;
$market_chain_immutable$;
revoke all on function private.market_block_sale_chain_mutation_v22()
 from public,anon,authenticated,service_role;
create trigger market_sale_chain_no_mutation_v22
 before update or delete on private.market_equipment_sale_chain_v22
 for each row execute function private.market_block_sale_chain_mutation_v22();

-- This trigger deliberately runs AFTER the V19 provenance INSERT trigger.
-- The current V19 single-owner provenance is not a substitute for a permanent
-- audit history. Each settled exact-sale delivery has one immutable cycle.
create function private.market_record_sale_chain_v22()
returns trigger language plpgsql volatile security definer set search_path=''
as $market_chain_insert$
declare
  v_gold private.market_gold_intents_v2%rowtype;
  v_owner private.market_equipment_provenance_v19%rowtype;
  v_gear private.market_equipment_escrows_v8%rowtype;
  v_last private.market_equipment_sale_chain_v22%rowtype;
  v_ordinal integer;
  v_prev uuid;
begin
  if new.status<>'pending'
    or new.receipt_payload->>'id' is distinct from new.exact_instance_id
    or new.receipt_payload->>'itemId' is distinct from new.item_id
  then raise exception 'market_sale_chain_delivery_invalid';end if;
  select * into v_gold from private.market_gold_intents_v2 i
    where i.source_hold_id=new.source_hold_id and i.status='settled'
      and i.seller_account_id=new.seller_account_id
      and i.buyer_account_id=new.buyer_account_id
      and i.quantity=1 for share;
  if not found then raise exception 'market_sale_chain_gold_mismatch';end if;
  select * into v_gear from private.market_equipment_escrows_v8 g
    where g.source_hold_id=new.source_hold_id
      and g.exact_instance_id=new.exact_instance_id
      and g.owner_account_id=new.seller_account_id
      and g.item_id=new.item_id and g.status='held' for share;
  if not found or new.receipt_payload is distinct from v_gear.exact_receipt
  then raise exception 'market_sale_chain_receipt_mismatch';end if;
  select * into v_owner from private.market_equipment_provenance_v19 p
    where p.exact_instance_id=new.exact_instance_id and p.source_hold_id=new.source_hold_id
      and p.buyer_account_id=new.buyer_account_id and p.buyer_character_id=v_gold.buyer_character_id
      and p.item_id=new.item_id and p.status='pending' for share;
  if not found then raise exception 'market_sale_chain_provenance_mismatch';end if;
  select * into v_last from private.market_equipment_sale_chain_v22
    where exact_instance_id=new.exact_instance_id
    order by sale_ordinal desc limit 1 for share;
  if found then
    -- The real V22 second-sale transition is not implemented. Keep it
    -- denied even if someone later relaxes old unique-index predicates.
    raise exception 'market_resale_chain_settlement_not_ready';
  end if;
  v_ordinal:=1;
  v_prev:=null;
  insert into private.market_equipment_sale_chain_v22(
    source_hold_id,exact_instance_id,sale_ordinal,previous_source_hold_id,
    seller_account_id,buyer_account_id,buyer_character_id,item_id,
    original_receipt,gross_gold,fee_gold,seller_payout_gold)
  values(
    new.source_hold_id,new.exact_instance_id,v_ordinal,v_prev,
    new.seller_account_id,new.buyer_account_id,v_gold.buyer_character_id,new.item_id,
    new.receipt_payload,v_gold.gross_gold,v_gold.fee_gold,v_gold.seller_payout_gold);
  return new;
end;
$market_chain_insert$;
revoke all on function private.market_record_sale_chain_v22()
 from public,anon,authenticated,service_role;
create trigger market_z_equipment_purchase_chain_v22
 after insert on private.market_equipment_purchase_deliveries_v9
 for each row execute function private.market_record_sale_chain_v22();

-- Defense in depth against previously sold copies being re-reserved through
-- the old V8 Forge escrow path. V8's lifetime-unique escrow/asset indexes
-- remain unchanged. Once a reviewed new custody transition exists, replace
-- this guard at the same time, never remove it in isolation.
create function private.market_block_resale_asset_reservation_v22()
returns trigger language plpgsql volatile security definer set search_path=''
as $market_second_sale_block$
begin
  if new.asset_kind='equipment' and exists(
    select 1 from private.market_equipment_sale_chain_v22 c
    where c.exact_instance_id=new.exact_instance_id
  ) then raise exception 'market_resale_escrow_not_ready';end if;
  return new;
end;
$market_second_sale_block$;
revoke all on function private.market_block_resale_asset_reservation_v22()
 from public,anon,authenticated,service_role;
create trigger market_block_second_equipment_reservation_v22
 before insert on private.market_custody_assets_v1
 for each row execute function private.market_block_resale_asset_reservation_v22();

-- Read-only eligibility for a later *explicit* resale operation. It cannot
-- authorize a reservation, approve a SKU, or release an old exact copy.
create function private.market_resale_preflight_v22(
  p_account_id uuid,p_instance_id text,p_holder text,p_location text,p_index integer
) returns jsonb
language plpgsql stable security invoker set search_path=''
as $market_resale_check$
declare
  v_game public.online_game_states%rowtype;
  v_owner private.market_equipment_provenance_v19%rowtype;
  v_history private.market_equipment_sale_chain_v22%rowtype;
  v_source_path text[];
  v_stack jsonb;
  v_receipt jsonb;
  v_protected boolean;
  v_valid boolean:=false;
  v_eligibility text:='market_resale_unverified';
begin
  if p_account_id is null or p_instance_id is null
    or length(p_instance_id) not between 1 and 180
    or p_holder is null or p_location is null
    or p_location not in ('inventory','equipment_pouch')
    or p_index is null or p_index not between 0 and 10000
  then raise exception 'market_resale_invalid_request';end if;
  select * into v_game from public.online_game_states
    where account_id=p_account_id;
  select * into v_owner from private.market_equipment_provenance_v19 p
    where p.exact_instance_id=p_instance_id and p.buyer_account_id=p_account_id
      and p.status='claimed' and p.storage_state='character'
      and p.recipient_character_id=p_holder;
  select * into v_history from private.market_equipment_sale_chain_v22 c
    where c.exact_instance_id=p_instance_id order by c.sale_ordinal desc limit 1;
  if v_game.state is not null and v_owner.exact_instance_id is not null
    and v_history.exact_instance_id is not null
    and v_history.buyer_account_id=p_account_id
    and v_history.item_id=v_owner.item_id
    and v_owner.source_hold_id=v_history.source_hold_id
    and private.market_owned_copy_valid_v19(
      v_game.state,p_holder,p_instance_id,v_owner.item_id,v_owner.original_receipt)
  then
    v_source_path:=private.market_source_stack_path_v2(
      v_game.state,p_location,p_holder,p_index);
    v_stack:=v_game.state#>v_source_path;
    select entry.value into v_receipt
      from pg_catalog.jsonb_array_elements(
        v_game.state#>'{account,craftedGearInstances}') entry(value)
      where entry.value->>'id'=p_instance_id;
    v_protected:=
      coalesce(v_receipt->>'locked','false')<>'false'
      or coalesce(v_game.state#>'{settings,lockedItemIds}','[]'::jsonb)
        @>pg_catalog.jsonb_build_array(v_owner.item_id)
      or coalesce(v_game.state#>'{settings,favoriteItemIds}','[]'::jsonb)
        @>pg_catalog.jsonb_build_array(v_owner.item_id)
      or pg_catalog.jsonb_path_exists(v_game.state,
         '$.**.savedLoadouts[*].equipment.* ? (@ == $item)',
         pg_catalog.jsonb_build_object('item',v_owner.item_id));
    if v_stack->>'instanceId'=p_instance_id
      and v_stack->>'itemId'=v_owner.item_id and v_stack->>'quantity'='1'
      and v_protected is false and
      exists(select 1 from private.market_item_policy_v1 p
        where p.item_id=v_owner.item_id and p.asset_kind='equipment'
          and p.tradable and p.binding_policy='unbound')
    then v_valid:=true;v_eligibility:='eligible_copy';end if;
  end if;
  return pg_catalog.jsonb_build_object(
    'candidate',v_valid,'canRelistNow',false,
    'reason',case when v_valid then 'market_resale_escrow_not_ready'
      else v_eligibility end,
    'lastSaleOrdinal',coalesce(v_history.sale_ordinal,0),
    'itemId',v_owner.item_id,
    'requiredCharacterLevel',v_owner.required_character_level);
end;
$market_resale_check$;
revoke all on function private.market_resale_preflight_v22(uuid,text,text,text,integer)
 from public,anon,authenticated,service_role;

-- All release checks, item approvals and escrow uniqueness remain untouched.
commit;
