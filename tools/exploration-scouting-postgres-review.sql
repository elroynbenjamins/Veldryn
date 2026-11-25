-- Disposable PostgreSQL QA only. Never install as a production migration.
DO $$ BEGIN IF current_database()<>'scouting_review_ci' THEN RAISE EXCEPTION 'wrong database'; END IF; END $$;
CREATE SCHEMA scouting_qa;
REVOKE ALL ON SCHEMA scouting_qa FROM PUBLIC;
CREATE TABLE scouting_qa.account(id text PRIMARY KEY,xp bigint NOT NULL CHECK(xp>=0),slots integer NOT NULL CHECK(slots BETWEEN 1 AND 5),migrated boolean NOT NULL DEFAULT false,essence bigint NOT NULL DEFAULT 0 CHECK(essence>=0));
CREATE TABLE scouting_qa.character(account_id text NOT NULL REFERENCES scouting_qa.account(id),id text NOT NULL,legacy_xp bigint NOT NULL CHECK(legacy_xp>=0),gold bigint NOT NULL CHECK(gold>=0),retained_regions text[] NOT NULL DEFAULT '{}',PRIMARY KEY(account_id,id));
CREATE TABLE scouting_qa.discovery(account_id text NOT NULL REFERENCES scouting_qa.account(id),route_id text NOT NULL,PRIMARY KEY(account_id,route_id));
CREATE TABLE scouting_qa.character_discovery(account_id text NOT NULL,character_id text NOT NULL,route_id text NOT NULL,PRIMARY KEY(account_id,character_id,route_id),FOREIGN KEY(account_id,character_id) REFERENCES scouting_qa.character(account_id,id));
CREATE TABLE scouting_qa.resource(account_id text NOT NULL,character_id text NOT NULL,item_id text NOT NULL,qty bigint NOT NULL CHECK(qty>=0),PRIMARY KEY(account_id,character_id,item_id),FOREIGN KEY(account_id,character_id) REFERENCES scouting_qa.character(account_id,id));
CREATE TABLE scouting_qa.companion(account_id text NOT NULL REFERENCES scouting_qa.account(id),id text NOT NULL,blocked boolean NOT NULL DEFAULT false,PRIMARY KEY(account_id,id));
CREATE TABLE scouting_qa.receipt(account_id text NOT NULL,nonce text NOT NULL,character_id text NOT NULL,kind text NOT NULL CHECK(kind IN ('training','camp')),route_id text,companion_ids text[] NOT NULL,ends_at bigint NOT NULL CHECK(ends_at>=0),xp bigint NOT NULL CHECK(xp>=0),gold_cost bigint NOT NULL CHECK(gold_cost>=0),gold_reward bigint NOT NULL CHECK(gold_reward>=0),essence_reward bigint NOT NULL CHECK(essence_reward>=0),food_cost bigint NOT NULL CHECK(food_cost>=0),claimed boolean NOT NULL DEFAULT false,awarded_xp bigint,PRIMARY KEY(account_id,nonce),FOREIGN KEY(account_id,character_id) REFERENCES scouting_qa.character(account_id,id),CHECK((claimed AND awarded_xp IS NOT NULL AND awarded_xp>=0) OR (NOT claimed AND awarded_xp IS NULL)));
CREATE UNIQUE INDEX one_xp_slot ON scouting_qa.receipt(account_id) WHERE NOT claimed AND (kind='training' OR xp>0);
ALTER TABLE scouting_qa.account ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_qa.character ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_qa.discovery ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_qa.character_discovery ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_qa.resource ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_qa.companion ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_qa.receipt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA scouting_qa FROM PUBLIC;
-- Trusted fixture imports old character data; the account row serializes cutover.
CREATE FUNCTION scouting_qa.migrate(p_account text) RETURNS bigint LANGUAGE plpgsql SET search_path=pg_catalog,scouting_qa AS $$
DECLARE a scouting_qa.account%ROWTYPE; total bigint;
BEGIN
 SELECT * INTO STRICT a FROM scouting_qa.account WHERE id=p_account FOR UPDATE;
 IF a.migrated THEN RETURN a.xp; END IF;
 SELECT coalesce(sum(legacy_xp),0) INTO total FROM scouting_qa.character WHERE account_id=p_account;
 INSERT INTO scouting_qa.discovery SELECT DISTINCT account_id,route_id FROM scouting_qa.character_discovery WHERE account_id=p_account ON CONFLICT DO NOTHING;
 UPDATE scouting_qa.account SET xp=total,migrated=true WHERE id=p_account;
 RETURN total;
END $$;
-- Quote arguments are trusted engine output, NOT public RPC input. This
-- harness verifies persistence/custody, not catalogue or food selection policy.
CREATE FUNCTION scouting_qa.reserve(p_account text,p_char text,p_nonce text,p_kind text,p_route text,p_ids text[],p_now bigint,p_end bigint,p_xp bigint,p_cost bigint,p_gold bigint,p_essence bigint,p_food bigint,p_capacity integer) RETURNS text LANGUAGE plpgsql SET search_path=pg_catalog,scouting_qa AS $$
DECLARE a scouting_qa.account%ROWTYPE; r scouting_qa.receipt%ROWTYPE; n integer;
BEGIN
 SELECT * INTO STRICT a FROM scouting_qa.account WHERE id=p_account FOR UPDATE;
 IF NOT a.migrated OR NOT EXISTS(SELECT 1 FROM scouting_qa.character WHERE account_id=p_account AND id=p_char) THEN RAISE EXCEPTION 'owner_or_migration'; END IF;
 IF p_nonce IS NULL OR p_nonce !~ '^[A-Za-z0-9_-]{8,128}$' OR p_kind IS NULL OR p_kind NOT IN ('training','camp') OR p_ids IS NULL OR cardinality(p_ids)>3 OR array_position(p_ids,NULL) IS NOT NULL OR p_now IS NULL OR p_end IS NULL OR p_now<0 OR p_end<=p_now OR p_xp IS NULL OR p_xp<0 OR p_cost IS NULL OR p_cost<0 OR p_gold IS NULL OR p_gold<0 OR p_essence IS NULL OR p_essence<0 OR p_food IS NULL OR p_food<0 OR p_capacity IS NULL OR p_capacity NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'invalid_quote'; END IF;
 SELECT * INTO r FROM scouting_qa.receipt WHERE account_id=p_account AND nonce=p_nonce;
 IF FOUND THEN
  IF (r.character_id,r.kind,r.route_id,r.companion_ids,r.xp,r.gold_cost,r.gold_reward,r.essence_reward,r.food_cost) IS DISTINCT FROM (p_char,p_kind,p_route,p_ids,p_xp,p_cost,p_gold,p_essence,p_food) THEN RAISE EXCEPTION 'nonce_conflict'; END IF;
  RETURN p_nonce;
 END IF;
 IF (p_kind='training' OR p_xp>0) AND EXISTS(SELECT 1 FROM scouting_qa.receipt WHERE account_id=p_account AND NOT claimed AND (kind='training' OR xp>0)) THEN RAISE EXCEPTION 'xp_slot_busy'; END IF;
 IF p_kind='camp' AND (cardinality(p_ids)=0 OR (SELECT count(*) FROM scouting_qa.receipt WHERE account_id=p_account AND kind='camp' AND NOT claimed AND ends_at>p_now)>=p_capacity) THEN RAISE EXCEPTION 'camp_full'; END IF;
 SELECT count(*) INTO n FROM scouting_qa.companion WHERE account_id=p_account AND id=ANY(p_ids) AND NOT blocked;
 IF n<>cardinality(p_ids) OR EXISTS(SELECT 1 FROM scouting_qa.receipt WHERE account_id=p_account AND NOT claimed AND ends_at>p_now AND companion_ids&&p_ids) THEN RAISE EXCEPTION 'companion_unavailable'; END IF;
 UPDATE scouting_qa.character SET gold=gold-p_cost WHERE account_id=p_account AND id=p_char AND gold>=p_cost;
 IF NOT FOUND THEN RAISE EXCEPTION 'missing_gold'; END IF;
 IF p_food>0 THEN
  UPDATE scouting_qa.resource SET qty=qty-p_food WHERE account_id=p_account AND character_id=p_char AND item_id='TRAVEL_RATION' AND qty>=p_food;
  IF NOT FOUND THEN RAISE EXCEPTION 'missing_food'; END IF;
 END IF;
 INSERT INTO scouting_qa.receipt(account_id,nonce,character_id,kind,route_id,companion_ids,ends_at,xp,gold_cost,gold_reward,essence_reward,food_cost) VALUES(p_account,p_nonce,p_char,p_kind,p_route,p_ids,p_end,p_xp,p_cost,p_gold,p_essence,p_food);
 RETURN p_nonce;
END $$;
CREATE FUNCTION scouting_qa.claim(p_account text,p_char text,p_nonce text,p_now bigint) RETURNS bigint LANGUAGE plpgsql SET search_path=pg_catalog,scouting_qa AS $$
DECLARE r scouting_qa.receipt%ROWTYPE; awarded bigint; inserted integer;
BEGIN
 PERFORM 1 FROM scouting_qa.account WHERE id=p_account FOR UPDATE;
 SELECT * INTO STRICT r FROM scouting_qa.receipt WHERE account_id=p_account AND nonce=p_nonce;
 IF r.character_id<>p_char OR p_char IS NULL THEN RAISE EXCEPTION 'owner_mismatch'; END IF;
 IF r.claimed THEN RETURN r.awarded_xp; END IF;
 IF p_now IS NULL OR p_now<r.ends_at THEN RAISE EXCEPTION 'not_ready'; END IF;
 awarded:=r.xp;
 IF r.route_id IS NOT NULL THEN
  INSERT INTO scouting_qa.character_discovery VALUES(p_account,p_char,r.route_id) ON CONFLICT DO NOTHING;
  INSERT INTO scouting_qa.discovery VALUES(p_account,r.route_id) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted=ROW_COUNT;
  IF inserted=0 THEN awarded:=0; END IF;
 END IF;
 UPDATE scouting_qa.account SET xp=xp+awarded,essence=essence+r.essence_reward WHERE id=p_account;
 UPDATE scouting_qa.character SET gold=gold+r.gold_reward WHERE account_id=p_account AND id=p_char;
 UPDATE scouting_qa.receipt SET claimed=true,awarded_xp=awarded WHERE account_id=p_account AND nonce=p_nonce;
 RETURN awarded;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA scouting_qa FROM PUBLIC;
