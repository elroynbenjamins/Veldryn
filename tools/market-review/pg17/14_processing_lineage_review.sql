-- DISPOSABLE review only, included inside the existing rollback suite.
-- Fictional processing recipe and output; no real EQ2 source grants.
DO $$ BEGIN
 IF current_database()<>'eq2_market_review' OR current_user<>'eq2_market_review'
 OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_only'; END IF;
END $$;
CREATE TABLE market_review.process_recipe(
 recipe text PRIMARY KEY REFERENCES market_review.consume_recipe,
 output_item text NOT NULL REFERENCES market_review.resource_policy,
 output_per_batch int NOT NULL CHECK(output_per_batch BETWEEN 1 AND 1000)
);
CREATE TABLE market_review.process_output(
 owner text NOT NULL,request_id text NOT NULL,
 origin text NOT NULL UNIQUE REFERENCES market_review.material_origin,
 destination text NOT NULL,quantity bigint NOT NULL CHECK(quantity>0),
 args jsonb NOT NULL,response jsonb NOT NULL,
 PRIMARY KEY(owner,request_id),
 FOREIGN KEY(owner,request_id) REFERENCES market_review.material_spend(owner,request_id),
 FOREIGN KEY(owner,destination) REFERENCES market_review.resource_claim_destination(owner,destination)
);
CREATE TRIGGER process_recipe_immutable BEFORE UPDATE OR DELETE ON market_review.process_recipe
 FOR EACH ROW EXECUTE FUNCTION market_review.immutable();
CREATE TRIGGER process_output_immutable BEFORE UPDATE OR DELETE ON market_review.process_output
 FOR EACH ROW EXECUTE FUNCTION market_review.immutable();
CREATE FUNCTION market_review.process_material(
 p_actor text,p_request text,p_character text,p_recipe text,p_batches int,
 p_destination text,p_abort boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE rule market_review.process_recipe%ROWTYPE; prior market_review.process_output%ROWTYPE;
 args jsonb; answer jsonb; output_origin text; amount bigint; capacity bigint; used bigint;
BEGIN
 IF p_actor IS NULL OR p_request IS NULL OR p_character IS NULL OR p_recipe IS NULL
 OR p_batches IS NULL OR p_batches NOT BETWEEN 1 AND 1000 OR p_destination IS NULL
 THEN RAISE EXCEPTION 'invalid_processing'; END IF;
 PERFORM 1 FROM market_review.wallet WHERE id=p_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown_actor'; END IF;
 args:=jsonb_build_array('process',p_character,p_recipe,p_batches,p_destination);
 SELECT * INTO prior FROM market_review.process_output WHERE owner=p_actor AND request_id=p_request;
 IF FOUND THEN
  IF prior.args IS DISTINCT FROM args THEN RAISE EXCEPTION 'request_conflict'; END IF;
  RETURN prior.response;
 END IF;
 -- A prior ordinary consumption cannot be repurposed as an output entitlement.
 IF EXISTS(SELECT 1 FROM market_review.request WHERE actor=p_actor AND request_id=p_request)
 THEN RAISE EXCEPTION 'request_conflict'; END IF;
 SELECT * INTO rule FROM market_review.process_recipe WHERE recipe=p_recipe;
 IF NOT FOUND THEN RAISE EXCEPTION 'unregistered_process_recipe'; END IF;
 IF EXISTS(SELECT 1 FROM market_review.consume_recipe_input WHERE recipe=p_recipe AND item=rule.output_item)
 THEN RAISE EXCEPTION 'invalid_process_cycle'; END IF;
 IF p_destination NOT IN ('inventory:'||p_character,'bank') THEN RAISE EXCEPTION 'invalid_process_destination'; END IF;
 SELECT cap INTO capacity FROM market_review.resource_claim_destination WHERE owner=p_actor AND destination=p_destination;
 IF NOT FOUND THEN RAISE EXCEPTION 'invalid_process_destination'; END IF;
 -- Existing recipe debit and source partition are reused, same transaction.
 PERFORM market_review.consume_material(p_actor,p_request,p_character,p_recipe,p_batches);
 amount:=rule.output_per_batch::bigint*p_batches;
 SELECT coalesce(sum(quantity),0) INTO used FROM market_review.resource_claim_projection WHERE owner=p_actor AND destination=p_destination;
 IF used>capacity OR amount>capacity-used THEN RAISE EXCEPTION 'process_destination_full'; END IF;
 output_origin:='processed-'||gen_random_uuid()::text;
 INSERT INTO market_review.material_origin VALUES(output_origin,rule.output_item,p_actor,'processing',amount);
 INSERT INTO market_review.material_stock_lot VALUES(p_actor,output_origin,p_destination,amount);
 INSERT INTO market_review.resource_stock VALUES(p_actor,rule.output_item,amount)
 ON CONFLICT(owner,item) DO UPDATE SET quantity=market_review.resource_stock.quantity+excluded.quantity;
 INSERT INTO market_review.resource_claim_projection VALUES(p_actor,p_destination,rule.output_item,amount)
 ON CONFLICT(owner,destination,item) DO UPDATE SET quantity=market_review.resource_claim_projection.quantity+excluded.quantity;
 answer:=jsonb_build_object('status','processed','origin',output_origin,'item',rule.output_item,'quantity',amount,'marketAuthorized',false);
 INSERT INTO market_review.process_output VALUES(p_actor,p_request,output_origin,p_destination,amount,args,answer);
 IF p_abort THEN RAISE EXCEPTION 'injected_after_process_output'; END IF;
 RETURN answer;
END $$;
REVOKE ALL ON TABLE market_review.process_recipe,market_review.process_output FROM PUBLIC;
REVOKE ALL ON FUNCTION market_review.process_material(text,text,text,text,int,text,boolean) FROM PUBLIC;
-- Previous multi-input scenario leaves b with 3 ore in Bank, 4 wood in b2.
INSERT INTO market_review.resource_policy VALUES('fixture-refined',true,1,1,100);
INSERT INTO market_review.process_recipe VALUES('fixture-multi-input','fixture-refined',1);
SELECT market_review.expect_error($q$SELECT market_review.process_material('b','multi-spend','b2','fixture-multi-input',3,'bank')$q$,'request_conflict');
SELECT market_review.expect_error($q$SELECT market_review.process_material('b','process-1','b2','fixture-multi-input',1,'inventory:b1')$q$,'invalid_process_destination');
UPDATE market_review.resource_claim_destination SET cap=2 WHERE owner='b' AND destination='inventory:b2';
SELECT market_review.expect_error($q$SELECT market_review.process_material('b','process-1','b2','fixture-multi-input',1,'inventory:b2')$q$,'process_destination_full');
UPDATE market_review.resource_claim_destination SET cap=100 WHERE owner='b' AND destination='inventory:b2';
SELECT market_review.expect_error($q$SELECT market_review.process_material('b','process-1','b2','fixture-multi-input',1,'inventory:b2',true)$q$,'injected_after_process_output');
SELECT market_review.assert_material_conservation();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM market_review.process_output)
 OR EXISTS(SELECT 1 FROM market_review.material_origin WHERE source_kind='processing')
 OR EXISTS(SELECT 1 FROM market_review.request WHERE actor='b' AND request_id='process-1')
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='ore') IS DISTINCT FROM 3::bigint
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='wood') IS DISTINCT FROM 4::bigint
 THEN RAISE EXCEPTION 'processing_rollback_failed'; END IF;
END $$;
SELECT market_review.process_material('b','process-1','b2','fixture-multi-input',1,'inventory:b2');
SELECT market_review.process_material('b','process-1','b2','fixture-multi-input',1,'inventory:b2');
SELECT market_review.expect_error($q$SELECT market_review.process_material('b','process-1','b2','fixture-multi-input',1,'bank')$q$,'request_conflict');
SELECT market_review.expect_error($q$DELETE FROM market_review.process_output WHERE owner='b'$q$,'immutable_history');
SELECT market_review.assert_material_conservation();
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.process_output)<>1
 OR (SELECT count(*) FROM market_review.material_origin WHERE source_kind='processing')<>1
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='fixture-refined') IS DISTINCT FROM 1::bigint
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='ore') IS DISTINCT FROM 0::bigint
 OR (SELECT quantity FROM market_review.resource_stock WHERE owner='b' AND item='wood') IS DISTINCT FROM 2::bigint
 OR (SELECT sum(quantity) FROM market_review.material_spent_lot WHERE owner='b' AND request_id='process-1') IS DISTINCT FROM 5::numeric
 THEN RAISE EXCEPTION 'processing_lineage_failed'; END IF;
END $$;
