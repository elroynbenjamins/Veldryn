-- Hidden Player Market V18. Never activate trading or apply to production.
-- Private, default-deny acquisition policy + BEFORE-SETTLEMENT guard shared by
-- stack and exact-Forge purchases through their common Gold intent ledger.
-- Both purchase RPCs insert a settled Gold intent after their account/offer
-- locks, but BEFORE debit, seller payout, claim/delivery and sale receipts.
begin;

create table private.market_acquisition_policy_v18 (
  item_id text primary key check(length(item_id) between 1 and 180),
  asset_kind text not null check(asset_kind in ('resource','gem','equipment')),
  source_tier text not null check(source_tier ~ '^T[1-9]$'),
  -- Exact rebased item.requiredLevel for gear; reviewed source level for stacks.
  item_required_level integer not null check(item_required_level between 1 and 100),
  required_class_id text,
  catalog_revision integer not null default 33 check(catalog_revision=33),
  approved boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint market_acquisition_v18_class_shape check (
    (asset_kind='equipment' and required_class_id in (
      'IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','WAYFINDER',
      'RAVAGER','HEXWEAVER','KNIFE_DANCER','STONECALLER'))
    or (asset_kind<>'equipment' and required_class_id is null)
  ),
  -- A future explicit reviewed migration must relax this hard-false fence.
  constraint market_acquisition_v18_approved_check check (approved=false)
);
alter table private.market_acquisition_policy_v18 enable row level security;
revoke all on table private.market_acquisition_policy_v18
  from public,anon,authenticated,service_role;
comment on table private.market_acquisition_policy_v18 is
  'Hidden. Zero approved items. A source-verified canonical per-SKU catalog is required before any market launch.';

-- Match apps/mobile/src/core/progression.ts characterXpForNextLevel:
-- floor(90 * level^1.65 + level*35) * 8. XP is the sole character-level
-- authority; do not authorize from the stale JSON character.level projection.
create function private.market_character_level_from_xp_v18(p_xp bigint)
returns integer
language plpgsql immutable strict security invoker set search_path=''
as $xp_level$
declare
  v_level integer:=1;
  v_spent bigint:=0;
  v_need bigint;
begin
  if p_xp<0 or p_xp>9007199254740991 then
    raise exception 'market_character_xp_invalid';
  end if;
  while v_level<100 loop
    v_need:=pg_catalog.floor(
      90::double precision*pg_catalog.power(v_level::double precision,1.65::double precision)
      +v_level*35
    )::bigint*8;
    if v_spent+v_need>p_xp then return v_level;end if;
    v_spent:=v_spent+v_need;
    v_level:=v_level+1;
  end loop;
  return 100;
end;
$xp_level$;
revoke all on function private.market_character_level_from_xp_v18(bigint)
  from public,anon,authenticated,service_role;

create function private.market_enforce_acquisition_before_gold_v18()
returns trigger
language plpgsql volatile security invoker set search_path=''
as $acquisition_guard$
declare
  v_state jsonb;
  v_active_character uuid;
  v_level integer;
  v_xp_text text;
  v_class_id text;
  v_asset_item_id text;
  v_asset_kind text;
  v_policy private.market_acquisition_policy_v18%rowtype;
  v_gear private.market_equipment_escrows_v8%rowtype;
  v_floor integer;
  v_premium integer;
  v_required integer;
begin
  if new.status<>'settled' then return new;end if;
  if not exists(select 1 from private.market_runtime_guard_v1
    where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;
  -- This trigger re-locks the buyer row (already locked by the purchase RPC).
  -- A forged actor, wrong active character or a stale/invalid XP field cannot
  -- authorize a Gold intent.
  select s.character_id,s.state into v_active_character,v_state
  from public.online_game_states s where s.account_id=new.buyer_account_id
  for update;
  if not found or v_active_character is null or v_state is null
    or new.buyer_character_id<>v_active_character
    or v_state#>>'{character,id}' is distinct from v_active_character::text
    or not exists(select 1 from public.characters c
      where c.id=v_active_character and c.account_id=new.buyer_account_id)
  then raise exception 'market_active_character_required';end if;
  if pg_catalog.jsonb_typeof(v_state#>'{character,xp}') is distinct from 'number'
    or coalesce(v_state#>>'{character,xp}','') !~ '^[0-9]{1,16}$'
  then raise exception 'market_character_xp_invalid';end if;
  v_xp_text:=v_state#>>'{character,xp}';
  if v_xp_text::numeric>9007199254740991 then
    raise exception 'market_character_xp_invalid';end if;
  v_level:=private.market_character_level_from_xp_v18(v_xp_text::bigint);
  v_class_id:=v_state#>>'{character,classId}';
  if v_class_id is null or not exists(
    select 1 from public.characters c
    where c.id=v_active_character and c.account_id=new.buyer_account_id
      and c.class_id::text=v_class_id)
  then raise exception 'market_active_character_required';end if;

  -- Verify the actual currently held, server-escrowed SKU and active offer.
  -- Do not accept the buyer's proposed rarity, tier, resource ID or item level.
  select a.item_id,a.asset_kind into v_asset_item_id,v_asset_kind
    from private.market_custody_holds_v1 h
    join private.market_custody_assets_v1 a on a.asset_id=h.asset_id
    join private.market_sale_offers_v3 o on o.source_hold_id=h.hold_id
    where h.hold_id=new.source_hold_id and h.status='held'
      and h.owner_account_id=new.seller_account_id
      and a.owner_account_id=h.owner_account_id
      and a.verification_state='verified' and not a.source_bound
      and a.held_quantity=new.quantity
      and o.seller_account_id=new.seller_account_id
      and o.status='active' and o.quantity=new.quantity
      and o.unit_price=new.unit_price
    for update of h,a,o;
  if not found then raise exception 'market_acquisition_escrow_mismatch';end if;
  if not exists(select 1 from private.market_item_policy_v1 p
    where p.item_id=v_asset_item_id and p.asset_kind=v_asset_kind
      and p.tradable and p.binding_policy='unbound')
  then raise exception 'market_item_not_verified';end if;
  select * into v_policy from private.market_acquisition_policy_v18 p
    where p.item_id=v_asset_item_id and p.asset_kind=v_asset_kind
      and p.approved and p.catalog_revision=33
    for share;
  if not found then raise exception 'market_item_policy_unapproved';end if;
  if v_asset_kind='equipment' then
    -- T5+ market tiers intentionally unapproved, even if the general game
    -- catalog currently releases their equipment for crafting.
    v_floor:=case v_policy.source_tier
      when 'T1' then 6 when 'T2' then 18
      when 'T3' then 30 when 'T4' then 52
      else null end;
    if v_floor is null then raise exception 'market_tier_not_approved';end if;
    select * into v_gear from private.market_equipment_escrows_v8 g
      where g.source_hold_id=new.source_hold_id and g.status='held'
        and g.item_id=v_asset_item_id for share;
    if not found or v_gear.exact_receipt->>'id'
         is distinct from v_gear.exact_instance_id
      or v_gear.exact_receipt->>'itemId' is distinct from v_asset_item_id
      or v_gear.exact_receipt->>'acquireSource' is distinct from 'craft'
    then raise exception 'market_gear_receipt_invalid';end if;
    v_premium:=case v_gear.exact_receipt->>'rarity'
      when 'common' then 0 when 'uncommon' then 0
      when 'rare' then 2 when 'epic' then 4
      when 'legendary' then 6 when 'mythic' then 8
      else null end;
    if v_premium is null then raise exception 'market_gear_receipt_invalid';end if;
    if v_policy.required_class_id is distinct from v_class_id
    then raise exception 'market_class_required';end if;
    v_required:=greatest(v_floor,v_policy.item_required_level)+v_premium;
  else
    -- Only an explicitly reviewed exact source SKU can be purchased.
    -- A T3 resource may also be consumed in T4 recipes without being
    -- misclassified as T4. Gems require separate future SKU approvals.
    v_required:=v_policy.item_required_level;
  end if;
  if v_level<v_required then
    raise exception using message='market_level_required',
      detail='Requires character level '||v_required::text;
  end if;
  return new;
end;
$acquisition_guard$;
revoke all on function private.market_enforce_acquisition_before_gold_v18()
  from public,anon,authenticated,service_role;

create trigger market_guard_purchase_acquisition_v18
  before insert or update on private.market_gold_intents_v2
  for each row execute function private.market_enforce_acquisition_before_gold_v18();

-- No approvals, grants, launch flags, data mutations or player transactions.
commit;
