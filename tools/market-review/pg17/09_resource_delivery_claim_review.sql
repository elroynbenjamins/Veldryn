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

-- Purchased materials are consumed from the crafter's own pack before Bank.
\ir 13_material_consumption_schema.sql
SELECT market_review.resource_act('list','a','craft-list','craft-offer',0,'ore',20,2,300);
SELECT market_review.resource_act('buy','b','craft-buy','craft-offer',0,p_quantity=>20,p_price=>2,p_now=>301);
SELECT market_review.expect_error($q$SELECT market_review.consume_material('b','craft-unclaimed','b2','fixture-ore-consumption',6)$q$,'insufficient_claimed_materials');
SELECT market_review.claim_resource_delivery('b','craft-collect','b','craft-buy','bank');
SELECT market_review.expect_error($q$SELECT market_review.consume_material('b','craft-foreign','c1','fixture-ore-consumption',1)$q$,'invalid_consume_character');
SELECT market_review.expect_error($q$SELECT market_review.consume_material('b','craft-invalid','b2','unknown',1)$q$,'unregistered_consume_recipe');
SELECT market_review.expect_error($q$SELECT market_review.consume_material('b','craft-alt','b1','fixture-ore-consumption',7)$q$,'insufficient_claimed_materials');
SELECT market_review.expect_error($q$SELECT market_review.consume_material('b','craft-spend','b2','fixture-ore-consumption',6,true)$q$,'injected_after_consumption');
SELECT market_review.assert_material_conservation();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM market_review.material_spend)
 OR EXISTS(SELECT 1 FROM market_review.material_spent_lot)
 OR EXISTS(SELECT 1 FROM market_review.request WHERE actor='b' AND request_id='craft-spend')
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='ore') IS DISTINCT FROM 30::bigint
 THEN RAISE EXCEPTION 'material_consume_rollback_failed'; END IF;
END $$;
UPDATE market_review.resource_policy SET approved=false WHERE item='ore';
SELECT market_review.consume_material('b','craft-spend','b2','fixture-ore-consumption',6);
SELECT market_review.consume_material('b','craft-spend','b2','fixture-ore-consumption',6);
SELECT market_review.expect_error($q$SELECT market_review.consume_material('b','craft-spend','b2','fixture-ore-consumption',5)$q$,'request_conflict');
SELECT market_review.expect_error($q$SELECT market_review.consume_material('b','craft-overdraw','b2','fixture-ore-consumption',5)$q$,'insufficient_claimed_materials');
SELECT market_review.expect_error($q$DELETE FROM market_review.material_spent_lot WHERE owner='b'$q$,'immutable_history');
SELECT market_review.assert_material_conservation();
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.material_spend)<>1
 OR (SELECT sum(quantity) FROM market_review.material_spent_lot WHERE owner='b' AND origin='origin-02') IS DISTINCT FROM 18::numeric
 OR (SELECT quantity FROM market_review.material_spent_lot WHERE owner='b' AND destination='inventory:b2') IS DISTINCT FROM 10::bigint
 OR (SELECT quantity FROM market_review.material_spent_lot WHERE owner='b' AND destination='bank') IS DISTINCT FROM 8::bigint
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='ore') IS DISTINCT FROM 12::bigint
 OR (SELECT quantity FROM market_review.resource_claim_projection WHERE owner='b' AND destination='inventory:b2' AND item='ore') IS DISTINCT FROM 0::bigint
 OR (SELECT quantity FROM market_review.resource_claim_projection WHERE owner='b' AND destination='bank' AND item='ore') IS DISTINCT FROM 12::bigint
 OR (SELECT gold FROM market_review.wallet WHERE id='b')<>957
 OR (SELECT sum(gold) FROM market_review.wallet)+(SELECT sum(fee) FROM market_review.resource_delivery)<>3000
 THEN RAISE EXCEPTION 'material_consumption_invariant_failed'; END IF;
END $$;

-- Multi-input recipe: ore debits precede wood; a later missing ingredient
-- must undo earlier stock, destination and source-lot changes.
INSERT INTO market_review.resource_policy VALUES('wood',true,10,1,100);
INSERT INTO market_review.resource_stock VALUES('a','wood',20);
INSERT INTO market_review.material_origin VALUES('origin-wood','wood','a','gathering',20);
INSERT INTO market_review.material_stock_lot VALUES('a','origin-wood','opening',20);
INSERT INTO market_review.consume_recipe VALUES('fixture-multi-input'),('fixture-empty-recipe');
INSERT INTO market_review.consume_recipe_input VALUES('fixture-multi-input','ore',3),('fixture-multi-input','wood',2);
SELECT market_review.expect_error($q$SELECT market_review.consume_material('b','multi-empty','b2','fixture-empty-recipe',1)$q$,'unregistered_consume_recipe');
SELECT market_review.expect_error($q$UPDATE market_review.consume_recipe_input SET per_batch=1 WHERE recipe='fixture-multi-input' AND item='wood'$q$,'immutable_history');
SELECT market_review.resource_act('list','a','wood-list','wood-offer',0,'wood',20,2,400);
SELECT market_review.resource_act('buy','b','wood-buy','wood-offer',0,p_quantity=>10,p_price=>2,p_now=>401);
SELECT market_review.expect_error($q$SELECT market_review.consume_material('b','multi-spend','b2','fixture-multi-input',3)$q$,'insufficient_claimed_materials');
SELECT market_review.assert_material_conservation();
DO $$ BEGIN
 IF (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='ore') IS DISTINCT FROM 12::bigint
 OR (SELECT quantity FROM market_review.resource_claim_projection WHERE owner='b' AND destination='bank' AND item='ore') IS DISTINCT FROM 12::bigint
 OR EXISTS(SELECT 1 FROM market_review.material_spend WHERE owner='b' AND request_id='multi-spend')
 OR EXISTS(SELECT 1 FROM market_review.material_spent_lot WHERE owner='b' AND request_id='multi-spend')
 OR EXISTS(SELECT 1 FROM market_review.request WHERE actor='b' AND request_id='multi-spend')
 THEN RAISE EXCEPTION 'later_ingredient_rollback_failed'; END IF;
END $$;
SELECT market_review.claim_resource_delivery('b','wood-collect','b','wood-buy','inventory:b2');
SELECT market_review.expect_error($q$SELECT market_review.consume_material('b','multi-spend','b2','fixture-multi-input',3,true)$q$,'injected_after_consumption');
SELECT market_review.assert_material_conservation();
DO $$ BEGIN
 IF (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='ore') IS DISTINCT FROM 12::bigint
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='wood') IS DISTINCT FROM 10::bigint
 OR EXISTS(SELECT 1 FROM market_review.material_spend WHERE owner='b' AND request_id='multi-spend')
 OR EXISTS(SELECT 1 FROM market_review.request WHERE actor='b' AND request_id='multi-spend')
 THEN RAISE EXCEPTION 'multi_input_fault_rollback_failed'; END IF;
END $$;
SELECT market_review.consume_material('b','multi-spend','b2','fixture-multi-input',3);
SELECT market_review.consume_material('b','multi-spend','b2','fixture-multi-input',3);
SELECT market_review.expect_error($q$SELECT market_review.consume_material('b','multi-spend','b2','fixture-multi-input',2)$q$,'request_conflict');
SELECT market_review.assert_material_conservation();
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.material_spend WHERE owner='b')<>2
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='ore') IS DISTINCT FROM 3::bigint
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='wood') IS DISTINCT FROM 4::bigint
 OR (SELECT quantity FROM market_review.material_spent_lot WHERE owner='b' AND request_id='multi-spend' AND origin='origin-02' AND destination='bank') IS DISTINCT FROM 9::bigint
 OR (SELECT quantity FROM market_review.material_spent_lot WHERE owner='b' AND request_id='multi-spend' AND origin='origin-wood' AND destination='inventory:b2') IS DISTINCT FROM 6::bigint
 OR (SELECT receipt->'inputs' FROM market_review.request WHERE actor='b' AND request_id='multi-spend') IS DISTINCT FROM '{"ore":9,"wood":6}'::jsonb
 OR (SELECT remaining FROM market_review.resource_offer WHERE id='wood-offer') IS DISTINCT FROM 10
 OR (SELECT gold FROM market_review.wallet WHERE id='b')<>937
 OR (SELECT sum(gold) FROM market_review.wallet)+(SELECT sum(fee) FROM market_review.resource_delivery)<>3000
 THEN RAISE EXCEPTION 'multi_input_conservation_failed'; END IF;
END $$;
ROLLBACK;
