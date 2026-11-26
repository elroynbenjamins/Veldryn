-- DISPOSABLE review regression. All state is fictional.
DO $$ BEGIN
 IF current_database()<>'eq2_market_review' OR current_user<>'eq2_market_review'
 OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_only'; END IF;
END $$;
CREATE FUNCTION market_review.expect_error(q text, expected text) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 BEGIN EXECUTE q;
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM=expected THEN RETURN; END IF;
   RAISE;
 END;
 RAISE EXCEPTION 'expected_rejection_missing: %',expected;
END $$;
REVOKE ALL ON FUNCTION market_review.expect_error(text,text) FROM PUBLIC;
BEGIN;
SELECT market_review.act('deposit','a','d1','x',0);
SELECT market_review.expect_error($q$SELECT market_review.act('deposit','a','d2','y',0)$q$,'bank_full');
SELECT market_review.expect_error($q$SELECT market_review.act('withdraw','b','wrong','x',1,p_recipient=>'b1')$q$,'wrong_custody');
SELECT market_review.expect_error($q$SELECT market_review.act('withdraw','a','foreign','x',1,p_recipient=>'b1')$q$,'recipient_ineligible');
SELECT market_review.act('withdraw','a','w1','x',1,p_recipient=>'a1');
SELECT market_review.act('list','a','l1','x',2,'offer1',125,100);
SELECT market_review.act('list','a','l1','x',2,'offer1',125,100);
SELECT market_review.expect_error($q$SELECT market_review.act('list','a','l1','x',2,'offer1',126,100)$q$,'request_conflict');
SELECT market_review.expect_error($q$SELECT market_review.act('buy','b','invalid','x',3,'offer1',125,101,'b_low')$q$,'not_buyable');
SELECT market_review.expect_error($q$SELECT market_review.act('buy','a','self','x',3,'offer1',125,101,'a1')$q$,'not_buyable');
SELECT market_review.expect_error($q$SELECT market_review.act('buy','b','expired','x',3,'offer1',125,604900,'b1')$q$,'not_buyable');
SELECT market_review.act('buy','b','buy1','x',3,'offer1',125,101,'b1');
SELECT market_review.act('buy','b','buy1','x',3,'offer1',125,101,'b1');
UPDATE market_review.policy SET approved=false WHERE id='x';
UPDATE market_review.wallet SET inventory_cap=0 WHERE id='b';
SELECT market_review.expect_error($q$SELECT market_review.act('claim','b','full','x',4,p_recipient=>'b1')$q$,'inventory_full');
SELECT market_review.expect_error($q$SELECT market_review.act('claim','b','low','x',4,p_recipient=>'b_low')$q$,'recipient_ineligible');
UPDATE market_review.wallet SET inventory_cap=2 WHERE id='b';
SELECT market_review.act('claim','b','claim1','x',4,p_recipient=>'b1');
SELECT market_review.act('deposit','b','d3','x',5);
SELECT market_review.act('withdraw','b','w3','x',6,p_recipient=>'b2');
SELECT market_review.expect_error($q$SELECT market_review.act('list','b','revoked','x',7,'offer2',200,102)$q$,'not_listable');
UPDATE market_review.policy SET approved=true WHERE id='x';
SELECT market_review.act('list','b','l2','x',7,'offer2',200,102);
SELECT market_review.act('buy','c','buy2','x',8,'offer2',200,103,'c1');
SELECT market_review.act('claim','c','claim2','x',9,p_recipient=>'c1');
SELECT market_review.act('list','c','l3','x',10,'offer3',200,104);
UPDATE market_review.policy SET approved=false WHERE id='x';
SELECT market_review.expect_error($q$SELECT market_review.act('expire','a','early','x',11,'offer3',p_now=>105,p_worker=>true)$q$,'not_recoverable');
SELECT market_review.act('expire','a','expire3','x',11,'offer3',p_now=>604904,p_worker=>true);
SELECT market_review.act('return','c','return3','x',12,p_recipient=>'c1');
SELECT market_review.expect_error($q$UPDATE market_review.mint SET snapshot='{}' WHERE id='x'$q$,'immutable_history');
SELECT market_review.expect_error($q$DELETE FROM market_review.sale WHERE instance='x' AND ordinal=2$q$,'immutable_history');
DO $$ BEGIN
 IF (SELECT sum(gold) FROM market_review.wallet)+(SELECT sum(fee) FROM market_review.sale)<>3000
 OR (SELECT sum(fee) FROM market_review.sale)<>17
 OR (SELECT count(*) FROM market_review.sale)<>2
 OR NOT EXISTS(SELECT 1 FROM market_review.custody WHERE id='x' AND owner='c' AND state='inventory' AND holder='c1' AND revision=13)
 OR NOT EXISTS(SELECT 1 FROM market_review.mint WHERE id='x' AND original_owner='a' AND snapshot->>'quality'='77')
 OR NOT EXISTS(SELECT 1 FROM market_review.sale WHERE instance='x' AND ordinal=2 AND parent=1 AND seller='b' AND buyer='c')
 THEN RAISE EXCEPTION 'conservation_or_lineage_failed'; END IF;
END $$;
ROLLBACK;
-- Fresh fixture retained for multi-session test.
