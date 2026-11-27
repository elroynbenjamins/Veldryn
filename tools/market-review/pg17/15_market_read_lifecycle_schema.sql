-- DISPOSABLE PG17 read projections for the new custody model.
-- Not a migration, public RPC, scheduler or production entitlement issuer.
DO $$ BEGIN
 IF current_database()<>'eq2_market_review' OR current_user<>'eq2_market_review'
 OR current_setting('server_version_num')::int/10000<>17
 OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_only'; END IF;
END $$;
CREATE TABLE market_review.fixture_item(
 item text PRIMARY KEY, label text NOT NULL, kind text NOT NULL CHECK(kind IN ('equipment','resource')),
 tier int NOT NULL CHECK(tier BETWEEN 1 AND 5),category text NOT NULL
);
CREATE TABLE market_review.fixture_copy_item(
 instance text PRIMARY KEY REFERENCES market_review.mint,
 item text NOT NULL REFERENCES market_review.fixture_item
);
-- One historical entry per delivery or seller payout. Equipment evidence is
-- correlated to immutable action receipts by instance, offer and revision.
-- Current custody alone cannot determine historical delivery status after resale.
CREATE VIEW market_review.inbox_entry AS
 SELECT 'resource-delivery:'||d.actor||':'||d.request_id AS id,d.recipient AS owner,
 CASE d.kind WHEN 'purchase' THEN 'purchased' ELSE 'returned' END AS kind,
 o.item,'resource'::text AS asset_kind,d.quantity::bigint AS quantity,-d.gross AS gold_change,
 CASE WHEN c.request_id IS NULL THEN 'ready' ELSE 'claimed' END AS status
 FROM market_review.resource_delivery d JOIN market_review.resource_offer o ON o.id=d.offer
 LEFT JOIN market_review.resource_claim c ON c.delivery_actor=d.actor AND c.delivery_request=d.request_id
 UNION ALL
 SELECT 'resource-sale:'||d.actor||':'||d.request_id,o.seller,'sold',o.item,'resource',d.quantity,d.gross-d.fee,'credited'
 FROM market_review.resource_delivery d JOIN market_review.resource_offer o ON o.id=d.offer WHERE d.kind='purchase'
 UNION ALL
 SELECT 'equipment-purchase:'||s.offer,s.buyer,'purchased',i.item,'equipment',1,-s.gross,
 CASE WHEN EXISTS(SELECT 1 FROM market_review.request c WHERE c.actor=s.buyer AND c.args->>0='claim'
  AND c.args->>1=s.instance AND (c.args->>2)::bigint=(b.args->>2)::bigint+1
  AND c.receipt->>'state'='inventory') THEN 'claimed' ELSE 'ready' END
 FROM market_review.sale s JOIN market_review.fixture_copy_item i ON i.instance=s.instance
 JOIN market_review.request b ON b.actor=s.buyer AND b.args->>0='buy' AND b.args->>1=s.instance
 AND b.args->>3=s.offer AND b.receipt->>'state'='pending_delivery'
 UNION ALL
 SELECT 'equipment-sale:'||s.offer,s.seller,'sold',i.item,'equipment',1,s.net,'credited'
 FROM market_review.sale s JOIN market_review.fixture_copy_item i ON i.instance=s.instance
 UNION ALL
 SELECT 'equipment-return:'||o.id,o.seller,'returned',i.item,'equipment',1,0,
 CASE WHEN EXISTS(SELECT 1 FROM market_review.request c WHERE c.actor=o.seller AND c.args->>0='return'
  AND c.args->>1=o.instance AND (c.args->>2)::bigint=(r.args->>2)::bigint+1
  AND c.receipt->>'state'='inventory') THEN 'claimed' ELSE 'ready' END
 FROM market_review.offer o JOIN market_review.fixture_copy_item i ON i.instance=o.instance
 JOIN market_review.request r ON r.args->>0 IN ('cancel','expire') AND r.args->>1=o.instance
 AND r.args->>3=o.id AND r.receipt->>'owner'=o.seller AND r.receipt->>'state'='pending_return'
 WHERE o.status IN ('cancelled','expired');
CREATE FUNCTION market_review.read_inbox(p_actor text,p_history boolean,p_offset int DEFAULT 0)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF p_actor IS NULL OR p_history IS NULL OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 10000
 OR NOT EXISTS(SELECT 1 FROM market_review.wallet WHERE id=p_actor) THEN RAISE EXCEPTION 'invalid_inbox'; END IF;
 WITH scoped AS (SELECT * FROM market_review.inbox_entry WHERE owner=p_actor),
 filtered AS (SELECT * FROM scoped WHERE (status IN ('claimed','credited'))=p_history),
 page AS (SELECT * FROM filtered ORDER BY id LIMIT 40 OFFSET p_offset)
 SELECT jsonb_build_object('entries',coalesce((SELECT jsonb_agg(jsonb_build_object(
  'id',id,'kind',kind,'itemId',item,'assetKind',asset_kind,'quantity',quantity,
  'goldChange',gold_change,'status',status) ORDER BY id) FROM page),'[]'::jsonb),
  'pendingCount',(SELECT count(*) FROM scoped WHERE status='ready'),
  'total',(SELECT count(*) FROM filtered),'marketAuthorized',false) INTO result;
 RETURN result;
END $$;
-- Shared listing projection. Equipment quantity is exactly one, resources
-- report the CURRENT remaining quantity, not their original lot size.
CREATE VIEW market_review.listing_entry AS
 SELECT 'equipment'::text AS kind,o.id,o.seller,i.item,1::bigint AS initial_qty,
 CASE WHEN o.status='active' THEN 1 ELSE 0 END::bigint AS remaining,
 o.price,o.expires,o.status,c.revision,p.approved AS approved,
 m.snapshot
 FROM market_review.offer o JOIN market_review.custody c ON c.id=o.instance
 JOIN market_review.mint m ON m.id=o.instance JOIN market_review.policy p ON p.id=o.instance
 JOIN market_review.fixture_copy_item i ON i.instance=o.instance
 UNION ALL
 SELECT 'resource',o.id,o.seller,o.item,o.initial_qty,o.remaining,o.price,o.expires,o.status,o.revision,
 p.approved AND o.price BETWEEN p.min_price AND p.max_price AND o.remaining>=p.min_lot,
 NULL::jsonb FROM market_review.resource_offer o JOIN market_review.resource_policy p ON p.item=o.item;
CREATE FUNCTION market_review.read_my_listings(p_actor text,p_now bigint)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF p_actor IS NULL OR p_now IS NULL OR p_now<0 OR NOT EXISTS(SELECT 1 FROM market_review.wallet WHERE id=p_actor)
 THEN RAISE EXCEPTION 'invalid_listings'; END IF;
 SELECT jsonb_build_object('entries',coalesce(jsonb_agg(jsonb_build_object(
 'offerId',id,'assetKind',kind,'itemId',item,'initialQuantity',initial_qty,'remainingQuantity',remaining,
 'unitGold',price,'expiresAt',expires,'status',CASE WHEN status='active' AND expires<=p_now THEN 'expiry_pending' ELSE status END,
 'canCancel',status='active' AND expires>p_now,'marketAuthorized',false) ORDER BY expires,id,kind),'[]'::jsonb),
 'activeCount',count(*) FILTER(WHERE status='active'),'marketAuthorized',false) INTO result
 FROM market_review.listing_entry WHERE seller=p_actor;
 RETURN result;
END $$;
-- Single due listing per transaction, same existing settlement routines.
-- Do not create a scheduler or use client clock in a future real worker.
CREATE FUNCTION market_review.expire_next(p_now bigint) RETURNS jsonb
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE chosen record; copy_id text; result jsonb; key text;
BEGIN
 IF p_now IS NULL OR p_now<0 THEN RAISE EXCEPTION 'invalid_expiry_clock'; END IF;
 SELECT * INTO chosen FROM market_review.listing_entry WHERE status='active' AND expires<=p_now
 ORDER BY expires,kind,id LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('processed',false,'marketAuthorized',false); END IF;
 key:='auto-expire:'||chosen.kind||':'||chosen.id;
 BEGIN
 IF chosen.kind='equipment' THEN
  SELECT instance INTO STRICT copy_id FROM market_review.offer WHERE id=chosen.id;
  result:=market_review.act('expire',chosen.seller,key,copy_id,chosen.revision,chosen.id,p_now=>p_now,p_worker=>true);
 ELSE
  result:=market_review.resource_act('expire',chosen.seller,key,chosen.id,chosen.revision,p_now=>p_now,p_worker=>true);
 END IF;
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM IN ('stale_revision','stale_resource_revision','offer_unavailable','resource_offer_closed')
  THEN RETURN jsonb_build_object('processed',false,'reason','changed','marketAuthorized',false); END IF;
  RAISE;
 END;
 RETURN jsonb_build_object('processed',true,'assetKind',chosen.kind,'offerId',chosen.id,'marketAuthorized',false);
END $$;
-- Public-shaped browse output: no owner, mint receipt, origin or custody data.
-- Stats are a restricted fixture snapshot projection, not an actual EQ2 compiler.
CREATE FUNCTION market_review.read_browse(
 p_now bigint,p_kind text DEFAULT 'all',p_search text DEFAULT NULL,p_tier int DEFAULT NULL,
 p_category text DEFAULT NULL,p_rarity text DEFAULT NULL,p_quality int DEFAULT NULL,
 p_stat text DEFAULT NULL,p_min_stat int DEFAULT NULL,p_sort text DEFAULT 'price_asc',
 p_limit int DEFAULT 25,p_offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF p_now IS NULL OR p_now<0 OR p_kind IS NULL OR p_kind NOT IN ('all','resource','equipment')
 OR p_sort IS NULL OR p_sort NOT IN ('price_asc','price_desc','newest')
 OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 1000
 OR (p_search IS NOT NULL AND (length(p_search) NOT BETWEEN 1 AND 60 OR p_search!~'^[A-Za-z0-9_ -]+$'))
 OR (p_tier IS NOT NULL AND p_tier NOT BETWEEN 1 AND 5)
 OR (p_category IS NOT NULL AND p_category NOT IN ('weapon','armor','material'))
 OR (p_rarity IS NOT NULL AND p_rarity NOT IN ('common','rare','epic','mythic'))
 OR (p_quality IS NOT NULL AND p_quality NOT BETWEEN 0 AND 100)
 OR ((p_stat IS NULL)<>(p_min_stat IS NULL))
 OR (p_stat IS NOT NULL AND p_stat NOT IN ('attack','defense','hp'))
 OR (p_min_stat IS NOT NULL AND p_min_stat NOT BETWEEN 0 AND 1000000)
 THEN RAISE EXCEPTION 'invalid_browse_filters'; END IF;
 WITH eligible AS (
 SELECT l.*,i.label,i.tier,i.category FROM market_review.listing_entry l
 JOIN market_review.fixture_item i ON i.item=l.item AND i.kind=l.kind
 WHERE l.status='active' AND l.approved AND l.expires>p_now AND l.remaining>0
 AND (l.kind='resource' OR EXISTS(SELECT 1 FROM market_review.offer o JOIN market_review.custody c ON c.id=o.instance
 WHERE o.id=l.id AND c.owner=l.seller AND c.state='escrow' AND NOT c.protected))
 AND (p_kind='all' OR l.kind=p_kind)
 AND (p_search IS NULL OR strpos(lower(i.label||' '||i.item),lower(p_search))>0)
 AND (p_tier IS NULL OR i.tier=p_tier) AND (p_category IS NULL OR i.category=p_category)
 AND (p_rarity IS NULL OR l.snapshot->>'rarity'=p_rarity)
 AND (p_quality IS NULL OR CASE WHEN l.snapshot->>'quality'~'^[0-9]{1,3}$' THEN (l.snapshot->>'quality')::int END>=p_quality)
 AND (p_stat IS NULL OR CASE WHEN l.snapshot->'stats'->>p_stat~'^[0-9]{1,7}$' THEN (l.snapshot->'stats'->>p_stat)::int END>=p_min_stat)
 ), ranked AS (
 SELECT *,row_number() OVER(ORDER BY CASE WHEN p_sort='price_asc' THEN price END ASC NULLS LAST,
 CASE WHEN p_sort='price_desc' THEN price END DESC NULLS LAST,
 CASE WHEN p_sort='newest' THEN expires END DESC NULLS LAST,kind,id) AS rank FROM eligible
 ), page AS (SELECT * FROM ranked WHERE rank>p_offset AND rank<=p_offset+p_limit)
 SELECT jsonb_build_object('entries',coalesce((SELECT jsonb_agg(jsonb_build_object(
 'offerId',id,'assetKind',kind,'itemId',item,'name',label,'tier',tier,'category',category,
 'quantity',remaining,'unitGold',price,'totalGold',remaining*price,'expiresAt',expires,
 'rarity',snapshot->>'rarity','quality',snapshot->'quality') ORDER BY rank) FROM page),'[]'::jsonb),
 'total',(SELECT count(*) FROM eligible),'hasMore',(SELECT count(*) FROM eligible)>p_offset+p_limit,
 'limit',p_limit,'offset',p_offset,'marketAuthorized',false) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA market_review FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA market_review FROM PUBLIC;
