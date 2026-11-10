-- Hidden Player Market V13: immutable, transaction-coupled completed-sale history.
-- Source of truth is the purchase receipt + settled Gold ledger + held exact asset.
-- No historical rows for asks, cancellations, expired listings, or failed purchases.
-- No player access, no release flag change, no admin-controlled sample prices.
begin;
create table if not exists private.market_completed_sale_history_v13 (
 offer_id uuid primary key references private.market_sale_offers_v3(offer_id) on delete restrict,
 item_id text not null check(length(item_id) between 1 and 180),
 asset_kind text not null check(asset_kind in ('resource','equipment')),
 buyer_account_id uuid not null,
 seller_account_id uuid not null,
 sold_at timestamptz not null,
 unit_gold bigint not null check(unit_gold between 1 and 1000000000000),
 quantity integer not null check(quantity between 1 and 2147483647),
 gross_gold bigint not null check(gross_gold between 2 and 1000000000000000),
 fee_gold bigint not null check(fee_gold>=1),
 seller_payout_gold bigint not null check(seller_payout_gold>=1),
 rarity text,
 quality integer,
 enchant_rank integer,
 recorded_at timestamptz not null default now(),
 constraint market_sale_history_v13_conservation check(
   gross_gold=unit_gold::numeric*quantity::numeric
   and gross_gold=fee_gold+seller_payout_gold
   and fee_gold=pg_catalog.ceil(gross_gold::numeric*.05::numeric)::bigint
   and buyer_account_id<>seller_account_id),
 constraint market_sale_history_v13_gear_shape check(
   (asset_kind='resource' and rarity is null and quality is null and enchant_rank is null)
   or (asset_kind='equipment'
     and rarity in ('common','uncommon','rare','epic','legendary','mythic')
     and quality between 0 and 100 and enchant_rank between 0 and 4))
);
create index if not exists market_sale_history_v13_item_time
 on private.market_completed_sale_history_v13(item_id,asset_kind,sold_at desc);
create index if not exists market_sale_history_v13_variant_time
 on private.market_completed_sale_history_v13(item_id,rarity,sold_at desc)
 where asset_kind='equipment';

-- A historical sale is immutable, even if an admin later changes a
-- tradability policy or a listed item disappears from the catalog.
create or replace function private.market_reject_history_edit_v13()
returns trigger language plpgsql volatile security invoker set search_path=''
as $market_immutable$
begin
 raise exception 'market_sale_history_immutable';
end;
$market_immutable$;
drop trigger if exists market_completed_sale_history_immutable_v13
  on private.market_completed_sale_history_v13;
create trigger market_completed_sale_history_immutable_v13
 before update or delete on private.market_completed_sale_history_v13
 for each row execute function private.market_reject_history_edit_v13();
revoke all on function private.market_reject_history_edit_v13()
  from public,anon,authenticated,service_role;

alter table private.market_completed_sale_history_v13 enable row level security;
revoke all on table private.market_completed_sale_history_v13
 from public,anon,authenticated,service_role;

-- AFTER INSERT means this runs after the purchase function updates Gold,
-- exact custody, sold offer and receipt. Exception rolls back ALL of them.
-- A retry returns the old idempotency receipt without another INSERT.
create or replace function private.market_record_completed_sale_v13()
returns trigger
language plpgsql volatile security invoker set search_path=''
as $market_history_record$
declare
 v_sale record;
 v_rarity text;v_quality integer;v_enchant integer;
begin
 select o.offer_id,o.seller_account_id,o.unit_price,o.quantity,o.sold_at,
   a.item_id,a.asset_kind,a.immutable_attributes,
   g.buyer_account_id,g.gross_gold,g.fee_gold,g.seller_payout_gold
 into v_sale
 from private.market_sale_offers_v3 o
 join private.market_custody_holds_v1 h
   on h.hold_id=o.source_hold_id and h.owner_account_id=o.seller_account_id
 join private.market_custody_assets_v1 a
   on a.asset_id=h.asset_id and a.owner_account_id=o.seller_account_id
 join private.market_gold_intents_v2 g
   on g.source_hold_id=o.source_hold_id
     and g.buyer_account_id=new.buyer_account_id
     and g.seller_account_id=o.seller_account_id and g.status='settled'
 where o.offer_id=new.offer_id
   and o.status='sold' and o.sold_at is not null
   and h.status='settled'
   and a.verification_state='verified' and not a.source_bound
   and a.asset_kind in ('resource','equipment')
   and o.unit_price=g.unit_price and o.quantity=g.quantity
   and g.gross_gold=o.unit_price::numeric*o.quantity::numeric;

 if not found or v_sale.seller_account_id=new.buyer_account_id
   or v_sale.gross_gold is distinct from v_sale.fee_gold+v_sale.seller_payout_gold
   or v_sale.fee_gold is distinct from
     pg_catalog.ceil(v_sale.gross_gold::numeric*500::numeric/10000::numeric)::bigint
   or new.result->>'offerId' is distinct from new.offer_id::text
   or new.result->>'buyerAccountId' is distinct from new.buyer_account_id::text
   or new.result->>'sellerAccountId' is distinct from v_sale.seller_account_id::text
   or new.result->>'unitPrice' is distinct from v_sale.unit_price::text
   or new.result->>'quantity' is distinct from v_sale.quantity::text
   or new.result->>'goldSpent' is distinct from v_sale.gross_gold::text
   or new.result->>'feeGold' is distinct from v_sale.fee_gold::text
   or new.result->>'sellerGoldReceived' is distinct from v_sale.seller_payout_gold::text
 then raise exception 'market_history_settlement_unverified';end if;

 if v_sale.asset_kind='equipment' then
   if pg_catalog.jsonb_typeof(v_sale.immutable_attributes->'exactReceipt')
       is distinct from 'object'
   then raise exception 'market_history_equipment_receipt_unverified';end if;
   v_rarity:=v_sale.immutable_attributes#>>'{exactReceipt,rarity}';
   if coalesce(v_sale.immutable_attributes#>>'{exactReceipt,quality}','') !~ '^(100|[1-9]?[0-9])$'
      or coalesce(v_sale.immutable_attributes#>>'{exactReceipt,enhancement,rank}','') !~ '^[0-4]$'
   then raise exception 'market_history_equipment_receipt_unverified';end if;
   v_quality:=(v_sale.immutable_attributes#>>'{exactReceipt,quality}')::integer;
   v_enchant:=(v_sale.immutable_attributes#>>'{exactReceipt,enhancement,rank}')::integer;
 end if;

 insert into private.market_completed_sale_history_v13 (
   offer_id,item_id,asset_kind,buyer_account_id,seller_account_id,
   sold_at,unit_gold,quantity,gross_gold,fee_gold,seller_payout_gold,
   rarity,quality,enchant_rank
 ) values(
   new.offer_id,v_sale.item_id,v_sale.asset_kind,new.buyer_account_id,
   v_sale.seller_account_id,v_sale.sold_at,v_sale.unit_price,v_sale.quantity,
   v_sale.gross_gold,v_sale.fee_gold,v_sale.seller_payout_gold,
   v_rarity,v_quality,v_enchant
 );
 return new;
end;
$market_history_record$;

drop trigger if exists market_record_completed_sale_v13
 on private.market_purchase_receipts_v3;
create trigger market_record_completed_sale_v13
 after insert on private.market_purchase_receipts_v3
 for each row execute function private.market_record_completed_sale_v13();

revoke all on function private.market_record_completed_sale_v13()
 from public,anon,authenticated,service_role;

-- History chart data must be aggregated and privacy-protecting. Only 7/30/90
-- day windows; a day is rendered only with >=3 distinct buyers/sellers.
-- No interpolation, no synthetic price points and no zero-Gold substitutes.
create or replace function private.market_completed_price_chart_v13(
 p_item_id text,p_kind text,p_days integer default 30,p_rarity text default null
) returns jsonb
language plpgsql stable security invoker set search_path=''
as $market_history_chart$
declare v_series jsonb;
begin
 if p_item_id is null or length(p_item_id) not between 1 and 180
   or p_kind not in ('resource','equipment')
   or p_days is null or p_days not in (7,30,90)
   or (p_kind='resource' and p_rarity is not null)
   or (p_kind='equipment' and coalesce(p_rarity,'') not in
       ('common','uncommon','rare','epic','legendary','mythic'))
 then raise exception 'invalid_market_price_chart_request';end if;

 if not exists(select 1 from private.market_runtime_guard_v1
    where singleton and trading_enabled and snapshot_bridge_ready)
 then raise exception 'market_disabled';end if;

 if not exists(select 1 from private.market_item_policy_v1
    where item_id=p_item_id and asset_kind=p_kind
      and tradable and binding_policy='unbound')
 then raise exception 'market_item_not_tradable';end if;

 with daily as (
   select (sold_at at time zone 'UTC')::date as day,
     count(*) as sales,
     count(distinct buyer_account_id) as buyers,
     count(distinct seller_account_id) as sellers,
     sum(quantity) as units,
     min(unit_gold) as low_gold,max(unit_gold) as high_gold,
     percentile_disc(.5) within group (order by unit_gold) as median_gold
   from private.market_completed_sale_history_v13
   where item_id=p_item_id and asset_kind=p_kind
     and (p_rarity is null or rarity=p_rarity)
     and sold_at>=now()-pg_catalog.make_interval(days=>p_days)
     and sold_at<=now()
   group by (sold_at at time zone 'UTC')::date
   having count(*)>=3 and count(distinct buyer_account_id)>=3
      and count(distinct seller_account_id)>=3
 )
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'date',to_char(day,'YYYY-MM-DD'),
   'sales',sales,'units',units,'medianGold',median_gold,
   'lowGold',low_gold,'highGold',high_gold
 ) order by day),'[]'::jsonb)
 into v_series from daily;
 return pg_catalog.jsonb_build_object(
   'itemId',p_item_id,'kind',p_kind,'periodDays',p_days,
   'asOfDate',pg_catalog.to_char(now() at time zone 'UTC','YYYY-MM-DD'),
   'rarity',p_rarity,'points',v_series,
   'hasEnoughData',pg_catalog.jsonb_array_length(v_series)>0,
   'minimumDailySales',3);
end;
$market_history_chart$;

revoke all on function private.market_completed_price_chart_v13(text,text,integer,text)
 from public,anon,authenticated,service_role;
commit;
