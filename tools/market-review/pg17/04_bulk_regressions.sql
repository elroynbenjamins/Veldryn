-- Synthetic bulk rollback; follows 00,01,03 and precedes races.
DO $$ BEGIN
 IF current_database()<>'eq2_market_review' OR current_user<>'eq2_market_review'
 OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_only'; END IF;
END $$;
BEGIN;
SELECT market_review.resource_act('list','a','rl1','bulk1',0,'ore',100,2,100);
SELECT market_review.expect_error($q$SELECT market_review.resource_act('buy','a','self-r','bulk1',0,p_quantity=>20,p_price=>2,p_now=>101)$q$,'resource_not_buyable');
SELECT market_review.expect_error($q$SELECT market_review.resource_act('buy','b','tiny-r','bulk1',0,p_quantity=>9,p_price=>2,p_now=>101)$q$,'resource_not_buyable');
SELECT market_review.expect_error($q$SELECT market_review.resource_act('buy','b','stranded','bulk1',0,p_quantity=>95,p_price=>2,p_now=>101)$q$,'stranded_remainder');
SELECT market_review.resource_act('buy','b','rb1','bulk1',0,p_quantity=>20,p_price=>2,p_now=>101);
SELECT market_review.resource_act('buy','b','rb1','bulk1',0,p_quantity=>20,p_price=>2,p_now=>101);
SELECT market_review.expect_error($q$SELECT market_review.resource_act('buy','b','rb1','bulk1',0,p_quantity=>21,p_price=>2,p_now=>101)$q$,'request_conflict');
SELECT market_review.expect_error($q$SELECT market_review.resource_act('buy','c','stale-r','bulk1',0,p_quantity=>20,p_price=>2,p_now=>101)$q$,'stale_resource_revision');
SELECT market_review.resource_act('buy','c','rb2','bulk1',1,p_quantity=>30,p_price=>2,p_now=>102);
SELECT market_review.resource_act('cancel','a','rc1','bulk1',2);
SELECT market_review.resource_act('list','a','rl2','bulk2',0,'ore',100,2,100);
SELECT market_review.resource_act('buy','b','rb3','bulk2',0,p_quantity=>100,p_price=>2,p_now=>101);
SELECT market_review.resource_act('list','a','rl3','bulk3',0,'ore',100,2,100);
SELECT market_review.resource_act('buy','b','rb4','bulk3',0,p_quantity=>30,p_price=>2,p_now=>101);
UPDATE market_review.resource_policy SET approved=false WHERE item='ore';
SELECT market_review.expect_error($q$SELECT market_review.resource_act('buy','c','revoked-r','bulk3',1,p_quantity=>20,p_price=>2,p_now=>101)$q$,'resource_not_buyable');
SELECT market_review.resource_act('expire','c','re3','bulk3',1,p_now=>604900,p_worker=>true);
SELECT market_review.resource_act('expire','c','re3','bulk3',1,p_now=>604900,p_worker=>true);
DO $$ BEGIN
 IF (SELECT sum(quantity) FROM market_review.resource_stock)+(SELECT sum(remaining) FROM market_review.resource_offer)+(SELECT sum(quantity) FROM market_review.resource_delivery)<>1000
 OR (SELECT sum(quantity) FROM market_review.resource_delivery WHERE kind='purchase')<>180
 OR (SELECT sum(quantity) FROM market_review.resource_delivery WHERE kind='return')<>120
 OR (SELECT sum(gold) FROM market_review.wallet)+(SELECT sum(fee) FROM market_review.resource_delivery)<>3000
 OR (SELECT sum(fee) FROM market_review.resource_delivery)<>18
 OR NOT EXISTS(SELECT 1 FROM market_review.resource_offer WHERE id='bulk3' AND expires=604900 AND status='expired')
 THEN RAISE EXCEPTION 'resource_conservation_failed'; END IF;
END $$;
UPDATE market_review.resource_policy SET approved=true WHERE item='ore';
SELECT market_review.act('list','a','eqcap','x',0,'equipment-cap',125,100);
DO $$ BEGIN
 FOR i IN 1..19 LOOP
  PERFORM market_review.resource_act('list','a','cap-'||i,'cap-'||i,0,'ore',10,1,100);
 END LOOP;
END $$;
SELECT market_review.expect_error($q$SELECT market_review.resource_act('list','a','cap20','cap20',0,'ore',10,1,100)$q$,'account_listing_cap');
SELECT market_review.expect_error($q$SELECT market_review.act('list','a','eqcap2','y',0,'equipment-cap2',125,100)$q$,'account_listing_cap');
SELECT market_review.resource_act('cancel','a','freecap','cap-1',0);
SELECT market_review.act('list','a','eqcap2','y',0,'equipment-cap2',125,100);
DO $$ BEGIN
 IF (SELECT count(*) FROM market_review.offer WHERE seller='a' AND status='active')+
 (SELECT count(*) FROM market_review.resource_offer WHERE seller='a' AND status='active')<>20
 OR (SELECT sum(quantity) FROM market_review.resource_stock)+(SELECT sum(remaining) FROM market_review.resource_offer)+(SELECT sum(quantity) FROM market_review.resource_delivery)<>1000
 THEN RAISE EXCEPTION 'shared_cap_or_conservation_failed'; END IF;
END $$;
ROLLBACK;
