-- DISPOSABLE TEST ONLY. No deployment, no Supabase, no real players.
DO $$ BEGIN
 IF current_database() <> 'eq2_market_review' OR current_setting('server_version_num')::int / 10000 <> 17
 OR current_user <> 'eq2_market_review' OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_pg17_localhost_only'; END IF;
END $$;
BEGIN;
CREATE SCHEMA market_review;
REVOKE ALL ON SCHEMA market_review FROM PUBLIC;
CREATE TABLE market_review.wallet(
 id text PRIMARY KEY, gold bigint NOT NULL CHECK(gold>=0),
 inventory_cap int NOT NULL CHECK(inventory_cap>=0), bank_cap int NOT NULL CHECK(bank_cap>=0)
);
CREATE TABLE market_review.character(
 id text PRIMARY KEY, owner text NOT NULL REFERENCES market_review.wallet, eligible boolean NOT NULL,
 UNIQUE(id,owner)
);
CREATE TABLE market_review.mint(
 id text PRIMARY KEY, original_owner text NOT NULL REFERENCES market_review.wallet,
 receipt text UNIQUE NOT NULL, generation text NOT NULL CHECK(generation='equipment-2.0'),
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object')
);
CREATE TABLE market_review.policy(
 id text PRIMARY KEY REFERENCES market_review.mint, approved boolean NOT NULL
);
-- One authoritative location row. No shadow inventory copy in this fixture.
CREATE TABLE market_review.custody(
 id text PRIMARY KEY REFERENCES market_review.mint, owner text NOT NULL REFERENCES market_review.wallet,
 state text NOT NULL CHECK(state IN ('inventory','bank','escrow','pending_delivery','pending_return')),
 holder text, revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
 protected boolean NOT NULL DEFAULT false,
 FOREIGN KEY(holder,owner) REFERENCES market_review.character(id,owner),
 CHECK((state='inventory')=(holder IS NOT NULL))
);
CREATE TABLE market_review.offer(
 id text PRIMARY KEY, instance text NOT NULL REFERENCES market_review.mint,
 seller text NOT NULL REFERENCES market_review.wallet, price bigint NOT NULL CHECK(price BETWEEN 1 AND 1000000000),
 expires bigint NOT NULL, status text NOT NULL CHECK(status IN ('active','sold','cancelled','expired'))
);
CREATE UNIQUE INDEX one_active ON market_review.offer(instance) WHERE status='active';
CREATE TABLE market_review.sale(
 instance text NOT NULL REFERENCES market_review.mint, ordinal int NOT NULL CHECK(ordinal>0),
 parent int, offer text UNIQUE NOT NULL REFERENCES market_review.offer,
 seller text NOT NULL REFERENCES market_review.wallet, buyer text NOT NULL REFERENCES market_review.wallet,
 gross bigint NOT NULL CHECK(gross>0), fee bigint NOT NULL, net bigint NOT NULL,
 PRIMARY KEY(instance,ordinal), FOREIGN KEY(instance,parent) REFERENCES market_review.sale(instance,ordinal),
 CHECK((ordinal=1 AND parent IS NULL) OR (ordinal>1 AND parent=ordinal-1)),
 CHECK(seller<>buyer AND fee=(gross+19)/20 AND net=gross-fee AND net>=0)
);
CREATE TABLE market_review.request(
 actor text NOT NULL REFERENCES market_review.wallet, request_id text NOT NULL,
 args jsonb NOT NULL, receipt jsonb NOT NULL, PRIMARY KEY(actor,request_id)
);
CREATE FUNCTION market_review.immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'immutable_history'; END $$;
CREATE TRIGGER mint_immutable BEFORE UPDATE OR DELETE ON market_review.mint FOR EACH ROW EXECUTE FUNCTION market_review.immutable();
CREATE TRIGGER sale_immutable BEFORE UPDATE OR DELETE ON market_review.sale FOR EACH ROW EXECUTE FUNCTION market_review.immutable();
CREATE TRIGGER request_immutable BEFORE UPDATE OR DELETE ON market_review.request FOR EACH ROW EXECUTE FUNCTION market_review.immutable();
-- Test fixture input time, actor, eligibility are NOT trusted production inputs.
-- Fixed lock order: instance, policy, then involved wallets sorted. All operations
-- affecting account capacity must acquire wallet locks before reading capacity.
CREATE FUNCTION market_review.act(
 p_op text,p_actor text,p_request text,p_instance text,p_revision bigint,
 p_offer text DEFAULT NULL,p_price bigint DEFAULT NULL,p_now bigint DEFAULT NULL,
 p_recipient text DEFAULT NULL,p_worker boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c market_review.custody%ROWTYPE; o market_review.offer%ROWTYPE;
 prior market_review.request%ROWTYPE; args jsonb; answer jsonb; ok boolean; n int; cap int; available bigint;
BEGIN
 IF p_op IS NULL OR p_actor IS NULL OR p_request IS NULL OR p_instance IS NULL OR p_revision IS NULL
 THEN RAISE EXCEPTION 'invalid_request'; END IF;
 args:=jsonb_build_array(p_op,p_instance,p_revision,p_offer,p_price,p_now,p_recipient,p_worker);
 SELECT * INTO STRICT c FROM market_review.custody WHERE id=p_instance FOR UPDATE;
 SELECT approved INTO STRICT ok FROM market_review.policy WHERE id=p_instance FOR UPDATE;
 PERFORM 1 FROM market_review.wallet WHERE id IN (p_actor,c.owner) ORDER BY id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM market_review.wallet WHERE id=p_actor) THEN RAISE EXCEPTION 'unknown_actor'; END IF;
 SELECT * INTO prior FROM market_review.request WHERE actor=p_actor AND request_id=p_request;
 IF FOUND THEN
   IF prior.args<>args THEN RAISE EXCEPTION 'request_conflict'; END IF;
   RETURN prior.receipt;
 END IF;
 IF c.revision<>p_revision THEN RAISE EXCEPTION 'stale_revision'; END IF;
 IF p_offer IS NOT NULL THEN SELECT * INTO o FROM market_review.offer WHERE id=p_offer AND instance=p_instance; END IF;
 IF p_op='list' THEN
   IF NOT ok OR c.owner<>p_actor OR c.state<>'inventory' OR c.protected OR p_offer IS NULL
      OR p_price IS NULL OR p_price NOT BETWEEN 1 AND 1000000000 OR p_now IS NULL OR p_now NOT BETWEEN 0 AND 9000000000000000
      THEN RAISE EXCEPTION 'not_listable'; END IF;
   INSERT INTO market_review.offer VALUES(p_offer,p_instance,p_actor,p_price,p_now+604800,'active');
   UPDATE market_review.custody SET state='escrow',holder=NULL WHERE id=p_instance;
 ELSIF p_op IN ('buy','cancel','expire') THEN
   IF c.state<>'escrow' OR o.id IS NULL OR o.status<>'active' OR o.seller<>c.owner THEN RAISE EXCEPTION 'offer_unavailable'; END IF;
   IF p_op='buy' THEN
     IF NOT ok OR c.owner=p_actor OR p_now IS NULL OR p_now<0 OR p_now>=o.expires OR p_price IS DISTINCT FROM o.price
       OR NOT EXISTS(SELECT 1 FROM market_review.character WHERE id=p_recipient AND owner=p_actor AND eligible)
       THEN RAISE EXCEPTION 'not_buyable'; END IF;
     SELECT gold INTO STRICT available FROM market_review.wallet WHERE id=p_actor;
     IF available<o.price THEN RAISE EXCEPTION 'insufficient_gold'; END IF;
     UPDATE market_review.wallet SET gold=gold-o.price WHERE id=p_actor;
     UPDATE market_review.wallet SET gold=gold+o.price-(o.price+19)/20 WHERE id=c.owner;
     SELECT count(*)+1 INTO n FROM market_review.sale WHERE instance=p_instance;
     IF (n=1 AND c.owner<>(SELECT original_owner FROM market_review.mint WHERE id=p_instance))
       OR (n>1 AND NOT EXISTS(SELECT 1 FROM market_review.sale WHERE instance=p_instance AND ordinal=n-1 AND buyer=c.owner))
       THEN RAISE EXCEPTION 'sale_chain_mismatch'; END IF;
     INSERT INTO market_review.sale VALUES(p_instance,n,CASE WHEN n=1 THEN NULL ELSE n-1 END,o.id,c.owner,p_actor,o.price,(o.price+19)/20,o.price-(o.price+19)/20);
     UPDATE market_review.offer SET status='sold' WHERE id=o.id;
     UPDATE market_review.custody SET owner=p_actor,state='pending_delivery',holder=NULL WHERE id=p_instance;
   ELSE
     IF (p_op='cancel' AND c.owner<>p_actor) OR (p_op='expire' AND (p_worker IS DISTINCT FROM true OR p_now IS NULL OR p_now<o.expires))
     THEN RAISE EXCEPTION 'not_recoverable'; END IF;
     UPDATE market_review.offer SET status=CASE WHEN p_op='cancel' THEN 'cancelled' ELSE 'expired' END WHERE id=o.id;
     UPDATE market_review.custody SET state='pending_return',holder=NULL WHERE id=p_instance;
   END IF;
 ELSIF p_op IN ('claim','return','withdraw','deposit') THEN
   IF c.owner<>p_actor OR c.state<>(CASE p_op WHEN 'claim' THEN 'pending_delivery' WHEN 'return' THEN 'pending_return' WHEN 'withdraw' THEN 'bank' ELSE 'inventory' END)
      OR (p_op IN ('deposit','withdraw') AND c.protected) THEN RAISE EXCEPTION 'wrong_custody'; END IF;
   IF p_op='claim' AND NOT EXISTS(SELECT 1 FROM market_review.sale s WHERE s.instance=p_instance AND s.buyer=p_actor
        AND s.ordinal=(SELECT max(ordinal) FROM market_review.sale WHERE instance=p_instance)) THEN RAISE EXCEPTION 'paid_receipt_missing'; END IF;
   IF p_op='deposit' THEN
     SELECT bank_cap INTO cap FROM market_review.wallet WHERE id=p_actor;
     SELECT count(*) INTO n FROM market_review.custody WHERE owner=p_actor AND state='bank';
     IF n>=cap THEN RAISE EXCEPTION 'bank_full'; END IF;
     UPDATE market_review.custody SET state='bank',holder=NULL WHERE id=p_instance;
   ELSE
     IF NOT EXISTS(SELECT 1 FROM market_review.character WHERE id=p_recipient AND owner=p_actor AND eligible) THEN RAISE EXCEPTION 'recipient_ineligible'; END IF;
     SELECT inventory_cap INTO cap FROM market_review.wallet WHERE id=p_actor;
     SELECT count(*) INTO n FROM market_review.custody WHERE owner=p_actor AND state='inventory';
     IF n>=cap THEN RAISE EXCEPTION 'inventory_full'; END IF;
     UPDATE market_review.custody SET state='inventory',holder=p_recipient WHERE id=p_instance;
   END IF;
 ELSE RAISE EXCEPTION 'unknown_operation'; END IF;
 UPDATE market_review.custody SET revision=revision+1 WHERE id=p_instance RETURNING * INTO c;
 answer:=jsonb_build_object('owner',c.owner,'state',c.state,'revision',c.revision,'marketAuthorized',false);
 INSERT INTO market_review.request VALUES(p_actor,p_request,args,answer);
 RETURN answer;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA market_review FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA market_review FROM PUBLIC;
INSERT INTO market_review.wallet VALUES('a',1000,2,1),('b',1000,2,1),('c',1000,2,1);
INSERT INTO market_review.character VALUES('a1','a',true),('b1','b',true),('b2','b',true),('b_low','b',false),('c1','c',true);
INSERT INTO market_review.mint VALUES
 ('x','a','mint-x','equipment-2.0','{"quality":77,"rarity":"rare"}'),
 ('y','a','mint-y','equipment-2.0','{"quality":50,"rarity":"common"}');
INSERT INTO market_review.policy VALUES('x',true),('y',true);
INSERT INTO market_review.custody(id,owner,state,holder) VALUES('x','a','inventory','a1'),('y','a','inventory','a1');
COMMIT;
