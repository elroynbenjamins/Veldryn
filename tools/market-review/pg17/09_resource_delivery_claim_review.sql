-- DISPOSABLE resource Inbox claim rehearsal, not a gameplay migration.
DO $$ BEGIN
 IF current_database()<>'eq2_market_review' OR current_user<>'eq2_market_review'
 OR current_setting('server_version_num')::int / 10000<>17
 OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_only'; END IF;
END $$;
BEGIN;
\ir 11_resource_claim_schema.sql
\ir 10_material_lot_provenance_schema.sql
SELECT market_review.resource_act('list','a','claim-list','claim-offer',0,'ore',100,2,100);
SELECT market_review.resource_act('buy','b','claim-buy','claim-offer',0,p_quantity=>30,p_price=>2,p_now=>101);
UPDATE market_review.resource_policy SET approved=false WHERE item='ore';
SELECT market_review.resource_act('expire','c','claim-expiry','claim-offer',1,p_now=>604900,p_worker=>true);
SELECT market_review.expect_error($q$SELECT market_review.claim_resource_delivery('c','steal','b','claim-buy','bank')$q$,'delivery_unavailable');
SELECT market_review.expect_error($q$SELECT market_review.claim_resource_delivery('b','claim-b','b','claim-buy','inventory:b1')$q$,'destination_full');
SELECT market_review.expect_error($q$SELECT market_review.claim_resource_delivery('b','claim-b','b','claim-buy','inventory:c1')$q$,'destination_unavailable');
SELECT market_review.expect_error($q$SELECT market_review.claim_resource_delivery('b','claim-b','b','claim-buy','inventory:b2',true)$q$,'injected_after_resource_claim');
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM market_review.resource_claim)
 OR EXISTS(SELECT 1 FROM market_review.resource_claim_projection)
 OR EXISTS(SELECT 1 FROM market_review.resource_stock WHERE owner='b')
 OR EXISTS(SELECT 1 FROM market_review.request WHERE request_id='claim-b')
 THEN RAISE EXCEPTION 'resource_claim_rollback_failed'; END IF;
END $$;
SELECT market_review.claim_resource_delivery('b','claim-b','b','claim-buy','inventory:b2');
SELECT market_review.claim_resource_delivery('b','claim-b','b','claim-buy','inventory:b2');
SELECT market_review.expect_error($q$SELECT market_review.claim_resource_delivery('b','claim-b','b','claim-buy','bank')$q$,'request_conflict');
SELECT market_review.expect_error($q$SELECT market_review.claim_resource_delivery('b','claim-again','b','claim-buy','bank')$q$,'delivery_already_claimed');
SELECT market_review.expect_error($q$SELECT market_review.claim_resource_delivery('c','steal-return','c','claim-expiry','bank')$q$,'delivery_unavailable');
SELECT market_review.claim_resource_delivery('a','claim-return','c','claim-expiry','bank');
SELECT market_review.claim_resource_delivery('a','claim-return','c','claim-expiry','bank');
SELECT market_review.expect_error($q$DELETE FROM market_review.resource_claim WHERE owner='b'$q$,'immutable_history');
DO $$ BEGIN
 IF (SELECT sum(quantity) FROM market_review.resource_stock)+(SELECT sum(remaining) FROM market_review.resource_offer)
 +coalesce((SELECT sum(d.quantity) FROM market_review.resource_delivery d
 WHERE NOT EXISTS(SELECT 1 FROM market_review.resource_claim c WHERE c.delivery_actor=d.actor AND c.delivery_request=d.request_id)),0)<>1000
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='ore') IS DISTINCT FROM 30::bigint
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='a' AND item='ore') IS DISTINCT FROM 970::bigint
 OR (SELECT quantity FROM market_review.resource_claim_projection WHERE owner='b' AND destination='inventory:b2' AND item='ore') IS DISTINCT FROM 30::bigint
 OR (SELECT quantity FROM market_review.resource_claim_projection WHERE owner='a' AND destination='bank' AND item='ore') IS DISTINCT FROM 70::bigint
 OR (SELECT count(*) FROM market_review.resource_claim)<>2
 OR (SELECT gold FROM market_review.wallet WHERE id='b')<>940
 OR (SELECT gold FROM market_review.wallet WHERE id='a')<>1057
 OR (SELECT sum(gold) FROM market_review.wallet)+(SELECT sum(fee) FROM market_review.resource_delivery)<>3000
 THEN RAISE EXCEPTION 'resource_claim_conservation_failed'; END IF;
END $$;

-- Both original source lots survive the partial purchase and return.
SELECT market_review.assert_material_conservation();
DO $$ BEGIN
 IF (SELECT quantity FROM market_review.material_stock_lot WHERE owner='b' AND origin='origin-01' AND destination='inventory:b2') IS DISTINCT FROM 20::bigint
 OR (SELECT quantity FROM market_review.material_stock_lot WHERE owner='b' AND origin='origin-02' AND destination='inventory:b2') IS DISTINCT FROM 10::bigint
 OR (SELECT quantity FROM market_review.material_stock_lot WHERE owner='a' AND origin='origin-02' AND destination='bank') IS DISTINCT FROM 70::bigint
 THEN RAISE EXCEPTION 'material_initial_partition_failed'; END IF;
END $$;
UPDATE market_review.resource_policy SET approved=true WHERE item='ore';
SELECT market_review.resource_act('list','b','resale-list','resale-offer',0,'ore',20,3,200);
SELECT market_review.assert_material_conservation();
SELECT market_review.resource_act('buy','c','resale-buy','resale-offer',0,p_quantity=>20,p_price=>3,p_now=>201);
SELECT market_review.assert_material_conservation();
SELECT market_review.claim_resource_delivery('c','resale-claim','c','resale-buy','bank');
SELECT market_review.claim_resource_delivery('c','resale-claim','c','resale-buy','bank');
SELECT market_review.assert_material_conservation();
SELECT market_review.expect_error($q$UPDATE market_review.material_origin SET issued=999 WHERE id='origin-01'$q$,'immutable_history');
SELECT market_review.expect_error($q$UPDATE market_review.material_delivery_lot SET quantity=999 WHERE actor='c' AND request_id='resale-buy'$q$,'immutable_history');
DO $$ BEGIN
 IF (SELECT quantity FROM market_review.material_stock_lot WHERE owner='c' AND origin='origin-01' AND destination='bank') IS DISTINCT FROM 20::bigint
 OR (SELECT original_owner FROM market_review.material_origin WHERE id='origin-01') IS DISTINCT FROM 'a'
 OR (SELECT quantity FROM market_review.resource_claim_projection WHERE owner='b' AND destination='inventory:b2' AND item='ore') IS DISTINCT FROM 10::bigint
 OR (SELECT sum(gold) FROM market_review.wallet)+(SELECT sum(fee) FROM market_review.resource_delivery)<>3000
 THEN RAISE EXCEPTION 'material_resale_partition_failed'; END IF;
END $$;
ROLLBACK;
