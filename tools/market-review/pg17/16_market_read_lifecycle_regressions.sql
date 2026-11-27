-- DISPOSABLE read/lifecycle regression. Roll back before existing races.
DO $$ BEGIN
 IF current_database()<>'eq2_market_review' OR current_user<>'eq2_market_review'
 OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_only'; END IF;
END $$;
BEGIN;
\ir 11_resource_claim_schema.sql
\ir 10_material_lot_provenance_schema.sql
\ir 15_market_read_lifecycle_schema.sql
INSERT INTO market_review.fixture_item VALUES
 ('fixture-sword','Iron Sword','equipment',2,'weapon'),
 ('fixture-helm','Iron Helm','equipment',1,'armor'),
 ('fixture-shield','Guard Shield','equipment',3,'armor'),
 ('ore','Copper Ore','resource',1,'material');
INSERT INTO market_review.mint VALUES
 ('z','b','mint-z','equipment-2.0','{"quality":88,"rarity":"epic","stats":{"defense":40}}');
INSERT INTO market_review.policy VALUES('z',true);
INSERT INTO market_review.custody(id,owner,state,holder) VALUES('z','b','inventory','b2');
INSERT INTO market_review.fixture_copy_item VALUES('x','fixture-sword'),('y','fixture-helm'),('z','fixture-shield');
SELECT market_review.act('list','a','read-list-x','x',0,'read-x',125,100);
SELECT market_review.act('list','a','read-list-y','y',0,'read-y',200,100);
SELECT market_review.resource_act('list','a','read-list-ore','read-ore',0,'ore',100,2,100);
SELECT market_review.act('list','b','read-list-z','z',0,'read-z',200,300);
DO $$ DECLARE b jsonb; BEGIN
 b:=market_review.read_browse(300,p_limit=>2);
 IF b->>'total' IS DISTINCT FROM '4' OR b->>'hasMore' IS DISTINCT FROM 'true'
 OR b#>>'{entries,0,offerId}' IS DISTINCT FROM 'read-ore'
 OR b#>>'{entries,1,offerId}' IS DISTINCT FROM 'read-x'
 OR b#>>'{entries,0,totalGold}' IS DISTINCT FROM '200'
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(b->'entries') e WHERE e ?| ARRAY['seller','owner','snapshot','receipt','instance'])
 THEN RAISE EXCEPTION 'browse_page_projection_failed'; END IF;
 b:=market_review.read_browse(300,p_limit=>2,p_offset=>2);
 IF b#>>'{entries,0,offerId}' IS DISTINCT FROM 'read-y' OR b#>>'{entries,1,offerId}' IS DISTINCT FROM 'read-z'
 OR b->>'hasMore' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'browse_tie_order_failed'; END IF;
 IF market_review.read_browse(300,p_kind=>'equipment',p_search=>'iron',p_tier=>2,p_category=>'weapon',p_rarity=>'rare',p_quality=>70)->>'total' IS DISTINCT FROM '1'
 OR market_review.read_browse(300,p_stat=>'defense',p_min_stat=>40)->>'total' IS DISTINCT FROM '1'
 OR market_review.read_browse(300,p_stat=>'defense',p_min_stat=>41)->>'total' IS DISTINCT FROM '0'
 OR market_review.read_browse(300,p_sort=>'newest')#>>'{entries,0,offerId}' IS DISTINCT FROM 'read-z'
 OR market_review.read_browse(300,p_sort=>'price_desc')#>>'{entries,0,offerId}' IS DISTINCT FROM 'read-y'
 THEN RAISE EXCEPTION 'browse_filter_failed'; END IF;
END $$;
SELECT market_review.expect_error($q$SELECT market_review.read_browse(300,p_stat=>'defense')$q$,'invalid_browse_filters');
SELECT market_review.expect_error($q$SELECT market_review.read_browse(300,p_limit=>51)$q$,'invalid_browse_filters');
SELECT market_review.expect_error($q$SELECT market_review.read_browse(300,p_search=>'%')$q$,'invalid_browse_filters');
UPDATE market_review.policy SET approved=false WHERE id='z';
DO $$ BEGIN
 IF market_review.read_browse(300,p_stat=>'defense',p_min_stat=>40)->>'total' IS DISTINCT FROM '0'
 THEN RAISE EXCEPTION 'revoked_copy_visible'; END IF;
END $$;
SELECT market_review.act('buy','b','read-buy-x','x',1,'read-x',125,301,'b1');
SELECT market_review.resource_act('buy','b','read-buy-ore','read-ore',0,p_quantity=>30,p_price=>2,p_now=>301);
DO $$ DECLARE b jsonb; BEGIN
 b:=market_review.read_inbox('b',false);
 IF b->>'pendingCount' IS DISTINCT FROM '2' OR b->>'total' IS DISTINCT FROM '2'
 OR market_review.read_inbox('c',false)->>'total' IS DISTINCT FROM '0'
 OR market_review.read_inbox('a',true)->>'total' IS DISTINCT FROM '2'
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(b->'entries') e WHERE e ?| ARRAY['owner','actor','receipt','origin'])
 THEN RAISE EXCEPTION 'inbox_scope_or_pending_failed'; END IF;
 IF market_review.read_browse(301,p_kind=>'resource')#>>'{entries,0,quantity}' IS DISTINCT FROM '70'
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(market_review.read_my_listings('a',301)->'entries') e
  WHERE e->>'offerId'='read-ore' AND e->>'initialQuantity'='100' AND e->>'remainingQuantity'='70')
 THEN RAISE EXCEPTION 'partial_listing_projection_failed'; END IF;
END $$;
SELECT market_review.act('claim','b','read-claim-x','x',2,p_recipient=>'b1');
SELECT market_review.act('list','b','read-relist-x','x',3,'read-resale',150,400);
SELECT market_review.act('buy','c','read-resale-buy','x',4,'read-resale',150,401,'c1');
SELECT market_review.act('claim','c','read-resale-claim','x',5,p_recipient=>'c1');
DO $$ BEGIN
 IF market_review.read_inbox('b',false)->>'pendingCount' IS DISTINCT FROM '1'
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(market_review.read_inbox('b',true)->'entries') e
 WHERE e->>'id'='equipment-purchase:read-x' AND e->>'status'='claimed')
 OR market_review.read_inbox('c',false)->>'pendingCount' IS DISTINCT FROM '0'
 THEN RAISE EXCEPTION 'inbox_historical_resale_failed'; END IF;
 IF market_review.expire_next(604899)->>'processed' IS DISTINCT FROM 'false'
 OR market_review.read_browse(604900)->>'total' IS DISTINCT FROM '0'
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(market_review.read_my_listings('a',604900)->'entries') e
 WHERE e->>'offerId'='read-y' AND e->>'status'='expiry_pending' AND e->>'canCancel'='false')
 THEN RAISE EXCEPTION 'expiry_boundary_projection_failed'; END IF;
END $$;
-- Return expired balances even after policy is revoked.
UPDATE market_review.resource_policy SET approved=false WHERE item='ore';
DO $$ BEGIN
 IF market_review.expire_next(604900)->>'offerId' IS DISTINCT FROM 'read-y'
 THEN RAISE EXCEPTION 'equipment_expiry_failed'; END IF;
 IF market_review.expire_next(604900)->>'offerId' IS DISTINCT FROM 'read-ore'
 THEN RAISE EXCEPTION 'resource_expiry_failed'; END IF;
 IF market_review.expire_next(604900)->>'processed' IS DISTINCT FROM 'false'
 THEN RAISE EXCEPTION 'duplicate_expiry_failed'; END IF;
 IF market_review.read_inbox('a',false)->>'pendingCount' IS DISTINCT FROM '2'
 OR market_review.read_my_listings('a',604900)->>'activeCount' IS DISTINCT FROM '0'
 THEN RAISE EXCEPTION 'expiry_inbox_failed'; END IF;
END $$;
SELECT market_review.act('return','a','read-return-y','y',2,p_recipient=>'a1');
SELECT market_review.claim_resource_delivery('a','read-return-ore','a','auto-expire:resource:read-ore','bank');
SELECT market_review.claim_resource_delivery('b','read-claim-ore','b','read-buy-ore','bank');
SELECT market_review.assert_material_conservation();
DO $$ BEGIN
 IF market_review.read_inbox('a',false)->>'pendingCount' IS DISTINCT FROM '0'
 OR market_review.read_inbox('a',true)->>'total' IS DISTINCT FROM '4'
 OR market_review.read_inbox('b',false)->>'pendingCount' IS DISTINCT FROM '0'
 OR market_review.read_inbox('b',true)->>'total' IS DISTINCT FROM '3'
 OR market_review.read_inbox('a',true,1)->>'total' IS DISTINCT FROM '4'
 OR jsonb_array_length(market_review.read_inbox('a',true,1)->'entries')<>3
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='a' AND item='ore') IS DISTINCT FROM 970::bigint
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='ore') IS DISTINCT FROM 30::bigint
 OR (SELECT sum(gold) FROM market_review.wallet)+(SELECT sum(fee) FROM market_review.sale)+(SELECT sum(fee) FROM market_review.resource_delivery)<>3000
 THEN RAISE EXCEPTION 'unified_read_lifecycle_failed'; END IF;
END $$;
ROLLBACK;
