-- Hidden Market V4: read-only inbox projection for bought, sold, returned.
-- Never append these to the existing rewards inbox: market claims and sale
-- Gold payouts have their own atomic financial and ownership receipts.
-- SECURITY INVOKER and no granted API access. Still hard runtime disabled.
begin;

create or replace function private.market_inbox_snapshot_v4(
  p_account_id uuid,p_history boolean default false,p_offset integer default 0
) returns jsonb
language plpgsql stable security invoker set search_path=''
as $market_inbox$
declare v_output jsonb;
begin
  if p_account_id is null or p_history is null
     or p_offset is null or p_offset<0 or p_offset>10000
  then raise exception 'invalid_market_inbox_request';end if;
  if not exists(select 1 from private.market_runtime_guard_v1
    where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;

  with entries as (
    select ('return:'||r.delivery_id::text) as id,
      'returned'::text as kind,
      r.delivery_id as "deliveryId",
      r.item_id as "itemId",
      r.asset_kind as "assetKind",
      r.quantity as quantity,
      0::bigint as "goldChange",
      case when r.status='pending' then 'ready' else 'claimed' end as status,
      r.created_at as "createdAt",r.claimed_at as "claimedAt"
    from private.market_return_deliveries_v2 r
    where r.recipient_account_id=p_account_id
    union all
    select ('purchase:'||p.delivery_id::text) as id,
      'purchased'::text as kind,
      p.delivery_id as "deliveryId",
      p.item_id as "itemId",
      p.asset_kind as "assetKind",
      p.quantity as quantity,
      (-g.gross_gold)::bigint as "goldChange",
      case when p.status='pending' then 'ready' else 'claimed' end as status,
      p.created_at as "createdAt",p.claimed_at as "claimedAt"
    from private.market_purchase_deliveries_v3 p
    join private.market_gold_intents_v2 g on g.source_hold_id=p.source_hold_id
       and g.buyer_account_id=p.buyer_account_id and g.seller_account_id=p.seller_account_id
       and g.status='settled'
    where p.buyer_account_id=p_account_id
    union all
    select ('sale:'||o.offer_id::text) as id,
      'sold'::text as kind,
      null::uuid as "deliveryId",
      a.item_id as "itemId",
      a.asset_kind as "assetKind",
      o.quantity::bigint as quantity,
      g.seller_payout_gold as "goldChange",
      'credited'::text as status,
      o.sold_at as "createdAt",o.sold_at as "claimedAt"
    from private.market_sale_offers_v3 o
    join private.market_custody_holds_v1 h on h.hold_id=o.source_hold_id
      and h.owner_account_id=o.seller_account_id and h.status='settled'
    join private.market_custody_assets_v1 a on a.asset_id=h.asset_id
      and a.owner_account_id=o.seller_account_id
    join private.market_gold_intents_v2 g on g.source_hold_id=h.hold_id
      and g.seller_account_id=o.seller_account_id and g.status='settled'
    where o.seller_account_id=p_account_id and o.status='sold'
  ), scoped as (
    select * from entries
    where (status in ('claimed','credited'))=p_history
  ), page as (
    select * from scoped order by "createdAt" desc,id limit 40 offset p_offset
  )
  select pg_catalog.jsonb_build_object(
    'entries',coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p)
      order by p."createdAt" desc,p.id) from page p),'[]'::jsonb),
    'pendingCount',(select count(*) from entries where status='ready'),
    'total',(select count(*) from scoped)
  ) into v_output;

  return v_output;
end;
$market_inbox$;

revoke all on function private.market_inbox_snapshot_v4(uuid,boolean,integer)
from public,anon,authenticated,service_role;

comment on function private.market_inbox_snapshot_v4(uuid,boolean,integer) is
  'Private, disabled market inbox. Purchased and returned items are individually claimable; sold Gold is already credited atomically.';
commit;
