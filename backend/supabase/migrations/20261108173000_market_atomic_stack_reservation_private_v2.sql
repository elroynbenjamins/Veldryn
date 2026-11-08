-- Hidden Player Market V2: transactional *prototype* for stack escrow.
--
-- This is deliberately NOT a trading release. There are no player/service
-- EXECUTE grants, no public RPCs, no routes, no UI and no live orders.
-- Release gates in market_runtime_guard_v1 remain CHECK-constrained to FALSE;
-- the curated item policy also remains CHECK-constrained to FALSE. Hence none
-- of the following inventory mutations can run in a deployed environment.
--
-- The functions use the real online_game_states JSON snapshot and its revision.
-- Legacy item_instances and account_bank_items are NOT substituted as truth.
-- First scope: ordinary resource/unsocketed gem stacks. Unique gear is denied.
-- Cancel/expiry persist a durable return entitlement, NOT an item credit.
-- Delivery claims, buy settlement and payout are intentionally not enabled.

begin;

-- Keep guarded state transition constraints, but reserve/release functions
-- can now be exercised in rollback-only isolated QA after relaxing the
-- separate (still permanently false) runtime and policy gates in that txn.
alter table private.market_custody_assets_v1
  drop constraint if exists market_custody_assets_v1_held_quantity_check;
alter table private.market_custody_assets_v1
  add constraint market_custody_held_quantity_bounds_v2
  check(held_quantity>=0 and held_quantity<=quantity);

alter table private.market_custody_holds_v1
  drop constraint if exists market_custody_holds_v1_status_check;
alter table private.market_custody_holds_v1
  add constraint market_hold_status_v2
  check(status in ('draft','held','released','settled'));

alter table private.market_custody_holds_v1
  add constraint market_hold_account_fk_target_v2 unique(hold_id,owner_account_id);

alter table private.market_custody_holds_v1
  add column if not exists expires_at timestamptz not null default (now()+interval '7 days');
create index if not exists market_hold_due_v2 on private.market_custody_holds_v1(expires_at)
  where status='held';

create table if not exists private.market_action_receipts_v2(
  owner_account_id uuid not null references public.online_game_states(account_id) on delete restrict,
  idempotency_key text not null check(length(idempotency_key) between 8 and 128),
  request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
  action text not null check(action in ('reserve','cancel','expire')),
  result jsonb not null check(pg_catalog.jsonb_typeof(result)='object'),
  created_at timestamptz not null default now(),
  primary key(owner_account_id,idempotency_key)
);

-- Seller refund is an immutable, account-owned entitlement. If their inventory
-- fills during a listing, cancellation cannot silently drop or dupe items.
-- Claim into inventory/storage requires a separate capacity-aware atomic RPC.
create table if not exists private.market_return_deliveries_v2(
  delivery_id uuid primary key default gen_random_uuid(),
  source_hold_id uuid not null unique references private.market_custody_holds_v1(hold_id) on delete restrict,
  recipient_account_id uuid not null references public.online_game_states(account_id) on delete restrict,
  item_id text not null,
  asset_kind text not null check(asset_kind in ('resource','gem')),
  quantity bigint not null check(quantity between 1 and 2147483647),
  stack_payload jsonb not null check(pg_catalog.jsonb_typeof(stack_payload)='object'),
  status text not null default 'pending' check(status='pending'),
  created_at timestamptz not null default now(),
  constraint market_return_correct_owner_v2 foreign key(source_hold_id,recipient_account_id)
    references private.market_custody_holds_v1(hold_id,owner_account_id)
    on delete restrict
);
create index if not exists market_return_account_pending_v2
  on private.market_return_deliveries_v2(recipient_account_id,created_at)
  where status='pending';

-- Accounting invariants for future Gold transactions. No Gold debit, credit,
-- payout or purchase function exists in this pass; all intents stay drafts.
create table if not exists private.market_gold_intents_v2(
  intent_id uuid primary key default gen_random_uuid(),
  source_hold_id uuid not null unique references private.market_custody_holds_v1(hold_id) on delete restrict,
  buyer_account_id uuid not null references public.online_game_states(account_id) on delete restrict,
  seller_account_id uuid not null references public.online_game_states(account_id) on delete restrict,
  buyer_character_id uuid not null,
  unit_price bigint not null check(unit_price between 1 and 1000000000000000),
  quantity bigint not null check(quantity between 1 and 2147483647),
  gross_gold bigint not null check(gross_gold between 1 and 1000000000000000),
  fee_gold bigint not null check(fee_gold>=0),
  seller_payout_gold bigint not null check(seller_payout_gold>=0),
  status text not null default 'draft' check(status='draft'),
  created_at timestamptz not null default now(),
  check(buyer_account_id<>seller_account_id),
  constraint market_gold_seller_matches_hold_v2 foreign key(source_hold_id,seller_account_id)
    references private.market_custody_holds_v1(hold_id,owner_account_id)
    on delete restrict,
  check(gross_gold::numeric=unit_price::numeric*quantity::numeric),
  check(gross_gold::numeric=fee_gold::numeric+seller_payout_gold::numeric)
);

alter table private.market_action_receipts_v2 enable row level security;
alter table private.market_return_deliveries_v2 enable row level security;
alter table private.market_gold_intents_v2 enable row level security;
revoke all on table
  private.market_action_receipts_v2,
  private.market_return_deliveries_v2,
  private.market_gold_intents_v2
from public,anon,authenticated,service_role;

-- Pure JSON path resolver. An inactive character must be unique within this
-- account's authoritative roster; ambiguous/missing holders fail closed.
create or replace function private.market_source_stack_path_v2(
  p_state jsonb,p_location text,p_holder text,p_index integer
) returns text[]
language plpgsql immutable security invoker set search_path=''
as $source_path$
declare
  v_ordinal bigint;
  v_matches integer:=0;
  v_index bigint;
begin
  if p_state is null or p_index is null or p_index<0 or p_index>10000
    or p_location is null or p_location not in
      ('inventory','bank','gem_pouch','equipment_pouch')
  then return null; end if;

  if p_location='bank' then
    if p_holder is not null then return null; end if;
    return array['bank','stacks',p_index::text];
  end if;
  if p_location='gem_pouch' then
    if p_holder is not null then return null; end if;
    return array['account','gemPouch','stacks',p_index::text];
  end if;
  if p_holder is null or length(p_holder)=0 then return null; end if;

  if p_state#>>'{character,id}'=p_holder then
    return case when p_location='inventory' then
      array['inventory','stacks',p_index::text]
    else array['character','equipmentPouch','stacks',p_index::text] end;
  end if;

  if pg_catalog.jsonb_typeof(p_state->'otherCharacters') is distinct from 'array'
  then return null; end if;
  for v_ordinal in
    select entry.ordinality
    from pg_catalog.jsonb_array_elements(p_state->'otherCharacters')
      with ordinality as entry(value,ordinality)
    where entry.value#>>'{character,id}'=p_holder
  loop
    v_matches:=v_matches+1;
    v_index:=v_ordinal-1;
  end loop;
  if v_matches<>1 then return null; end if;
  return case when p_location='inventory' then
    array['otherCharacters',v_index::text,'inventory','stacks',p_index::text]
  else array['otherCharacters',v_index::text,'character','equipmentPouch','stacks',p_index::text]
  end;
end;
$source_path$;

revoke all on function private.market_source_stack_path_v2(jsonb,text,text,integer)
  from public,anon,authenticated,service_role;

-- Mutates exactly one server snapshot row and one reserve ledger transaction.
-- The same account advisory lock is used by commit_online_game_server_v1.
-- Ordinary game commits with the previous revision reject as stale_state.
create or replace function private.market_reserve_stack_v2(
  p_account_id uuid,p_expected_revision bigint,p_location text,p_holder text,
  p_index integer,p_item_id text,p_quantity integer,
  p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_reserve$
declare
  v_row public.online_game_states%rowtype;
  v_policy private.market_item_policy_v1%rowtype;
  v_receipt private.market_action_receipts_v2%rowtype;
  v_path text[];
  v_stack jsonb;
  v_remaining bigint;
  v_state jsonb;
  v_asset uuid;
  v_hold uuid;
  v_result jsonb;
  v_locator text;
begin
  if p_account_id is null or p_expected_revision is null
    or p_expected_revision<0 or p_item_id is null
    or length(p_item_id) not between 1 and 180
    or p_quantity is null or p_quantity<1 or p_quantity>2147483647
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[a-zA-Z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
    or p_location is null or p_location not in ('inventory','bank','gem_pouch')
  then raise exception 'invalid_market_request'; end if;

  if not exists(select 1 from private.market_runtime_guard_v1
    where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled'; end if;

  select * into v_policy from private.market_item_policy_v1
  where item_id=p_item_id and tradable and binding_policy='unbound'
    and asset_kind in ('resource','gem');
  if not found then raise exception 'market_item_not_verified';end if;
  if p_location='gem_pouch' and v_policy.asset_kind<>'gem'
  then raise exception 'market_storage_kind_mismatch';end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_account_id::text,0));
  select * into v_row from public.online_game_states
  where account_id=p_account_id for update;
  if not found or v_row.state is null then raise exception 'market_state_missing';end if;

  select * into v_receipt from private.market_action_receipts_v2
  where owner_account_id=p_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.action<>'reserve'
      or v_receipt.request_hash<>p_request_hash
    then raise exception 'market_idempotency_conflict';end if;
    return v_receipt.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;

  if v_row.revision<>p_expected_revision then raise exception 'market_stale_state';end if;
  v_path:=private.market_source_stack_path_v2(v_row.state,p_location,p_holder,p_index);
  if v_path is null then raise exception 'market_source_missing';end if;
  v_stack:=v_row.state#>v_path;
  if pg_catalog.jsonb_typeof(v_stack) is distinct from 'object'
    or v_stack->>'itemId' is distinct from p_item_id
    or pg_catalog.jsonb_typeof(v_stack->'quantity') is distinct from 'number'
    or coalesce(v_stack->>'quantity','') !~ '^[0-9]{1,10}$'
  then raise exception 'market_source_identity_changed';end if;
  if exists(select 1 from pg_catalog.jsonb_object_keys(v_stack) as k(key)
    where k.key not in ('itemId','quantity'))
  then raise exception 'market_stack_binding_unverified';end if;
  v_remaining:=(v_stack->>'quantity')::bigint;
  if v_remaining<1 or v_remaining>2147483647 or v_remaining<p_quantity
  then raise exception 'market_insufficient_quantity';end if;

  -- Every protection is rechecked against the same locked snapshot.
  if coalesce(v_row.state#>'{settings,lockedItemIds}','[]'::jsonb)
      @>pg_catalog.jsonb_build_array(p_item_id)
    or coalesce(v_row.state#>'{settings,favoriteItemIds}','[]'::jsonb)
      @>pg_catalog.jsonb_build_array(p_item_id)
  then raise exception 'market_item_protected';end if;

  -- SQL cannot infer ingredients in dynamically resolved preparation routes.
  -- The conservative policy blocks those goals until server catalog consumers
  -- prove which quantities are genuinely disposable.
  if pg_catalog.jsonb_path_exists(v_row.state,
    '$.**.progressionGoals[*] ? (@.kind == "recipe_preparation")')
    or pg_catalog.jsonb_path_exists(v_row.state,
      '$.**.progressionGoals[*] ? (@.itemId == $item || @.outputItemId == $item)',
      pg_catalog.jsonb_build_object('item',p_item_id))
    or pg_catalog.jsonb_path_exists(v_row.state,
      '$.**.reservedInputs[*] ? (@.itemId == $item)',
      pg_catalog.jsonb_build_object('item',p_item_id))
  then raise exception 'market_material_reserved_for_progression';end if;

  v_locator:=pg_catalog.array_to_string(v_path,':');
  if v_remaining=p_quantity then
    v_state:=v_row.state#-v_path;
  else
    v_state:=pg_catalog.jsonb_set(v_row.state,v_path||array['quantity'],
      pg_catalog.to_jsonb((v_remaining-p_quantity)::integer),false);
  end if;

  insert into private.market_custody_assets_v1(
    owner_account_id,source_revision,source_location,source_character_id,
    source_locator,item_id,asset_kind,quantity,held_quantity,source_bound,
    verification_state,immutable_attributes
  ) values(
    p_account_id,v_row.revision,p_location,p_holder,v_locator,p_item_id,
    v_policy.asset_kind,p_quantity,p_quantity,false,'verified',
    pg_catalog.jsonb_build_object('stack',v_stack,'originalQuantity',v_remaining,
      'sourcePath',pg_catalog.to_jsonb(v_path))
  ) returning asset_id into v_asset;

  insert into private.market_custody_holds_v1(
    asset_id,owner_account_id,request_key,request_hash,held_quantity,status,
    source_revision,expires_at
  ) values(
    v_asset,p_account_id,p_idempotency_key,p_request_hash,p_quantity,'held',
    v_row.revision,now()+interval '7 days'
  ) returning hold_id into v_hold;

  update public.online_game_states
  set state=v_state,revision=v_row.revision+1,updated_at=now()
  where account_id=p_account_id and revision=v_row.revision;
  if not found then raise exception 'market_stale_state';end if;

  v_result:=pg_catalog.jsonb_build_object(
    'holdId',v_hold,'assetId',v_asset,'itemId',p_item_id,
    'quantity',p_quantity,'remaining',v_remaining-p_quantity,
    'revision',v_row.revision+1,'replayed',false);
  insert into private.market_action_receipts_v2(
    owner_account_id,idempotency_key,request_hash,action,result)
  values(p_account_id,p_idempotency_key,p_request_hash,'reserve',v_result);
  return v_result;
end;
$market_reserve$;

revoke all on function private.market_reserve_stack_v2(
  uuid,bigint,text,text,integer,text,integer,text,text)
from public,anon,authenticated,service_role;

commit;
