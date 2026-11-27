-- DISPOSABLE review extension, never a migration.
DO $$ BEGIN
 IF current_database()<>'eq2_market_review' OR current_user<>'eq2_market_review'
 OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_only'; END IF;
END $$;
BEGIN;
CREATE TABLE market_review.resource_policy(
 item text PRIMARY KEY, approved boolean NOT NULL, min_lot int NOT NULL CHECK(min_lot>0),
 min_price bigint NOT NULL CHECK(min_price>0), max_price bigint NOT NULL CHECK(max_price>=min_price AND max_price<=1000000000)
);
CREATE TABLE market_review.resource_stock(
 owner text REFERENCES market_review.wallet, item text REFERENCES market_review.resource_policy,
 quantity bigint NOT NULL CHECK(quantity>=0), PRIMARY KEY(owner,item)
);
CREATE TABLE market_review.resource_offer(
 id text PRIMARY KEY, seller text NOT NULL REFERENCES market_review.wallet,
 item text NOT NULL REFERENCES market_review.resource_policy,
 initial_qty int NOT NULL CHECK(initial_qty>0), remaining int NOT NULL CHECK(remaining BETWEEN 0 AND initial_qty),
 price bigint NOT NULL CHECK(price BETWEEN 1 AND 1000000000), expires bigint NOT NULL,
 revision bigint NOT NULL DEFAULT 0, status text NOT NULL CHECK(status IN ('active','sold','cancelled','expired')),
 CHECK((status='active')=(remaining>0))
);
CREATE TABLE market_review.resource_delivery(
 actor text NOT NULL REFERENCES market_review.wallet, request_id text NOT NULL,
 offer text NOT NULL REFERENCES market_review.resource_offer, recipient text NOT NULL REFERENCES market_review.wallet,
 quantity int NOT NULL CHECK(quantity>0), gross bigint NOT NULL CHECK(gross>=0), fee bigint NOT NULL,
 kind text NOT NULL CHECK(kind IN ('purchase','return')), PRIMARY KEY(actor,request_id),
 CHECK((kind='return' AND gross=0 AND fee=0) OR (kind='purchase' AND gross>0 AND fee=(gross+19)/20))
);
CREATE UNIQUE INDEX one_resource_return ON market_review.resource_delivery(offer) WHERE kind='return';
CREATE TRIGGER resource_delivery_immutable BEFORE UPDATE OR DELETE ON market_review.resource_delivery
 FOR EACH ROW EXECUTE FUNCTION market_review.immutable();
-- Both listing paths acquire seller wallet lock before counting. A partial fill
-- creates a delivery, not a second active slot. This fixture has no external writers.
CREATE FUNCTION market_review.shared_listing_cap() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM market_review.wallet WHERE id=NEW.seller FOR UPDATE;
 IF NEW.status='active' AND
  (SELECT count(*) FROM market_review.offer WHERE seller=NEW.seller AND status='active')+
  (SELECT count(*) FROM market_review.resource_offer WHERE seller=NEW.seller AND status='active')>=20
 THEN RAISE EXCEPTION 'account_listing_cap'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER equipment_shared_cap BEFORE INSERT ON market_review.offer FOR EACH ROW EXECUTE FUNCTION market_review.shared_listing_cap();
CREATE TRIGGER resource_shared_cap BEFORE INSERT ON market_review.resource_offer FOR EACH ROW EXECUTE FUNCTION market_review.shared_listing_cap();
CREATE FUNCTION market_review.resource_act(
 p_op text,p_actor text,p_request text,p_offer text,p_revision bigint,
 p_item text DEFAULT NULL,p_quantity int DEFAULT NULL,p_price bigint DEFAULT NULL,p_now bigint DEFAULT NULL,
 p_worker boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE o market_review.resource_offer%ROWTYPE; pol market_review.resource_policy%ROWTYPE;
 prior market_review.request%ROWTYPE; args jsonb; answer jsonb; gross bigint; fee bigint; rest int;
BEGIN
 IF p_op IS NULL OR p_actor IS NULL OR p_request IS NULL OR p_offer IS NULL OR p_revision IS NULL
 THEN RAISE EXCEPTION 'invalid_resource_request'; END IF;
 args:=jsonb_build_array('resource',p_op,p_offer,p_revision,p_item,p_quantity,p_price,p_now,p_worker);
 -- Existing offers lock first; creation holds seller wallet; no existing-offer row needed for creation.
 IF p_op<>'list' THEN
  SELECT * INTO STRICT o FROM market_review.resource_offer WHERE id=p_offer FOR UPDATE;
  SELECT * INTO STRICT pol FROM market_review.resource_policy WHERE item=o.item FOR SHARE;
 ELSE
  SELECT * INTO STRICT pol FROM market_review.resource_policy WHERE item=p_item FOR SHARE;
 END IF;
 PERFORM 1 FROM market_review.wallet WHERE id IN (p_actor,o.seller) ORDER BY id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM market_review.wallet WHERE id=p_actor) THEN RAISE EXCEPTION 'unknown_actor'; END IF;
 SELECT * INTO prior FROM market_review.request WHERE actor=p_actor AND request_id=p_request;
 IF FOUND THEN
  IF prior.args<>args THEN RAISE EXCEPTION 'request_conflict'; END IF;
  RETURN prior.receipt;
 END IF;
 IF p_op='list' THEN
  IF p_revision<>0 OR NOT pol.approved OR p_quantity IS NULL OR p_quantity<pol.min_lot OR p_quantity>1000000
    OR p_price IS NULL OR p_price NOT BETWEEN pol.min_price AND pol.max_price OR p_now IS NULL OR p_now NOT BETWEEN 0 AND 9000000000000000
  THEN RAISE EXCEPTION 'resource_not_listable'; END IF;
  UPDATE market_review.resource_stock SET quantity=quantity-p_quantity
   WHERE owner=p_actor AND item=p_item AND quantity>=p_quantity;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient_stock'; END IF;
  INSERT INTO market_review.resource_offer VALUES(p_offer,p_actor,p_item,p_quantity,p_quantity,p_price,p_now+604800,0,'active') RETURNING * INTO o;
 ELSE
  IF o.revision<>p_revision THEN RAISE EXCEPTION 'stale_resource_revision'; END IF;
  IF o.status<>'active' THEN RAISE EXCEPTION 'resource_offer_closed'; END IF;
  IF p_op='buy' THEN
   IF NOT pol.approved OR p_actor=o.seller OR p_now IS NULL OR p_now<0 OR p_now>=o.expires
      OR p_price IS DISTINCT FROM o.price OR o.price NOT BETWEEN pol.min_price AND pol.max_price
      OR p_quantity IS NULL OR p_quantity<pol.min_lot OR p_quantity>o.remaining
   THEN RAISE EXCEPTION 'resource_not_buyable'; END IF;
   rest:=o.remaining-p_quantity;
   IF rest>0 AND rest<pol.min_lot THEN RAISE EXCEPTION 'stranded_remainder'; END IF;
   gross:=o.price*p_quantity::bigint; fee:=(gross+19)/20;
   UPDATE market_review.wallet SET gold=gold-gross WHERE id=p_actor AND gold>=gross;
   IF NOT FOUND THEN RAISE EXCEPTION 'insufficient_gold'; END IF;
   UPDATE market_review.wallet SET gold=gold+gross-fee WHERE id=o.seller;
   INSERT INTO market_review.resource_delivery VALUES(p_actor,p_request,o.id,p_actor,p_quantity,gross,fee,'purchase');
   UPDATE market_review.resource_offer SET remaining=rest,status=CASE WHEN rest=0 THEN 'sold' ELSE 'active' END,revision=revision+1 WHERE id=o.id RETURNING * INTO o;
  ELSIF p_op IN ('cancel','expire') THEN
   IF (p_op='cancel' AND o.seller<>p_actor) OR (p_op='expire' AND (p_worker IS DISTINCT FROM true OR p_now IS NULL OR p_now<o.expires))
    THEN RAISE EXCEPTION 'resource_not_recoverable'; END IF;
   INSERT INTO market_review.resource_delivery VALUES(p_actor,p_request,o.id,o.seller,o.remaining,0,0,'return');
   UPDATE market_review.resource_offer SET remaining=0,status=CASE WHEN p_op='cancel' THEN 'cancelled' ELSE 'expired' END,revision=revision+1 WHERE id=o.id RETURNING * INTO o;
  ELSE RAISE EXCEPTION 'unknown_resource_op'; END IF;
 END IF;
 answer:=jsonb_build_object('remaining',o.remaining,'revision',o.revision,'status',o.status,'expires',o.expires,'marketAuthorized',false);
 INSERT INTO market_review.request VALUES(p_actor,p_request,args,answer);
 RETURN answer;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA market_review FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA market_review FROM PUBLIC;
INSERT INTO market_review.resource_policy VALUES('ore',true,10,1,100);
INSERT INTO market_review.resource_stock VALUES('a','ore',1000);
COMMIT;
