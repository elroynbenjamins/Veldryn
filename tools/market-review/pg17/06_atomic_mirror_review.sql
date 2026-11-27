-- DISPOSABLE only. This is an atomic mirror/CAS rehearsal, NOT a GameState writer.
-- Run on pristine fixture after rollback regressions, before concurrent tests.
DO $$ BEGIN
 IF current_database()<>'eq2_market_review' OR current_user<>'eq2_market_review'
 OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_only'; END IF;
END $$;
BEGIN;
CREATE TABLE market_review.mirror_character_wallet(
 character_id text PRIMARY KEY REFERENCES market_review.character(id),
 gold bigint NOT NULL CHECK(gold>=0)
);
CREATE TABLE market_review.mirror_online(
 account_id text PRIMARY KEY REFERENCES market_review.wallet(id),
 character_id text NOT NULL,
 revision bigint NOT NULL CHECK(revision>=0),
 state jsonb NOT NULL,
 FOREIGN KEY(character_id,account_id) REFERENCES market_review.character(id,owner)
);
INSERT INTO market_review.mirror_character_wallet VALUES('a1',1000),('b1',1000),('b2',77),('c1',1000);
-- Simplified projection: one active wallet and account-wide exact copies.
-- Real inactive wallet, per-container capacity and canonical serializer remain open.
CREATE FUNCTION market_review.mirror_projection(p_account text,p_character text)
 RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('character',jsonb_build_object('id',p_character,'gold',w.gold),
 'copies',coalesce((SELECT jsonb_agg(jsonb_build_object('instance',c.id,'location',c.state,'holder',c.holder)
   ORDER BY c.id) FROM market_review.custody c WHERE c.owner=w.id),'[]'::jsonb))
 FROM market_review.wallet w WHERE w.id=p_account
$$;
INSERT INTO market_review.mirror_online
 SELECT id,id||'1',0,market_review.mirror_projection(id,id||'1') FROM market_review.wallet;
CREATE TABLE market_review.mirror_receipt(
 actor text NOT NULL,request_id text NOT NULL,args jsonb NOT NULL,response jsonb NOT NULL,
 PRIMARY KEY(actor,request_id)
);
CREATE FUNCTION market_review.mirror_act(
 p_op text,p_actor text,p_request text,p_instance text,p_copy_revision bigint,
 p_actor_revision bigint,p_owner_revision bigint,p_offer text DEFAULT NULL,
 p_price bigint DEFAULT NULL,p_now bigint DEFAULT NULL,p_recipient text DEFAULT NULL,
 p_abort boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c market_review.custody%ROWTYPE; rec market_review.mirror_receipt%ROWTYPE;
 a market_review.mirror_online%ROWTYPE; row_account market_review.mirror_online%ROWTYPE;
 args jsonb; result jsonb; gold_now bigint; owner_before text;
BEGIN
 -- Single-copy test lock order matches normalized act; never transplant this
 -- to real gameplay without reconciling historical account-first locking.
 SELECT * INTO STRICT c FROM market_review.custody WHERE id=p_instance FOR UPDATE;
 owner_before:=c.owner;
 PERFORM 1 FROM market_review.policy WHERE id=p_instance FOR UPDATE;
 -- Serialize this small fixture's accounts to prove mirrors and replay; not scalable.
 PERFORM 1 FROM market_review.wallet ORDER BY id FOR UPDATE;
 PERFORM 1 FROM market_review.mirror_online ORDER BY account_id FOR UPDATE;
 PERFORM 1 FROM market_review.mirror_character_wallet ORDER BY character_id FOR UPDATE;
 args:=jsonb_build_array(p_op,p_instance,p_copy_revision,p_actor_revision,p_owner_revision,p_offer,p_price,p_now,p_recipient);
 SELECT * INTO rec FROM market_review.mirror_receipt WHERE actor=p_actor AND request_id=p_request;
 IF FOUND THEN
  IF rec.args<>args THEN RAISE EXCEPTION 'mirror_request_conflict'; END IF;
  RETURN rec.response;
 END IF;
 SELECT * INTO STRICT a FROM market_review.mirror_online WHERE account_id=p_actor;
 IF a.revision IS DISTINCT FROM p_actor_revision OR
  (SELECT revision FROM market_review.mirror_online WHERE account_id=owner_before) IS DISTINCT FROM p_owner_revision
 THEN RAISE EXCEPTION 'mirror_stale_state'; END IF;
 FOR row_account IN SELECT * FROM market_review.mirror_online LOOP
  SELECT gold INTO STRICT gold_now FROM market_review.wallet WHERE id=row_account.account_id;
  IF row_account.state IS DISTINCT FROM market_review.mirror_projection(row_account.account_id,row_account.character_id)
   OR (SELECT gold FROM market_review.mirror_character_wallet WHERE character_id=row_account.character_id) IS DISTINCT FROM gold_now
  THEN RAISE EXCEPTION 'mirror_diverged'; END IF;
 END LOOP;
 result:=market_review.act(p_op,p_actor,p_request,p_instance,p_copy_revision,p_offer,p_price,p_now,p_recipient);
 -- Fault injection after normalized wallet/custody/history mutation. Exception
 -- must roll back *all* legs, including request receipt and any fees.
 IF p_abort THEN RAISE EXCEPTION 'injected_after_settlement'; END IF;
 FOR row_account IN SELECT * FROM market_review.mirror_online WHERE account_id IN (p_actor,owner_before) LOOP
  SELECT gold INTO STRICT gold_now FROM market_review.wallet WHERE id=row_account.account_id;
  UPDATE market_review.mirror_character_wallet SET gold=gold_now WHERE character_id=row_account.character_id;
  UPDATE market_review.mirror_online
   SET state=market_review.mirror_projection(row_account.account_id,row_account.character_id),revision=revision+1
   WHERE account_id=row_account.account_id AND revision=row_account.revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'mirror_cas_failed'; END IF;
 END LOOP;
 INSERT INTO market_review.mirror_receipt VALUES(p_actor,p_request,args,result);
 RETURN result;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA market_review FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA market_review FROM PUBLIC;
SELECT market_review.mirror_act('list','a','mirror-list','x',0,0,0,'mirror-offer',125,100);
SELECT market_review.expect_error($q$SELECT market_review.mirror_act('buy','b','mirror-buy','x',1,0,0,'mirror-offer',125,101,'b1')$q$,'mirror_stale_state');
SELECT market_review.expect_error($q$SELECT market_review.mirror_act('buy','b','mirror-buy','x',1,0,1,'mirror-offer',125,101,'b1',true)$q$,'injected_after_settlement');
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.sale)<>0 OR EXISTS(SELECT 1 FROM market_review.request WHERE request_id='mirror-buy')
 OR (SELECT gold FROM market_review.wallet WHERE id='b')<>1000
 OR NOT EXISTS(SELECT 1 FROM market_review.custody WHERE id='x' AND owner='a' AND state='escrow' AND revision=1)
 OR (SELECT revision FROM market_review.mirror_online WHERE account_id='b')<>0
 THEN RAISE EXCEPTION 'fault_rollback_failed'; END IF;
END $$;
SELECT market_review.mirror_act('buy','b','mirror-buy','x',1,0,1,'mirror-offer',125,101,'b1');
-- Replaying after revision changes returns the same committed receipt.
SELECT market_review.mirror_act('buy','b','mirror-buy','x',1,0,1,'mirror-offer',125,101,'b1');
SELECT market_review.expect_error($q$SELECT market_review.mirror_act('buy','b','mirror-buy','x',1,0,1,'mirror-offer',126,101,'b1')$q$,'mirror_request_conflict');
UPDATE market_review.wallet SET inventory_cap=0 WHERE id='b';
SELECT market_review.expect_error($q$SELECT market_review.mirror_act('claim','b','mirror-claim','x',2,1,1,p_recipient=>'b1')$q$,'inventory_full');
UPDATE market_review.wallet SET inventory_cap=2 WHERE id='b';
SELECT market_review.mirror_act('claim','b','mirror-claim','x',2,1,1,p_recipient=>'b1');
SELECT market_review.mirror_act('deposit','b','mirror-deposit','x',3,2,2);
SELECT market_review.mirror_act('withdraw','b','mirror-withdraw','x',4,3,3,p_recipient=>'b2');
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.sale)<>1 OR (SELECT sum(fee) FROM market_review.sale)<>7
 OR (SELECT gold FROM market_review.mirror_character_wallet WHERE character_id='b2')<>77
 OR (SELECT gold FROM market_review.mirror_character_wallet WHERE character_id='b1')<>875
 OR (SELECT gold FROM market_review.mirror_character_wallet WHERE character_id='a1')<>1118
 OR EXISTS(SELECT 1 FROM market_review.mirror_online m WHERE m.state IS DISTINCT FROM market_review.mirror_projection(m.account_id,m.character_id))
 OR NOT EXISTS(SELECT 1 FROM market_review.custody WHERE id='x' AND owner='b' AND holder='b2' AND state='inventory' AND revision=5)
 OR (SELECT revision FROM market_review.mirror_online WHERE account_id='b')<>4
 THEN RAISE EXCEPTION 'mirror_settlement_failed'; END IF;
END $$;
ROLLBACK;

-- Independent original issuance registration rehearsal, in a fresh rollback.
-- Source rows stand in for an independently persisted Forge claim; they are
-- synthetic fixtures, NOT authority or a canonical digest implementation.
BEGIN;
\ir 07_original_registration_schema.sql
INSERT INTO market_review.original_forge_claim VALUES
 ('forge-original-1','forge-job-1','new-eq2-copy','b','b1','equipment-2.0',repeat('a',64),'{"quality":77,"rarity":"rare"}'),
 ('forge-original-2','forge-job-2','new-eq2-copy-2','b','b1','equipment-2.0',repeat('b',64),'{"quality":50,"rarity":"common"}'),
 ('forge-collision','forge-job-3','x','a','a1','equipment-2.0',repeat('c',64),'{"quality":77,"rarity":"rare"}');
SELECT market_review.expect_error($q$SELECT market_review.register_original_forge('missing','fake','b','b1',repeat('a',64))$q$,'original_claim_mismatch');
SELECT market_review.expect_error($q$SELECT market_review.register_original_forge('forge-original-1','new-eq2-copy','a','a1',repeat('a',64))$q$,'original_claim_mismatch');
SELECT market_review.expect_error($q$SELECT market_review.register_original_forge('forge-original-1','new-eq2-copy','b','b2',repeat('a',64))$q$,'original_claim_mismatch');
SELECT market_review.expect_error($q$SELECT market_review.register_original_forge('forge-original-1','new-eq2-copy','b','b1',repeat('f',64))$q$,'original_claim_mismatch');
SELECT market_review.expect_error($q$SELECT market_review.register_original_forge('forge-original-1','fake','b','b1',repeat('a',64))$q$,'original_claim_mismatch');
SELECT market_review.expect_error($q$SELECT market_review.register_original_forge('forge-collision','x','a','a1',repeat('c',64))$q$,'original_registration_conflict');
SELECT market_review.expect_error($q$SELECT market_review.register_original_forge('forge-original-1','new-eq2-copy','b','b1',repeat('a',64),true)$q$,'injected_after_mint_registration');
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM market_review.mint WHERE id='new-eq2-copy')
 OR EXISTS(SELECT 1 FROM market_review.custody WHERE id='new-eq2-copy')
 OR EXISTS(SELECT 1 FROM market_review.policy WHERE id='new-eq2-copy')
 THEN RAISE EXCEPTION 'original_partial_registration'; END IF;
END $$;
SELECT market_review.register_original_forge('forge-original-1','new-eq2-copy','b','b1',repeat('a',64));
SELECT market_review.register_original_forge('forge-original-1','new-eq2-copy','b','b1',repeat('a',64));
SELECT market_review.expect_error($q$SELECT market_review.act('list','b','mint-list','new-eq2-copy',0,'mint-offer',100,1)$q$,'not_listable');
UPDATE market_review.wallet SET inventory_cap=1 WHERE id='b';
SELECT market_review.expect_error($q$SELECT market_review.register_original_forge('forge-original-2','new-eq2-copy-2','b','b1',repeat('b',64))$q$,'original_inventory_full');
SELECT market_review.act('deposit','b','mint-bank','new-eq2-copy',0);
SELECT market_review.register_original_forge('forge-original-1','new-eq2-copy','b','b1',repeat('a',64));
SELECT market_review.expect_error($q$UPDATE market_review.original_forge_claim SET digest=repeat('d',64) WHERE receipt='forge-original-1'$q$,'immutable_history');
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.mint WHERE receipt='forge-original-1')<>1
 OR NOT EXISTS(SELECT 1 FROM market_review.custody WHERE id='new-eq2-copy' AND owner='b' AND state='bank' AND revision=1)
 OR NOT EXISTS(SELECT 1 FROM market_review.policy WHERE id='new-eq2-copy' AND NOT approved)
 OR EXISTS(SELECT 1 FROM market_review.mint WHERE id='new-eq2-copy-2')
 OR (SELECT sum(gold) FROM market_review.wallet)<>3000
 OR EXISTS(SELECT 1 FROM market_review.sale)
 THEN RAISE EXCEPTION 'original_registration_invariant'; END IF;
END $$;
ROLLBACK;
