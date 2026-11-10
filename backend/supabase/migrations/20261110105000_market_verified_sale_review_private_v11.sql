-- Hidden V11D: read-only, bounded, verified sale evidence for future
-- human-reviewed weekly price suggestions. Requires full private Market
-- custody/settlement migration chain, including V11C 5% tax.
-- No price modifications, no scheduler, no player RPC grants.
begin;

create index if not exists market_sold_offer_review_v11
 on private.market_sale_offers_v3(sold_at desc,offer_id)
 where status='sold';

create or replace function private.market_verified_completed_sales_v11(
 p_item_id text,p_kind text,p_as_of timestamptz default now()
) returns jsonb
language plpgsql stable security invoker set search_path=''
as $market_evidence$
declare v_rows jsonb;
begin
 if p_item_id is null or length(p_item_id) not between 1 and 180
   or p_kind not in ('resource','equipment')
   or p_as_of is null
   or p_as_of>now() or p_as_of<now()-interval '30 days'
 then return '[]'::jsonb;end if;

 -- Purchase receipt + exact custody hold + settled Gold intent all must
 -- agree; this is NOT an aggregator of arbitrary seller asking prices.
 with recent as (
  select o.offer_id,o.seller_account_id,o.quantity,o.unit_price,o.sold_at,
   a.item_id,a.asset_kind,
   p.buyer_account_id,g.gross_gold,g.fee_gold,g.seller_payout_gold
  from private.market_sale_offers_v3 o
  join private.market_custody_holds_v1 h
    on h.hold_id=o.source_hold_id
   and h.owner_account_id=o.seller_account_id and h.status='settled'
  join private.market_custody_assets_v1 a
    on a.asset_id=h.asset_id
   and a.owner_account_id=o.seller_account_id
   and a.verification_state='verified'
   and not a.source_bound
  join private.market_gold_intents_v2 g
    on g.source_hold_id=o.source_hold_id
   and g.seller_account_id=o.seller_account_id and g.status='settled'
  join private.market_purchase_receipts_v3 p
    on p.offer_id=o.offer_id and p.buyer_account_id=g.buyer_account_id
  where o.status='sold' and o.sold_at>=p_as_of-interval '7 days'
    and o.sold_at<=p_as_of
    and a.item_id=p_item_id and a.asset_kind=p_kind
    and o.seller_account_id<>p.buyer_account_id
    and g.gross_gold=o.unit_price::numeric*o.quantity::numeric
    and g.unit_price=o.unit_price and g.quantity=o.quantity
    and g.fee_gold=pg_catalog.ceil(g.gross_gold::numeric*500::numeric/10000::numeric)::bigint
    and g.seller_payout_gold=g.gross_gold-g.fee_gold
    and p.result->>'goldSpent'=g.gross_gold::text
    and p.result->>'feeGold'=g.fee_gold::text
    and p.result->>'sellerGoldReceived'=g.seller_payout_gold::text
    and p.result->>'sellerAccountId'=o.seller_account_id::text
    and p.result->>'buyerAccountId'=p.buyer_account_id::text
  order by o.sold_at desc,o.offer_id
  limit 1000
 )
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'offerId',r.offer_id::text,'itemId',r.item_id,'kind',r.asset_kind,
   'buyerAccountId',r.buyer_account_id::text,
   'sellerAccountId',r.seller_account_id::text,
   'quantity',r.quantity,'unitGold',r.unit_price,
   'grossGold',r.gross_gold,'feeGold',r.fee_gold,
   'sellerGold',r.seller_payout_gold,
   'settledAtMs',(pg_catalog.extract(epoch from r.sold_at)*1000)::bigint,
   'status','settled') order by r.sold_at desc),'[]'::jsonb)
 into v_rows from recent r;

 return coalesce(v_rows,'[]'::jsonb);
end;
$market_evidence$;

revoke all on function private.market_verified_completed_sales_v11(text,text,timestamptz)
 from public,anon,authenticated,service_role;
commit;
