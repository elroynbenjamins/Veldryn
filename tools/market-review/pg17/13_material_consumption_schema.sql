-- DISPOSABLE review only. Material consumption is NOT a real Forge claim,
-- recipe approval, output grant, XP award, or gameplay persistence adapter.
DO $$ BEGIN
 IF current_database()<>'eq2_market_review' OR current_user<>'eq2_market_review'
 OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_only'; END IF;
END $$;
CREATE TABLE market_review.consume_recipe(id text PRIMARY KEY);
CREATE TABLE market_review.consume_recipe_input(
 recipe text NOT NULL REFERENCES market_review.consume_recipe,
 item text NOT NULL REFERENCES market_review.resource_policy,
 per_batch int NOT NULL CHECK(per_batch BETWEEN 1 AND 1000000),
 PRIMARY KEY(recipe,item)
);
CREATE TRIGGER consume_recipe_immutable BEFORE UPDATE OR DELETE ON market_review.consume_recipe
 FOR EACH ROW EXECUTE FUNCTION market_review.immutable();
CREATE TRIGGER consume_recipe_input_immutable BEFORE UPDATE OR DELETE ON market_review.consume_recipe_input
 FOR EACH ROW EXECUTE FUNCTION market_review.immutable();
INSERT INTO market_review.consume_recipe VALUES('fixture-ore-consumption');
INSERT INTO market_review.consume_recipe_input VALUES('fixture-ore-consumption','ore',3);
CREATE FUNCTION market_review.consume_material(
 p_actor text,p_request text,p_character text,p_recipe text,p_batches int,
 p_abort boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE ingredient market_review.consume_recipe_input%ROWTYPE; prior market_review.request%ROWTYPE;
 args jsonb; answer jsonb; total bigint:=0; required bigint; outstanding bigint; taken bigint; lot record; inputs jsonb:='{}'::jsonb;
BEGIN
 IF p_actor IS NULL OR p_request IS NULL OR p_character IS NULL OR p_recipe IS NULL
 OR p_batches IS NULL OR p_batches NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'invalid_consumption'; END IF;
 PERFORM 1 FROM market_review.wallet WHERE id=p_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown_actor'; END IF;
 args:=jsonb_build_array('material_consume',p_character,p_recipe,p_batches);
 SELECT * INTO prior FROM market_review.request WHERE actor=p_actor AND request_id=p_request;
 IF FOUND THEN
  IF prior.args IS DISTINCT FROM args THEN RAISE EXCEPTION 'request_conflict'; END IF;
  RETURN prior.receipt;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM market_review.character WHERE id=p_character AND owner=p_actor)
 THEN RAISE EXCEPTION 'invalid_consume_character'; END IF;
 IF NOT EXISTS(SELECT 1 FROM market_review.consume_recipe WHERE id=p_recipe)
 OR NOT EXISTS(SELECT 1 FROM market_review.consume_recipe_input WHERE recipe=p_recipe)
 THEN RAISE EXCEPTION 'unregistered_consume_recipe'; END IF;
 INSERT INTO market_review.material_spend VALUES(p_actor,p_request,p_character,p_recipe,p_batches);
 -- One account lock and transaction for ALL ingredients. Deterministic item
 -- order permits regression of a later missing ingredient after an earlier debit.
 FOR ingredient IN SELECT * FROM market_review.consume_recipe_input WHERE recipe=p_recipe ORDER BY item LOOP
  required:=ingredient.per_batch::bigint*p_batches;
  outstanding:=required;
 -- The pinned Forge design consumes the character Inventory before shared
 -- Bank. Never touch another character, pending delivery, escrow or opening
 -- balance whose real destination has not been proven.
 FOR lot IN SELECT l.* FROM market_review.material_stock_lot l
 JOIN market_review.material_origin o ON o.id=l.origin
 WHERE l.owner=p_actor AND o.item=ingredient.item AND l.quantity>0
 AND l.destination IN ('inventory:'||p_character,'bank')
 ORDER BY CASE WHEN l.destination='bank' THEN 1 ELSE 0 END,l.origin
 FOR UPDATE OF l LOOP
  EXIT WHEN outstanding=0;
  taken:=least(outstanding,lot.quantity);
  UPDATE market_review.material_stock_lot SET quantity=quantity-taken
   WHERE owner=lot.owner AND origin=lot.origin AND destination=lot.destination;
  UPDATE market_review.resource_claim_projection SET quantity=quantity-taken
   WHERE owner=p_actor AND destination=lot.destination AND item=ingredient.item AND quantity>=taken;
  IF NOT FOUND THEN RAISE EXCEPTION 'material_destination_diverged'; END IF;
  INSERT INTO market_review.material_spent_lot VALUES(p_actor,p_request,lot.origin,lot.destination,taken);
  outstanding:=outstanding-taken;
 END LOOP;
 IF outstanding<>0 THEN RAISE EXCEPTION 'insufficient_claimed_materials'; END IF;
 UPDATE market_review.resource_stock SET quantity=quantity-required
  WHERE owner=p_actor AND item=ingredient.item AND quantity>=required;
 IF NOT FOUND THEN RAISE EXCEPTION 'material_stock_diverged'; END IF;
 total:=total+required;
 inputs:=inputs||jsonb_build_object(ingredient.item,required);
 END LOOP;
 answer:=jsonb_build_object('status','consumed','quantity',total,'inputs',inputs,'marketAuthorized',false,'canMint',false);
 INSERT INTO market_review.request VALUES(p_actor,p_request,args,answer);
 IF p_abort THEN RAISE EXCEPTION 'injected_after_consumption'; END IF;
 RETURN answer;
END $$;
REVOKE ALL ON TABLE market_review.consume_recipe,market_review.consume_recipe_input FROM PUBLIC;
REVOKE ALL ON FUNCTION market_review.consume_material(text,text,text,text,int,boolean) FROM PUBLIC;
