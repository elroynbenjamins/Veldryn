-- Hidden Player Market V10, no trading release. Two existing publisher
-- functions now require approved server-owned price corridors as well as
-- the previously hard-disabled escrow and item-policy guards.
begin;
create schema if not exists private;
create table if not exists private.market_price_bands_v10(
  item_id text primary key check(length(item_id) between 1 and 180),
  asset_kind text not null check(asset_kind in ('resource','gem','equipment')),
  min_unit_price bigint not null check(min_unit_price between 1 and 1000000000000),
  max_unit_price bigint not null check(max_unit_price between 1 and 1000000000000),
  approved boolean not null default false,
  policy_version integer not null default 10 check(policy_version=10),
  updated_at timestamptz not null default now(),
  check(min_unit_price<=max_unit_price),
  check(max_unit_price<=min_unit_price*6)
);
create table if not exists private.market_equipment_tier_bands_v10(
  tier text primary key check(tier ~ '^T[1-9]$'),
  min_unit_price bigint not null check(min_unit_price between 1 and 1000000000000),
  max_unit_price bigint not null check(max_unit_price between 1 and 1000000000000),
  approved boolean not null default false,
  updated_at timestamptz not null default now(),
  check(min_unit_price<=max_unit_price),
  check(max_unit_price<=min_unit_price*6)
);
alter table private.market_price_bands_v10 enable row level security;
alter table private.market_equipment_tier_bands_v10 enable row level security;
revoke all on private.market_price_bands_v10,private.market_equipment_tier_bands_v10
 from public,anon,authenticated,service_role;
-- Curated initial draft anchors. Neither table has a single approved row.
insert into private.market_price_bands_v10
 (item_id,asset_kind,min_unit_price,max_unit_price,approved) values
  ('COPPER_ORE','resource',4,24,false),
  ('GREENWOOD_LOG','resource',3,18,false),
  ('MOSS_FIBER','resource',3,18,false),
  ('BOAR_HIDE','resource',5,30,false),
  ('WISP_DUST','resource',7,42,false),
  ('MEADOW_PERCH','resource',3,18,false),
  ('IRONWOOD_LOG','resource',12,72,false),
  ('WOLF_PELT','resource',12,72,false),
  ('THORN_SAP','resource',18,108,false),
  ('IRONWOOD_FANG','resource',24,144,false),
  ('TROLL_HIDE','resource',34,204,false),
  ('ASTER_IRON_ORE','resource',13,78,false),
  ('COPPER_INGOT','resource',18,108,false),
  ('ASTER_IRON_INGOT','resource',45,270,false),
  
  ('DUNEWOOD','resource',40,240,false),
  ('SUNSTONE_ORE','resource',40,240,false),
  ('SUNSTONE_INGOT','resource',180,1080,false),
  ('AMBERGLASS','resource',125,750,false),
  ('ASTRAL_SCRIPT','resource',230,1380,false),
  ('GLASSBOUND_CORE','resource',300,1800,false),
  ('FROSTIRON','resource',85,510,false),
  ('FROSTIRON_INGOT','resource',320,1920,false),
  ('RIMEGLASS','resource',260,1560,false),
  ('CHOIR_BLOOM','resource',290,1740,false),
  ('BLACKGLASS_ORE','resource',140,840,false),
  ('BLACKGLASS_INGOT','resource',420,2520,false),
  ('CINDERWOOD_LOG','resource',110,660,false),
  ('BLACKGLASS_CORE','resource',180,1080,false),
  ('CINDER_HEART','resource',280,1680,false),
  ('FROZEN_HEART','resource',650,3900,false),
  ('REGENT_SIGIL','resource',570,3420,false),
  ('GEM_DUST','resource',12,72,false),
  ('TEMPERING_DUST','resource',15,90,false),
  ('TEMPERING_CORE','resource',130,780,false),
  ('ASTERFALL_MINERAL_ESSENCE','resource',55,330,false)
on conflict(item_id) do nothing;
insert into private.market_equipment_tier_bands_v10
 (tier,min_unit_price,max_unit_price,approved) values
  ('T1',600,3600,false),
  ('T2',1900,11400,false),
  ('T3',5500,33000,false),
  ('T4',10000,60000,false),
  ('T5',22000,132000,false),
  ('T6',45000,270000,false),
  ('T7',85000,510000,false),
  ('T8',150000,900000,false),
  ('T9',250000,1500000,false)
on conflict(tier) do nothing;

create or replace function private.market_quote_price_band_v10(
 p_item_id text,p_kind text,p_attributes jsonb default '{}'::jsonb
) returns jsonb
language plpgsql stable security invoker set search_path=''
as $market_band$
declare
 v_policy private.market_price_bands_v10%rowtype;
 v_tier private.market_equipment_tier_bands_v10%rowtype;
 v_floor bigint;v_cap bigint;v_tick bigint;
 v_receipt jsonb;v_rarity text;v_quality integer;v_rank integer;
 v_mul numeric:=1;v_raw_floor numeric;v_lower bigint;v_upper bigint;
begin
 if p_item_id is null or p_kind is null or p_kind not in ('resource','gem','equipment')
    or p_attributes is null or pg_catalog.jsonb_typeof(p_attributes)<>'object'
 then return pg_catalog.jsonb_build_object('approved',false,'reason','invalid_request');end if;
 select * into v_policy from private.market_price_bands_v10
   where item_id=p_item_id and asset_kind=p_kind and approved;
 if found then
   v_floor:=v_policy.min_unit_price;v_cap:=v_policy.max_unit_price;
 elsif p_kind='equipment' and p_item_id ~ '^T[1-9]_[A-Za-z0-9_]+$' then
   select * into v_tier from private.market_equipment_tier_bands_v10
     where tier=pg_catalog.split_part(p_item_id,'_',1) and approved;
   if not found then return pg_catalog.jsonb_build_object('approved',false,'reason','unapproved_or_unpriced');end if;
   v_floor:=v_tier.min_unit_price;v_cap:=v_tier.max_unit_price;
 else
   return pg_catalog.jsonb_build_object('approved',false,'reason','unapproved_or_unpriced');
 end if;
 if p_kind='equipment' then
   v_receipt:=p_attributes->'exactReceipt';
   if pg_catalog.jsonb_typeof(v_receipt) is distinct from 'object'
     or v_receipt->>'itemId' is distinct from p_item_id
     or coalesce(v_receipt->>'rarity','') not in
       ('common','uncommon','rare','epic','legendary','mythic')
     or pg_catalog.jsonb_typeof(v_receipt->'quality') is distinct from 'number'
     or coalesce(v_receipt->>'quality','') !~ '^(100|[1-9]?[0-9])$'
     or pg_catalog.jsonb_typeof(v_receipt->'enhancement') is distinct from 'object'
     or coalesce(v_receipt#>>'{enhancement,rank}','') !~ '^[0-4]$'
   then return pg_catalog.jsonb_build_object('approved',false,'reason','unverified_equipment_traits');end if;
   v_rarity:=v_receipt->>'rarity';
   v_quality:=(v_receipt->>'quality')::integer;
   v_rank:=(v_receipt#>>'{enhancement,rank}')::integer;
   v_mul:=(case v_rarity when 'common' then 1 when 'uncommon' then 1.25
     when 'rare' then 1.65 when 'epic' then 2.5
     when 'legendary' then 4 when 'mythic' then 6.5 else 0 end)
     *(.70::numeric+v_quality::numeric*.006::numeric)
     *(1+v_rank::numeric*.12::numeric);
 end if;
 v_raw_floor:=v_floor::numeric*v_mul;
 v_tick:=case when v_raw_floor>=100000 then 100
   when v_raw_floor>=10000 then 10 else 1 end;
 v_lower:=greatest(v_tick,(pg_catalog.floor(v_raw_floor/v_tick)*v_tick)::bigint);
 v_upper:=(pg_catalog.ceil(v_cap::numeric*v_mul/v_tick)*v_tick)::bigint;
 if v_lower>v_upper or v_upper>1000000000000
 then return pg_catalog.jsonb_build_object('approved',false,'reason','price_overflow');end if;
 return pg_catalog.jsonb_build_object('approved',true,'itemId',p_item_id,
   'kind',p_kind,'minUnitPrice',v_lower,'maxUnitPrice',v_upper,
   'tick',v_tick,'policyVersion',10);
end;
$market_band$;

create or replace function private.market_offer_price_valid_v10(
 p_item_id text,p_kind text,p_attributes jsonb,p_unit_price bigint
) returns boolean
language plpgsql stable security invoker set search_path=''
as $market_valid$
declare v_band jsonb;v_tick bigint;
begin
 if p_unit_price is null or p_unit_price<1 then return false;end if;
 v_band:=private.market_quote_price_band_v10(p_item_id,p_kind,p_attributes);
 if v_band->>'approved' is distinct from 'true' then return false;end if;
 v_tick:=(v_band->>'tick')::bigint;
 return p_unit_price between (v_band->>'minUnitPrice')::bigint
   and (v_band->>'maxUnitPrice')::bigint and p_unit_price%v_tick=0;
end;
$market_valid$;
revoke all on function private.market_quote_price_band_v10(text,text,jsonb)
 from public,anon,authenticated,service_role;
revoke all on function private.market_offer_price_valid_v10(text,text,jsonb,bigint)
 from public,anon,authenticated,service_role;
commit;
