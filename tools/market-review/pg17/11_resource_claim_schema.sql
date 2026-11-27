-- DISPOSABLE resource Inbox claim rehearsal, not a gameplay migration.
DO $$ BEGIN
 IF current_database()<>'eq2_market_review' OR current_user<>'eq2_market_review'
 OR current_setting('server_version_num')::int / 10000<>17
 OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_only'; END IF;
END $$;
-- This projection tracks only newly claimed stock; it is a subset of
-- resource_stock, NOT a second source of materials. Quantity capacities are
-- synthetic test limits, not the live inventory slot/stack rules.
CREATE TABLE market_review.resource_claim_destination(
 owner text NOT NULL REFERENCES market_review.wallet,
 destination text NOT NULL, holder text,
 cap bigint NOT NULL CHECK(cap>=0),
 PRIMARY KEY(owner,destination),
 FOREIGN KEY(holder,owner) REFERENCES market_review.character(id,owner),
 CHECK((destination='bank' AND holder IS NULL) OR
       (holder IS NOT NULL AND destination='inventory:'||holder))
);
CREATE TABLE market_review.resource_claim_projection(
 owner text NOT NULL,destination text NOT NULL,item text NOT NULL REFERENCES market_review.resource_policy,
 quantity bigint NOT NULL CHECK(quantity>=0),
 PRIMARY KEY(owner,destination,item),
 FOREIGN KEY(owner,destination) REFERENCES market_review.resource_claim_destination(owner,destination)
);
CREATE TABLE market_review.resource_claim(
 delivery_actor text NOT NULL,delivery_request text NOT NULL,
 owner text NOT NULL,request_id text NOT NULL,destination text NOT NULL,
 item text NOT NULL REFERENCES market_review.resource_policy,quantity int NOT NULL CHECK(quantity>0),
 PRIMARY KEY(delivery_actor,delivery_request),UNIQUE(owner,request_id),
 FOREIGN KEY(delivery_actor,delivery_request) REFERENCES market_review.resource_delivery(actor,request_id),
 FOREIGN KEY(owner,destination) REFERENCES market_review.resource_claim_destination(owner,destination)
);
CREATE TRIGGER resource_claim_immutable BEFORE UPDATE OR DELETE ON market_review.resource_claim
 FOR EACH ROW EXECUTE FUNCTION market_review.immutable();
CREATE FUNCTION market_review.claim_resource_delivery(
 p_actor text,p_request text,p_delivery_actor text,p_delivery_request text,
 p_destination text,p_abort boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE d market_review.resource_delivery%ROWTYPE;
 dst market_review.resource_claim_destination%ROWTYPE;
 prior market_review.request%ROWTYPE; args jsonb; answer jsonb; item_id text; used bigint;
BEGIN
 IF p_actor IS NULL OR p_request IS NULL OR p_delivery_actor IS NULL OR
 p_delivery_request IS NULL OR p_destination IS NULL THEN RAISE EXCEPTION 'invalid_claim'; END IF;
 -- Immutable delivery evidence does not require an offer lock. Serialize all
 -- destination/stock changes by the account wallet before reading capacity.
 PERFORM 1 FROM market_review.wallet WHERE id=p_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown_actor'; END IF;
 args:=jsonb_build_array('resource_claim',p_delivery_actor,p_delivery_request,p_destination);
 SELECT * INTO prior FROM market_review.request WHERE actor=p_actor AND request_id=p_request;
 IF FOUND THEN
  IF prior.args IS DISTINCT FROM args THEN RAISE EXCEPTION 'request_conflict'; END IF;
  RETURN prior.receipt;
 END IF;
 SELECT * INTO d FROM market_review.resource_delivery
 WHERE actor=p_delivery_actor AND request_id=p_delivery_request AND recipient=p_actor;
 IF NOT FOUND THEN RAISE EXCEPTION 'delivery_unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM market_review.resource_claim
  WHERE delivery_actor=d.actor AND delivery_request=d.request_id)
 THEN RAISE EXCEPTION 'delivery_already_claimed'; END IF;
 SELECT * INTO dst FROM market_review.resource_claim_destination
 WHERE owner=p_actor AND destination=p_destination;
 IF NOT FOUND THEN RAISE EXCEPTION 'destination_unavailable'; END IF;
 SELECT coalesce(sum(quantity),0) INTO used FROM market_review.resource_claim_projection
 WHERE owner=p_actor AND destination=p_destination;
 IF used>dst.cap OR d.quantity>dst.cap-used THEN RAISE EXCEPTION 'destination_full'; END IF;
 SELECT item INTO STRICT item_id FROM market_review.resource_offer WHERE id=d.offer;
 -- Do not reapply the listing policy to a previously paid or returned lot.
 INSERT INTO market_review.resource_stock(owner,item,quantity) VALUES(p_actor,item_id,d.quantity)
 ON CONFLICT(owner,item) DO UPDATE SET quantity=market_review.resource_stock.quantity+excluded.quantity;
 INSERT INTO market_review.resource_claim_projection(owner,destination,item,quantity)
 VALUES(p_actor,p_destination,item_id,d.quantity)
 ON CONFLICT(owner,destination,item) DO UPDATE SET quantity=market_review.resource_claim_projection.quantity+excluded.quantity;
 INSERT INTO market_review.resource_claim VALUES(d.actor,d.request_id,p_actor,p_request,p_destination,item_id,d.quantity);
 answer:=jsonb_build_object('status','claimed','quantity',d.quantity,'destination',p_destination,'marketAuthorized',false);
 INSERT INTO market_review.request VALUES(p_actor,p_request,args,answer);
 IF p_abort THEN RAISE EXCEPTION 'injected_after_resource_claim'; END IF;
 RETURN answer;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA market_review FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA market_review FROM PUBLIC;
INSERT INTO market_review.resource_claim_destination VALUES
 ('a','bank',NULL,100),('b','inventory:b1','b1',10),
 ('b','inventory:b2','b2',100),('b','bank',NULL,100),('c','bank',NULL,100);
