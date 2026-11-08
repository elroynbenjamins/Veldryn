-- Player Market custody foundation (NOT a market release).
-- No client routes, listing commands, item transfers or wallet transfers are
-- installed by this migration. The live game still uses online_game_states.state
-- and its revision; legacy item_instances/account_bank_items are NOT authoritative
-- for every online character's inventory.
--
-- All rows begin unverified and must be reconciled against an exact server-owned
-- game snapshot before any future migration may unlock trading.
-- The CHECK constraints on both release gates deliberately require a new code
-- review + SQL migration to change the disabled state.
begin;

create schema if not exists private;

create table if not exists private.market_runtime_guard_v1 (
  singleton boolean primary key default true check (singleton),
  trading_enabled boolean not null default false check (trading_enabled = false),
  snapshot_bridge_ready boolean not null default false check (snapshot_bridge_ready = false),
  updated_at timestamptz not null default now()
);

insert into private.market_runtime_guard_v1(singleton,trading_enabled,snapshot_bridge_ready)
values(true,false,false)
on conflict(singleton) do nothing;

-- Default-deny item registry. Do not populate by guessing from NPC resale
-- values. Tradability must be curated by the authoritative server/catalog.
create table if not exists private.market_item_policy_v1 (
  item_id text primary key check (length(item_id) between 1 and 180),
  asset_kind text not null check(asset_kind in ('resource','gem','equipment')),
  tradable boolean not null default false check (tradable = false),
  binding_policy text not null default 'unverified'
    check (binding_policy in ('unverified','unbound','account_bound','character_bound','event_bound')),
  updated_at timestamptz not null default now()
);

-- One row models one *potential* physical copy or stack from a specific saved
-- online-game snapshot. This is a future reconciliation ledger, not a second
-- spendable inventory. Never backfill from legacy item IDs or infer quality.
create table if not exists private.market_custody_assets_v1 (
  asset_id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null
    references public.online_game_states(account_id) on delete restrict,
  source_revision bigint not null check(source_revision >= 0),
  source_location text not null
    check(source_location in ('inventory','bank','equipment_pouch','gem_pouch')),
  source_character_id text,
  source_locator text not null check(length(source_locator) between 1 and 200),
  item_id text not null check(length(item_id) between 1 and 180),
  asset_kind text not null check(asset_kind in ('resource','gem','equipment')),
  -- Only an actual single-copy receipt, never an item type, identifies gear.
  exact_instance_id text,
  source_receipt_key text,
  quantity bigint not null check(quantity between 1 and 2147483647),
  -- Release migration must explicitly relax this constraint before any hold.
  held_quantity bigint not null default 0 check(held_quantity = 0),
  source_bound boolean not null default true,
  verification_state text not null default 'unverified'
    check(verification_state in ('unverified','verified','rejected')),
  source_snapshot_hash text check(source_snapshot_hash ~ '^[a-f0-9]{64}$'),
  immutable_attributes jsonb not null default '{}'::jsonb
    check(jsonb_typeof(immutable_attributes) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_custody_asset_shape_v1 check (
    (asset_kind = 'equipment' and exact_instance_id is not null
      and length(exact_instance_id) between 1 and 180 and quantity = 1)
    or (asset_kind <> 'equipment' and exact_instance_id is null)
  ),
  constraint market_custody_unique_source_v1 unique(
    owner_account_id,source_revision,source_location,source_locator
  ),
  constraint market_custody_asset_owner_key_v1 unique(asset_id,owner_account_id),
  constraint market_custody_source_holder_v1 check (
    (source_location in ('inventory','equipment_pouch') and source_character_id is not null)
    or (source_location in ('bank','gem_pouch') and source_character_id is null)
  ),
  constraint market_custody_storage_kind_v1 check (
    (source_location <> 'equipment_pouch' or asset_kind = 'equipment')
    and (source_location <> 'gem_pouch' or asset_kind = 'gem')
  )
);

-- An exact equipment receipt is globally unique, including between accounts.
create unique index if not exists market_custody_equipment_instance_unique_v1
  on private.market_custody_assets_v1(exact_instance_id)
  where asset_kind = 'equipment';
create index if not exists market_custody_owner_revision_v1
  on private.market_custody_assets_v1(owner_account_id,source_revision);

-- No inserts into this table are performed until authoritative reservation
-- removes the same quantity from the online-game snapshot within ONE DB txn.
-- A hold row alone is not custody; listing code must enforce the bridge.
create table if not exists private.market_custody_holds_v1 (
  hold_id uuid primary key default gen_random_uuid(),
  asset_id uuid not null,
  owner_account_id uuid not null references public.online_game_states(account_id)
    on delete restrict,
  request_key text not null check(length(request_key) between 8 and 128),
  request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
  held_quantity bigint not null check(held_quantity between 1 and 2147483647),
  status text not null default 'draft'
    check(status = 'draft'),
  source_revision bigint not null check(source_revision >= 0),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint market_custody_hold_exact_owner_v1
    foreign key(asset_id,owner_account_id)
    references private.market_custody_assets_v1(asset_id,owner_account_id)
    on delete restrict,
  constraint market_custody_request_once_v1 unique(owner_account_id,request_key),
  constraint market_custody_closed_state_v1 check(
    (status in ('draft','held') and closed_at is null)
    or (status in ('released','settled') and closed_at is not null)
  )
);

-- At most one active listing reservation per asset. Partial-stack listing
-- concurrency will require an explicit audited split/aggregate transaction.
create unique index if not exists market_custody_one_active_hold_v1
  on private.market_custody_holds_v1(asset_id)
  where status = 'held';

-- Defense-in-depth: no policies, no public Data API ACL and no service_role
-- direct table access. Future server RPCs will need explicit narrow grants.
alter table private.market_runtime_guard_v1 enable row level security;
alter table private.market_item_policy_v1 enable row level security;
alter table private.market_custody_assets_v1 enable row level security;
alter table private.market_custody_holds_v1 enable row level security;

revoke all on table
  private.market_runtime_guard_v1,
  private.market_item_policy_v1,
  private.market_custody_assets_v1,
  private.market_custody_holds_v1
from public, anon, authenticated, service_role;


-- Read-only probe against the ACTUAL versioned online-game snapshot. This is
-- identity evidence, never permission to list, reserve, settle or transfer.
-- Client and service roles have no execute grant. Future escrow must repeat
-- every check under an online_game_states FOR UPDATE lock in one transaction.
create or replace function private.market_snapshot_source_probe_v1(
  p_account_id uuid,p_expected_revision bigint,p_source_location text,
  p_holder_character_id text,p_stack_index integer,p_item_id text,
  p_requested_quantity bigint,p_exact_instance_id text default null
) returns jsonb
language plpgsql stable security invoker set search_path=''
as $market_probe$
declare
  v_state jsonb;
  v_revision bigint;
  v_stacks jsonb;
  v_stack jsonb;
  v_entry jsonb;
  v_receipt jsonb;
  v_quantity bigint;
begin
  if p_account_id is null or p_expected_revision is null or p_expected_revision < 0
    or p_stack_index is null or p_stack_index < 0 or p_stack_index > 10000
    or p_requested_quantity is null or p_requested_quantity < 1
    or p_requested_quantity > 2147483647
    or p_item_id is null or length(p_item_id) not between 1 and 180
    or p_source_location is null
    or p_source_location not in ('inventory','bank','equipment_pouch','gem_pouch')
  then return pg_catalog.jsonb_build_object('matches',false,'canReserveNow',false,'reason','invalid_request');
  end if;

  select state,revision into v_state,v_revision
  from public.online_game_states where account_id=p_account_id;
  if not found or v_state is null or v_revision is distinct from p_expected_revision
  then return pg_catalog.jsonb_build_object('matches',false,'canReserveNow',false,'reason','stale_or_missing_state');
  end if;

  if p_source_location in ('bank','gem_pouch') then
    if p_holder_character_id is not null
    then return pg_catalog.jsonb_build_object('matches',false,'canReserveNow',false,'reason','invalid_holder');
    end if;
    v_stacks:=case when p_source_location='bank' then v_state#>'{bank,stacks}'
      else v_state#>'{account,gemPouch,stacks}' end;
  else
    if p_holder_character_id is null
    then return pg_catalog.jsonb_build_object('matches',false,'canReserveNow',false,'reason','missing_holder');
    end if;
    if v_state#>>'{character,id}'=p_holder_character_id then
      v_stacks:=case when p_source_location='inventory' then v_state#>'{inventory,stacks}'
        else v_state#>'{character,equipmentPouch,stacks}' end;
    elsif pg_catalog.jsonb_typeof(v_state->'otherCharacters')='array' then
      for v_entry in select value from pg_catalog.jsonb_array_elements(v_state->'otherCharacters') loop
        if v_entry#>>'{character,id}'=p_holder_character_id then
          v_stacks:=case when p_source_location='inventory' then v_entry#>'{inventory,stacks}'
            else v_entry#>'{character,equipmentPouch,stacks}' end;
          exit;
        end if;
      end loop;
    end if;
  end if;

  if pg_catalog.jsonb_typeof(v_stacks)<>'array'
    or pg_catalog.jsonb_array_length(v_stacks)<=p_stack_index
  then return pg_catalog.jsonb_build_object('matches',false,'canReserveNow',false,'reason','source_not_found');
  end if;
  v_stack:=v_stacks->p_stack_index;
  if v_stack->>'itemId' is distinct from p_item_id
    or pg_catalog.jsonb_typeof(v_stack->'quantity')<>'number'
    or coalesce(v_stack->>'quantity','') !~ '^[0-9]{1,10}$'
  then return pg_catalog.jsonb_build_object('matches',false,'canReserveNow',false,'reason','source_identity_changed');
  end if;
  v_quantity:=(v_stack->>'quantity')::bigint;
  if v_quantity<1 or v_quantity>2147483647 or v_quantity<p_requested_quantity
  then return pg_catalog.jsonb_build_object('matches',false,'canReserveNow',false,'reason','insufficient_quantity');
  end if;

  if p_exact_instance_id is null then
    -- Gear in a pouch cannot be promoted from an unmarked legacy copy.
    if v_stack ? 'instanceId' or p_source_location='equipment_pouch'
      then return pg_catalog.jsonb_build_object('matches',false,'canReserveNow',false,'reason','missing_exact_receipt');
    end if;
  else
    if v_stack->>'instanceId' is distinct from p_exact_instance_id
      or v_quantity<>1 or p_requested_quantity<>1
      then return pg_catalog.jsonb_build_object('matches',false,'canReserveNow',false,'reason','copy_identity_changed');
    end if;
    if pg_catalog.jsonb_typeof(v_state#>'{account,craftedGearInstances}')='array' then
      select value into v_receipt
      from pg_catalog.jsonb_array_elements(v_state#>'{account,craftedGearInstances}')
      where value->>'id'=p_exact_instance_id limit 1;
    end if;
    if v_receipt is null or v_receipt->>'itemId' is distinct from p_item_id
      or v_receipt->>'locked'='true'
    then return pg_catalog.jsonb_build_object('matches',false,'canReserveNow',false,'reason','unverified_copy');
    end if;
    if pg_catalog.jsonb_typeof(v_receipt->'quality')<>'number'
      or coalesce(v_receipt->>'quality','') !~ '^[0-9]{1,3}$'
    then return pg_catalog.jsonb_build_object('matches',false,'canReserveNow',false,'reason','unverified_quality');
    end if;
    if (v_receipt->>'quality')::integer not between 0 and 100
    then return pg_catalog.jsonb_build_object('matches',false,'canReserveNow',false,'reason','unverified_quality');
    end if;
  end if;

  return pg_catalog.jsonb_build_object('matches',true,'canReserveNow',false,
    'reason','snapshot_identity_only','quantity',v_quantity,'revision',v_revision);
end;
$market_probe$;

revoke all on function private.market_snapshot_source_probe_v1(
  uuid,bigint,text,text,integer,text,bigint,text
) from public,anon,authenticated,service_role;

-- The migration has no player-facing RPCs, triggers, or jobs.
-- In particular, historical public.market_orders and public.market_trades
-- are NOT recreated. No existing inventory or wallet row is touched.
comment on table private.market_custody_assets_v1 is
  'Inert reconciliation candidates. NOT a spendable inventory and never a source of truth without exact online snapshot bridging.';
comment on table private.market_custody_holds_v1 is
  'Dormant escrow ledger. No live mutation path or exposed RPC until a future reviewed release migration.';
comment on table private.market_runtime_guard_v1 is
  'Both release gates are locked false by constraints; enabling requires an explicit future migration.';

commit;
