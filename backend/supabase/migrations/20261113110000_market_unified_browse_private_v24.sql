-- Hidden Market V24a: combined verified first-listing + resale browse.
-- Server-side only. Does not authorize settlement, grant RPC or switch gates.
begin;

create index market_resale_browse_active_v24
 on private.market_equipment_resale_offers_v23(unit_price,created_at desc,resale_id)
 where status='active';

create function private.market_browse_combined_v24(
 p_kind text default 'all',p_item_id text default null,
 p_search text default null,p_sort text default 'price_asc',
 p_min_total_gold bigint default null,p_max_total_gold bigint default null,
 p_limit integer default 25,p_offset integer default 0
) returns jsonb
language plpgsql stable security invoker set search_path=''
as $market_browse_all$
declare
 v_entries jsonb;
 v_total bigint;
begin
 if p_kind is null or p_kind not in ('all','resource','equipment')
   or p_sort is null or p_sort not in ('price_asc','price_desc','newest')
   or (p_item_id is not null and
     (length(p_item_id) not between 1 and 180
       or p_item_id !~ '^[A-Za-z0-9_:-]+$'))
   or (p_search is not null and
     (length(p_search) not between 1 and 60
       or p_search !~ '^[A-Za-z0-9_ :\-]+$'))
   or p_min_total_gold is not null and p_min_total_gold<1
   or p_max_total_gold is not null and p_max_total_gold<1
   or (p_min_total_gold is not null and p_max_total_gold is not null
     and p_min_total_gold>p_max_total_gold)
   or p_limit is null or p_limit not between 1 and 50
   or p_offset is null or p_offset not between 0 and 1000
 then raise exception 'invalid_market_browse_request';end if;
 if not exists(select 1 from private.market_runtime_guard_v1
     where singleton and trading_enabled and snapshot_bridge_ready)
 then raise exception 'market_disabled';end if;

 with candidates as materialized (
   select o.offer_id::text as public_id,'original'::text as source_kind,
     a.item_id,a.asset_kind,o.quantity,o.unit_price,o.created_at,
     h.expires_at,a.immutable_attributes as attributes,
     a.immutable_attributes->'exactReceipt' as receipt
   from private.market_sale_offers_v3 o
   join private.market_custody_holds_v1 h
     on h.hold_id=o.source_hold_id
       and h.owner_account_id=o.seller_account_id
   join private.market_custody_assets_v1 a
     on a.asset_id=h.asset_id
       and a.owner_account_id=o.seller_account_id
   where o.status='active' and h.status='held'
     and h.expires_at>now() and h.held_quantity=o.quantity
     and a.held_quantity=o.quantity and a.verification_state='verified'
     and not a.source_bound and a.asset_kind in ('resource','equipment')
   union all
   select r.resale_id::text,'resale'::text,
     r.item_id,'equipment'::text,1::integer,r.unit_price,r.created_at,
     r.expires_at,
     pg_catalog.jsonb_build_object('exactReceipt',r.receipt_payload),
     r.receipt_payload
   from private.market_equipment_resale_offers_v23 r
   join private.market_equipment_provenance_v19 p
     on p.exact_instance_id=r.exact_instance_id
       and p.buyer_account_id=r.seller_account_id
       and p.recipient_character_id=r.seller_character_id
       and p.source_hold_id=r.first_source_hold_id
       and p.item_id=r.item_id and p.status='claimed'
       and p.storage_state='resale'
   join private.market_equipment_sale_chain_v22 root
     on root.source_hold_id=r.first_source_hold_id
       and root.exact_instance_id=r.exact_instance_id
   where r.status='active' and r.expires_at>now()
     and r.receipt_payload->>'id'=r.exact_instance_id
     and r.receipt_payload->>'itemId'=r.item_id
     and r.receipt_payload->>'ownerCharacterId'=r.seller_character_id
     and r.stack_payload->>'instanceId'=r.exact_instance_id
     and r.stack_payload->>'itemId'=r.item_id
     and r.stack_payload->>'quantity'='1'
     and (
       (r.last_sale_ordinal=1 and r.previous_resale_id is null
         and root.buyer_account_id=r.seller_account_id
         and not exists(select 1
           from private.market_equipment_resale_chain_v23 older
           where older.exact_instance_id=r.exact_instance_id))
       or
       (r.last_sale_ordinal>=2 and exists(
         select 1 from private.market_equipment_resale_chain_v23 last_sale
         where last_sale.resale_id=r.previous_resale_id
           and last_sale.exact_instance_id=r.exact_instance_id
           and last_sale.first_source_hold_id=r.first_source_hold_id
           and last_sale.sale_ordinal=r.last_sale_ordinal
           and last_sale.buyer_account_id=r.seller_account_id
           and not exists(select 1 from private.market_equipment_resale_chain_v23 newer
             where newer.exact_instance_id=r.exact_instance_id
               and newer.sale_ordinal>last_sale.sale_ordinal)))
     )
 ), eligible as materialized (
   select c.*,quote.band
   from candidates c
   join private.market_item_policy_v1 item_policy
     on item_policy.item_id=c.item_id
       and item_policy.asset_kind=c.asset_kind
       and item_policy.tradable and item_policy.binding_policy='unbound'
   cross join lateral (
     select private.market_quote_price_band_v10(
       c.item_id,c.asset_kind,c.attributes) as band
   ) quote
   where (p_kind='all' or c.asset_kind=p_kind)
     and (p_item_id is null or c.item_id=p_item_id)
     and (p_search is null or lower(c.item_id) like '%'||lower(p_search)||'%')
     and (c.asset_kind<>'equipment' or (
       exists(select 1 from private.market_equipment_guard_v8 g
         where g.singleton and g.equipment_transfers_enabled)
       and exists(select 1 from private.market_acquisition_policy_v18 ap
         where ap.item_id=c.item_id and ap.asset_kind='equipment'
           and ap.approved and ap.catalog_revision=33)
       and not exists(
         select 1 from (values
           (c.receipt#>>'{enhancement,statGemId}'),
           (c.receipt#>>'{enhancement,effectGemId}')
         ) socket(gem_id)
         where socket.gem_id is not null and socket.gem_id<>''
           and not exists(
             select 1 from private.market_item_policy_v1 gem_policy
             where gem_policy.item_id=socket.gem_id
               and gem_policy.asset_kind='gem'
               and gem_policy.tradable and gem_policy.binding_policy='unbound'))
       and (c.receipt#>>'{enhancement,statGemRollPercent}' is null
         or c.receipt#>>'{enhancement,statGemRollPercent}'
           ~ '^(80|85|90|95|100|105|110|115|120)$')
       and (c.receipt#>>'{enhancement,effectGemRollPercent}' is null
         or c.receipt#>>'{enhancement,effectGemRollPercent}'
           ~ '^(80|85|90|95|100|105|110|115|120)$')
     ))
     and private.market_offer_price_valid_v10(
       c.item_id,c.asset_kind,c.attributes,c.unit_price)
     and private.market_listing_lot_valid_v11(
       c.item_id,c.asset_kind,c.quantity)
     and c.unit_price::numeric*c.quantity::numeric<=1000000000000000
     and (p_min_total_gold is null
       or c.unit_price::numeric*c.quantity::numeric>=p_min_total_gold)
     and (p_max_total_gold is null
       or c.unit_price::numeric*c.quantity::numeric<=p_max_total_gold)
 ), ranked as (
   select eligible.*,row_number() over(
     order by
       case when p_sort='price_asc' then unit_price end asc nulls last,
       case when p_sort='price_desc' then unit_price end desc nulls last,
       case when p_sort='newest' then created_at end desc nulls last,
       created_at desc,public_id,source_kind
   ) as page_rank from eligible
 ), page as (
   select * from ranked
   where page_rank>p_offset and page_rank<=p_offset+p_limit
 )
 select (select count(*) from eligible),
   coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
     'offerId',page.public_id,'sourceKind',page.source_kind,
     'resaleId',case when page.source_kind='resale' then page.public_id else null end,
     'itemId',page.item_id,'assetKind',page.asset_kind,
     'quantity',page.quantity,'unitGold',page.unit_price,
     'totalGold',page.unit_price::numeric*page.quantity::numeric,
     'createdAt',page.created_at,'expiresAt',page.expires_at,
     'minimumGold',(page.band->>'minUnitPrice')::bigint,
     'maximumGold',(page.band->>'maxUnitPrice')::bigint,
     'rarity',case when page.asset_kind='equipment'
       then page.receipt->>'rarity' else null end,
     'quality',case when page.asset_kind='equipment'
       then (page.receipt->>'quality')::integer else null end,
     'enhancementRank',case when page.asset_kind='equipment'
       then (page.receipt#>>'{enhancement,rank}')::integer else null end,
     'statGemId',case when page.asset_kind='equipment'
       then page.receipt#>>'{enhancement,statGemId}' else null end,
     'effectGemId',case when page.asset_kind='equipment'
       then page.receipt#>>'{enhancement,effectGemId}' else null end,
     'statGemRollPercent',case when page.asset_kind='equipment'
       and nullif(page.receipt#>>'{enhancement,statGemId}','') is not null
       then coalesce((page.receipt#>>'{enhancement,statGemRollPercent}')::integer,100)
       else null end,
     'effectGemRollPercent',case when page.asset_kind='equipment'
       and nullif(page.receipt#>>'{enhancement,effectGemId}','') is not null
       then coalesce((page.receipt#>>'{enhancement,effectGemRollPercent}')::integer,100)
       else null end
   ) order by page.page_rank),'[]'::jsonb)
 into v_total,v_entries from page;
 return pg_catalog.jsonb_build_object(
   'entries',coalesce(v_entries,'[]'::jsonb),
   'total',coalesce(v_total,0),'offset',p_offset,'limit',p_limit,
   'hasMore',coalesce(v_total,0)>p_offset+p_limit);
end;
$market_browse_all$;
revoke all on function private.market_browse_combined_v24(
 text,text,text,text,bigint,bigint,integer,integer)
 from public,anon,authenticated,service_role;

commit;