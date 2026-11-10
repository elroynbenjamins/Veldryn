-- Hidden Market V11A. Independent of the incomplete custody migration chain.
-- Installation is safe even when the whole marketplace is absent.
-- Nothing is user-visible or approved to trade; all policies default-deny.
begin;
create schema if not exists private;
create table if not exists private.market_listing_lot_policies_v11 (
 item_id text primary key check(length(item_id) between 1 and 180),
 min_quantity integer not null check(min_quantity between 1 and 2147483647),
 approved boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table private.market_listing_lot_policies_v11 enable row level security;
revoke all on table private.market_listing_lot_policies_v11
 from public,anon,authenticated,service_role;

-- Draft minimum bundle sizes for 35 specifically curated resources.
-- Common starter resources: x10. Midtier bulk supplies: x5. Rare inputs: x1.
insert into private.market_listing_lot_policies_v11
 (item_id,min_quantity,approved) values
  ('COPPER_ORE',10,false),
  ('GREENWOOD_LOG',10,false),
  ('MOSS_FIBER',10,false),
  ('BOAR_HIDE',10,false),
  ('WISP_DUST',10,false),
  ('MEADOW_PERCH',10,false),
  ('IRONWOOD_LOG',5,false),
  ('WOLF_PELT',5,false),
  ('THORN_SAP',5,false),
  ('IRONWOOD_FANG',5,false),
  ('TROLL_HIDE',5,false),
  ('ASTER_IRON_ORE',5,false),
  ('COPPER_INGOT',5,false),
  ('ASTER_IRON_INGOT',1,false),
  ('DUNEWOOD',5,false),
  ('SUNSTONE_ORE',5,false),
  ('SUNSTONE_INGOT',1,false),
  ('AMBERGLASS',1,false),
  ('ASTRAL_SCRIPT',1,false),
  ('GLASSBOUND_CORE',1,false),
  ('FROSTIRON',1,false),
  ('FROSTIRON_INGOT',1,false),
  ('RIMEGLASS',1,false),
  ('CHOIR_BLOOM',1,false),
  ('BLACKGLASS_ORE',1,false),
  ('BLACKGLASS_INGOT',1,false),
  ('CINDERWOOD_LOG',1,false),
  ('BLACKGLASS_CORE',1,false),
  ('CINDER_HEART',1,false),
  ('FROZEN_HEART',1,false),
  ('REGENT_SIGIL',1,false),
  ('GEM_DUST',1,false),
  ('TEMPERING_DUST',1,false),
  ('TEMPERING_CORE',1,false),
  ('ASTERFALL_MINERAL_ESSENCE',1,false)
on conflict(item_id) do nothing;

create or replace function private.market_listing_lot_valid_v11(
 p_item_id text,p_kind text,p_quantity integer
) returns boolean
language sql stable security invoker set search_path=''
as $market_lot$
 select case
  when p_item_id is null or p_quantity is null or p_quantity<1 then false
  when p_kind='equipment' then p_quantity=1
  when p_kind='resource' then exists (
    select 1 from private.market_listing_lot_policies_v11 policy
    where policy.item_id=p_item_id and policy.approved
      and p_quantity>=policy.min_quantity
  )
  else false
 end;
$market_lot$;

-- The policy is purely mathematical. A 5% seller-paid Gold sink only on
-- completed transactions, rounded UP (so every real sale incurs >=1 Gold).
-- This helper authorizes no sale; no funds move here.
create or replace function private.market_sale_tax_quote_v11(
 p_gross_gold bigint
) returns jsonb
language plpgsql immutable security invoker set search_path=''
as $market_tax$
declare
 v_fee bigint;v_net bigint;
begin
 if p_gross_gold is null or p_gross_gold<1 or p_gross_gold>1000000000000000
 then return pg_catalog.jsonb_build_object('valid',false);end if;
 v_fee:=pg_catalog.ceil(p_gross_gold::numeric*500::numeric/10000::numeric)::bigint;
 v_net:=p_gross_gold-v_fee;
 return pg_catalog.jsonb_build_object('valid',v_net>=1,'grossGold',p_gross_gold,
  'feeGold',v_fee,'sellerGold',v_net,'taxBasisPoints',500);
end;
$market_tax$;
revoke all on function private.market_listing_lot_valid_v11(text,text,integer)
 from public,anon,authenticated,service_role;
revoke all on function private.market_sale_tax_quote_v11(bigint)
 from public,anon,authenticated,service_role;
commit;
