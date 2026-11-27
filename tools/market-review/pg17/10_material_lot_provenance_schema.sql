-- DISPOSABLE only. Source-lot partitioning on the existing resource lifecycle.
-- Caller is the rollback-only claim rehearsal. Never install on live tables.
DO $$ BEGIN
 IF current_database()<>'eq2_market_review' OR current_user<>'eq2_market_review'
 OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_only'; END IF;
END $$;
CREATE TABLE market_review.material_origin(
 id text PRIMARY KEY,item text NOT NULL REFERENCES market_review.resource_policy,
 original_owner text NOT NULL REFERENCES market_review.wallet,
 source_kind text NOT NULL CHECK(source_kind IN ('gathering','monster','processing')),
 issued bigint NOT NULL CHECK(issued>0)
);
CREATE TRIGGER material_origin_immutable BEFORE UPDATE OR DELETE ON market_review.material_origin
 FOR EACH ROW EXECUTE FUNCTION market_review.immutable();
CREATE TABLE market_review.material_stock_lot(
 owner text NOT NULL REFERENCES market_review.wallet,origin text NOT NULL REFERENCES market_review.material_origin,
 destination text NOT NULL,quantity bigint NOT NULL CHECK(quantity>=0),
 PRIMARY KEY(owner,origin,destination)
);
CREATE TABLE market_review.material_escrow_lot(
 offer text NOT NULL REFERENCES market_review.resource_offer,origin text NOT NULL REFERENCES market_review.material_origin,
 initial_qty bigint NOT NULL CHECK(initial_qty>0),remaining bigint NOT NULL CHECK(remaining BETWEEN 0 AND initial_qty),
 PRIMARY KEY(offer,origin)
);
CREATE TABLE market_review.material_delivery_lot(
 actor text NOT NULL,request_id text NOT NULL,origin text NOT NULL REFERENCES market_review.material_origin,
 quantity bigint NOT NULL CHECK(quantity>0),PRIMARY KEY(actor,request_id,origin),
 FOREIGN KEY(actor,request_id) REFERENCES market_review.resource_delivery(actor,request_id)
);
CREATE TRIGGER material_delivery_lot_immutable BEFORE UPDATE OR DELETE ON market_review.material_delivery_lot
 FOR EACH ROW EXECUTE FUNCTION market_review.immutable();
-- Existing resource_act already holds the seller/account wallet. Deterministic
-- allocation across lots is an internal fixture rule, not a player priority.
CREATE FUNCTION market_review.partition_material_listing() RETURNS trigger
 LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r record; outstanding bigint:=NEW.initial_qty; taken bigint;
BEGIN
 FOR r IN SELECT l.* FROM market_review.material_stock_lot l
 JOIN market_review.material_origin o ON o.id=l.origin
 WHERE l.owner=NEW.seller AND o.item=NEW.item AND l.quantity>0
 ORDER BY l.origin,l.destination FOR UPDATE OF l LOOP
  EXIT WHEN outstanding=0;
  taken:=least(outstanding,r.quantity);
  UPDATE market_review.material_stock_lot SET quantity=quantity-taken
   WHERE owner=r.owner AND origin=r.origin AND destination=r.destination;
  IF r.destination<>'opening' THEN
   UPDATE market_review.resource_claim_projection SET quantity=quantity-taken
    WHERE owner=r.owner AND destination=r.destination AND item=NEW.item AND quantity>=taken;
   IF NOT FOUND THEN RAISE EXCEPTION 'material_destination_diverged'; END IF;
  END IF;
  INSERT INTO market_review.material_escrow_lot VALUES(NEW.id,r.origin,taken,taken)
   ON CONFLICT(offer,origin) DO UPDATE SET
   initial_qty=market_review.material_escrow_lot.initial_qty+excluded.initial_qty,
   remaining=market_review.material_escrow_lot.remaining+excluded.remaining;
  outstanding:=outstanding-taken;
 END LOOP;
 IF outstanding<>0 THEN RAISE EXCEPTION 'material_origin_stock_missing'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER partition_material_listing AFTER INSERT ON market_review.resource_offer
 FOR EACH ROW EXECUTE FUNCTION market_review.partition_material_listing();
CREATE FUNCTION market_review.partition_material_delivery() RETURNS trigger
 LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r record; outstanding bigint:=NEW.quantity; taken bigint;
BEGIN
 FOR r IN SELECT * FROM market_review.material_escrow_lot
 WHERE offer=NEW.offer AND remaining>0 ORDER BY origin FOR UPDATE LOOP
  EXIT WHEN outstanding=0;
  taken:=least(outstanding,r.remaining);
  UPDATE market_review.material_escrow_lot SET remaining=remaining-taken WHERE offer=r.offer AND origin=r.origin;
  INSERT INTO market_review.material_delivery_lot VALUES(NEW.actor,NEW.request_id,r.origin,taken);
  outstanding:=outstanding-taken;
 END LOOP;
 IF outstanding<>0 THEN RAISE EXCEPTION 'material_escrow_missing'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER partition_material_delivery AFTER INSERT ON market_review.resource_delivery
 FOR EACH ROW EXECUTE FUNCTION market_review.partition_material_delivery();
CREATE FUNCTION market_review.partition_material_claim() RETURNS trigger
 LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r record; total bigint:=0;
BEGIN
 FOR r IN SELECT l.* FROM market_review.material_delivery_lot l
 JOIN market_review.material_origin o ON o.id=l.origin
 WHERE l.actor=NEW.delivery_actor AND l.request_id=NEW.delivery_request AND o.item=NEW.item
 ORDER BY l.origin LOOP
  INSERT INTO market_review.material_stock_lot VALUES(NEW.owner,r.origin,NEW.destination,r.quantity)
   ON CONFLICT(owner,origin,destination) DO UPDATE SET quantity=market_review.material_stock_lot.quantity+excluded.quantity;
  total:=total+r.quantity;
 END LOOP;
 IF total<>NEW.quantity THEN RAISE EXCEPTION 'material_delivery_origin_mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER partition_material_claim AFTER INSERT ON market_review.resource_claim
 FOR EACH ROW EXECUTE FUNCTION market_review.partition_material_claim();
-- Check each original issued quantity separately, then reconcile account totals
-- and outstanding offer/delivery projections. No credit from history twice.
CREATE FUNCTION market_review.assert_material_conservation() RETURNS void
 LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM market_review.material_origin o WHERE o.issued IS DISTINCT FROM
  coalesce((SELECT sum(quantity) FROM market_review.material_stock_lot s WHERE s.origin=o.id),0)
  +coalesce((SELECT sum(remaining) FROM market_review.material_escrow_lot e WHERE e.origin=o.id),0)
  +coalesce((SELECT sum(quantity) FROM market_review.material_delivery_lot d WHERE d.origin=o.id
    AND NOT EXISTS(SELECT 1 FROM market_review.resource_claim c WHERE c.delivery_actor=d.actor AND c.delivery_request=d.request_id)),0))
 OR EXISTS(SELECT 1 FROM market_review.resource_stock s WHERE s.quantity IS DISTINCT FROM
  coalesce((SELECT sum(l.quantity) FROM market_review.material_stock_lot l JOIN market_review.material_origin o ON o.id=l.origin
   WHERE l.owner=s.owner AND o.item=s.item),0))
 OR EXISTS(SELECT 1 FROM market_review.material_stock_lot l JOIN market_review.material_origin o ON o.id=l.origin
  WHERE l.quantity>0 AND NOT EXISTS(SELECT 1 FROM market_review.resource_stock s WHERE s.owner=l.owner AND s.item=o.item))
 OR EXISTS(SELECT 1 FROM market_review.resource_offer o WHERE o.remaining IS DISTINCT FROM
  coalesce((SELECT sum(e.remaining) FROM market_review.material_escrow_lot e WHERE e.offer=o.id),0))
 OR EXISTS(SELECT 1 FROM market_review.resource_delivery d WHERE d.quantity IS DISTINCT FROM
  coalesce((SELECT sum(l.quantity) FROM market_review.material_delivery_lot l WHERE l.actor=d.actor AND l.request_id=d.request_id),0))
 OR EXISTS(SELECT 1 FROM market_review.resource_claim_projection p WHERE p.quantity IS DISTINCT FROM
  coalesce((SELECT sum(l.quantity) FROM market_review.material_stock_lot l JOIN market_review.material_origin o ON o.id=l.origin
   WHERE l.owner=p.owner AND l.destination=p.destination AND o.item=p.item),0))
 THEN RAISE EXCEPTION 'material_conservation_failed'; END IF;
END $$;
INSERT INTO market_review.material_origin VALUES
 ('origin-01','ore','a','gathering',20),('origin-02','ore','a','gathering',980);
INSERT INTO market_review.material_stock_lot VALUES
 ('a','origin-01','opening',20),('a','origin-02','opening',980);
REVOKE ALL ON ALL TABLES IN SCHEMA market_review FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA market_review FROM PUBLIC;
SELECT market_review.assert_material_conservation();
