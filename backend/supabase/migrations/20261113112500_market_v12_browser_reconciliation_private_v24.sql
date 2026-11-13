-- V24d: replay canonical, audited V12 browse function into older staging
-- schemas. Staging's preexisting function omitted socket-gem tradability
-- and Forge roll-percent validity predicates. This migration is idempotent,
-- changes no Market release gates, does not approve items and grants no API.
-- The body below mirrors the reviewed V12 repository version.
-- Hidden Player Market V12 browse/read model.
-- No grant to any client or service role and no global release changes.
-- Only current verified escrow listings with approved price/lot/item policies
-- qualify. Public previews must be backed by a separately authenticated Edge
-- gateway (NOT implemented or mounted in this migration).
begin;
create index if not exists market_offer_v12_active_price_idx
  on private.market_sale_offers_v3(unit_price,created_at desc,offer_id)
  where status='active';
create index if not exists market_asset_v12_item_kind_idx
  on private.market_custody_assets_v1(item_id,asset_kind)
  where verification_state='verified' and not source_bound;

create or replace function private.market_browse_verified_offers_v12(
 p_kind text default 'all',
 p_item_id text default null,
 p_search text default null,
 p_sort text default 'price_asc',
 p_min_total_gold bigint default null,
 p_max_total_gold bigint default null,
 p_limit integer default 25,
 p_offset integer default 0
) returns jsonb
language plpgsql stable security invoker set search_path=''
as $market_browse$
declare
 v_entries jsonb;
 v_total bigint;
begin
 if p_kind is null or p_kind not in ('all','resource','equipment')
   or p_sort is null or p_sort not in ('price_asc','price_desc','newest')
   or p_item_id is not null and (length(p_item_id) not between 1 and 180 or p_item_id !~ '^[A-Za-z0-9_:-]+$')
   or p_search is not null and (length(p_search) not between 1 and 60 or p_search !~ '^[A-Za-z0-9_ :\-]+$')
   or p_min_total_gold is not null and p_min_total_gold<1
   or p_max_total_gold is not null and p_max_total_gold<1
   or p_min_total_gold is not null and p_max_total_gold is not null and p_min_total_gold>p_max_total_gold
   or p_limit is null or p_limit not between 1 and 50
   or p_offset is null or p_offset not between 0 and 1000
 then raise exception 'invalid_market_browse_request';end if;

 if not exists(select 1 from private.market_runtime_guard_v1
     where singleton and trading_enabled and snapshot_bridge_ready)
 then raise exception 'market_disabled';end if;

 with eligible as materialized (
  select o.offer_id,o.quantity,o.unit_price,o.created_at,
    h.expires_at,a.item_id,a.asset_kind,a.immutable_attributes->'exactReceipt' as receipt,
    quote.band
  from private.market_sale_offers_v3 o
  join private.market_custody_holds_v1 h
    on h.hold_id=o.source_hold_id and h.owner_account_id=o.seller_account_id
  join private.market_custody_assets_v1 a
    on a.asset_id=h.asset_id and a.owner_account_id=o.seller_account_id
  join private.market_item_policy_v1 policy
    on policy.item_id=a.item_id and policy.asset_kind=a.asset_kind
    and policy.tradable and policy.binding_policy='unbound'
  cross join lateral (
    select private.market_quote_price_band_v10(
     a.item_id,a.asset_kind,a.immutable_attributes) as band
  ) as quote
  where o.status='active' and h.status='held' and h.expires_at>now()
    and h.held_quantity=o.quantity and a.held_quantity=o.quantity
    and a.verification_state='verified' and not a.source_bound
    and a.asset_kind in ('resource','equipment')
    and (p_kind='all' or a.asset_kind=p_kind)
    and (p_item_id is null or a.item_id=p_item_id)
    and (p_search is null or lower(a.item_id) like '%'||lower(p_search)||'%')
    and (a.asset_kind<>'equipment' or exists(
       select 1 from private.market_equipment_guard_v8
       where singleton and equipment_transfers_enabled
    ))
    -- Buyers only see validated roll metadata from gems still tradable.
    and (a.asset_kind<>'equipment' or not exists(
       select 1 from (values
         (a.immutable_attributes#>>'{exactReceipt,enhancement,statGemId}'),
         (a.immutable_attributes#>>'{exactReceipt,enhancement,effectGemId}')
       ) as gem_socket(id)
       where gem_socket.id is not null and gem_socket.id<>''
         and not exists(select 1 from private.market_item_policy_v1 gem_policy
           where gem_policy.item_id=gem_socket.id
             and gem_policy.asset_kind='gem' and gem_policy.tradable
             and gem_policy.binding_policy='unbound')
    ))
    and (a.asset_kind<>'equipment' or (
      (a.immutable_attributes#>>'{exactReceipt,enhancement,statGemRollPercent}' is null
       or a.immutable_attributes#>>'{exactReceipt,enhancement,statGemRollPercent}'
         ~ '^(80|85|90|95|100|105|110|115|120)$')
      and
      (a.immutable_attributes#>>'{exactReceipt,enhancement,effectGemRollPercent}' is null
       or a.immutable_attributes#>>'{exactReceipt,enhancement,effectGemRollPercent}'
         ~ '^(80|85|90|95|100|105|110|115|120)$')
    ))
    and private.market_offer_price_valid_v10(
      a.item_id,a.asset_kind,a.immutable_attributes,o.unit_price)
    and private.market_listing_lot_valid_v11(
      a.item_id,a.asset_kind,o.quantity)
    and o.unit_price::numeric*o.quantity::numeric<=1000000000000000
    and (p_min_total_gold is null
      or o.unit_price::numeric*o.quantity::numeric>=p_min_total_gold)
    and (p_max_total_gold is null
      or o.unit_price::numeric*o.quantity::numeric<=p_max_total_gold)
 ), ranked as (
  select eligible.*, row_number() over (
    order by
      case when p_sort='price_asc' then unit_price end asc nulls last,
      case when p_sort='price_desc' then unit_price end desc nulls last,
      case when p_sort='newest' then created_at end desc nulls last,
      created_at desc,offer_id
  ) as page_rank
  from eligible
 ), page as (
  select * from ranked where page_rank>p_offset and page_rank<=p_offset+p_limit
 )
 select (select count(*) from eligible),
   coalesce(jsonb_agg(jsonb_build_object(
    'offerId',page.offer_id::text,
    'itemId',page.item_id,
    'assetKind',page.asset_kind,
    'quantity',page.quantity,
    'unitGold',page.unit_price,
    'totalGold',page.unit_price::numeric*page.quantity::numeric,
    'createdAt',page.created_at,
    'expiresAt',page.expires_at,
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

 return jsonb_build_object('entries',coalesce(v_entries,'[]'::jsonb),
   'total',coalesce(v_total,0),'offset',p_offset,'limit',p_limit,
   'hasMore',coalesce(v_total,0)>p_offset+p_limit);
end;
$market_browse$;

revoke all on function private.market_browse_verified_offers_v12(
 text,text,text,text,bigint,bigint,integer,integer
) from public,anon,authenticated,service_role;
commit;
