-- DISPOSABLE POSTGRES REVIEW ONLY. Not a migration or production adapter.
-- Run on a fresh isolated database. Receipt issuer and ownership are synthetic.
CREATE ROLE completion_review_service NOLOGIN;
CREATE ROLE completion_review_client NOLOGIN;
CREATE SCHEMA completion_review;
REVOKE ALL ON SCHEMA completion_review FROM PUBLIC;
CREATE TABLE completion_review.owner_fixture (
 character_id text PRIMARY KEY, account_id text NOT NULL,
 UNIQUE(account_id, character_id)
);
CREATE TABLE completion_review.terminal_fixture (
 receipt_id text PRIMARY KEY CHECK (receipt_id <> ''),
 account_id text NOT NULL, character_id text NOT NULL,
 boss_id text NOT NULL CHECK (boss_id IN ('FALLEN_KNIGHT','BOSS_002','BOSS_003')),
 level_at_start integer NOT NULL,
 input_digest text NOT NULL CHECK(input_digest ~ '^[0-9a-f]{64}$'),
 event_digest text NOT NULL CHECK(event_digest ~ '^[0-9a-f]{64}$'),
 kind text NOT NULL CHECK(kind='regional_completion'),
 ruleset text NOT NULL CHECK(ruleset='completion-v2-review'),
 reason text NOT NULL CHECK(reason IN ('victory','wipe','timeout')),
 victory boolean NOT NULL, enemy_hp integer NOT NULL, player_hp integer NOT NULL,
 completed_at_ms bigint NOT NULL CHECK(completed_at_ms BETWEEN 1 AND 9007199254740991),
 FOREIGN KEY(account_id,character_id) REFERENCES completion_review.owner_fixture(account_id,character_id),
 UNIQUE(receipt_id,account_id,character_id,boss_id,input_digest,event_digest)
);
CREATE TABLE completion_review.ledger (
 character_id text PRIMARY KEY, account_id text NOT NULL,
 revision bigint NOT NULL DEFAULT 0 CHECK(revision >= 0),
 FOREIGN KEY(account_id,character_id) REFERENCES completion_review.owner_fixture(account_id,character_id)
);
CREATE TABLE completion_review.claim (
 receipt_id text PRIMARY KEY, account_id text NOT NULL, character_id text NOT NULL,
 boss_id text NOT NULL, input_digest text NOT NULL, event_digest text NOT NULL,
 FOREIGN KEY(receipt_id,account_id,character_id,boss_id,input_digest,event_digest)
 REFERENCES completion_review.terminal_fixture(receipt_id,account_id,character_id,boss_id,input_digest,event_digest),
 FOREIGN KEY(character_id) REFERENCES completion_review.ledger(character_id)
);
-- The service may settle but cannot issue/alter terminal evidence or ownership.
REVOKE ALL ON ALL TABLES IN SCHEMA completion_review FROM PUBLIC;
GRANT USAGE ON SCHEMA completion_review TO completion_review_service;
GRANT SELECT ON completion_review.owner_fixture,completion_review.terminal_fixture TO completion_review_service;
-- Row-lock privilege needed on owner_fixture; no application mutation path in this fixture.
-- Lock the ledger instead; FK prevents changing ownership while referenced.
GRANT SELECT,INSERT,UPDATE ON completion_review.ledger TO completion_review_service;
GRANT SELECT,INSERT ON completion_review.claim TO completion_review_service;
CREATE FUNCTION completion_review.settle(p_account text,p_character text,p_receipt text)
RETURNS TABLE(duplicate boolean,revision bigint,sunscar boolean,frostmarch boolean,
 frost_completion_recorded boolean,region4 boolean,grant_enabled boolean,release_enabled boolean)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, completion_review AS $$
DECLARE
 v completion_review.terminal_fixture%ROWTYPE;
 l completion_review.ledger%ROWTYPE;
 old_claim completion_review.claim%ROWTYPE;
 was_complete boolean;
 new_revision bigint;
BEGIN
 IF p_account IS NULL OR p_account='' OR p_character IS NULL OR p_character='' OR p_receipt IS NULL OR p_receipt='' THEN
  RAISE EXCEPTION 'invalid_completion_request';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM completion_review.owner_fixture o WHERE o.character_id=p_character AND o.account_id=p_account) THEN
  RAISE EXCEPTION 'completion_character_not_owned';
 END IF;
 INSERT INTO completion_review.ledger(character_id,account_id) VALUES(p_character,p_account) ON CONFLICT(character_id) DO NOTHING;
 SELECT * INTO STRICT l FROM completion_review.ledger x WHERE x.character_id=p_character FOR UPDATE;
 IF l.account_id<>p_account THEN RAISE EXCEPTION 'completion_character_not_owned'; END IF;
 SELECT * INTO v FROM completion_review.terminal_fixture t WHERE t.receipt_id=p_receipt;
 IF NOT FOUND THEN RAISE EXCEPTION 'completion_receipt_not_found'; END IF;
 IF v.account_id<>p_account OR v.character_id<>p_character OR NOT v.victory OR v.reason<>'victory' OR v.enemy_hp<>0 OR v.player_hp<=0
 OR v.level_at_start < (CASE v.boss_id WHEN 'FALLEN_KNIGHT' THEN 25 WHEN 'BOSS_002' THEN 50 ELSE 75 END) THEN
  RAISE EXCEPTION 'invalid_completion_victory';
 END IF;
 SELECT * INTO old_claim FROM completion_review.claim c WHERE c.receipt_id=p_receipt;
 IF FOUND THEN
  IF (old_claim.account_id,old_claim.character_id,old_claim.boss_id,old_claim.input_digest,old_claim.event_digest)
   IS DISTINCT FROM (v.account_id,v.character_id,v.boss_id,v.input_digest,v.event_digest) THEN
   RAISE EXCEPTION 'completion_receipt_identity_conflict';
  END IF;
  was_complete:=true; new_revision:=l.revision;
 ELSE
  IF v.boss_id IN ('BOSS_002','BOSS_003') AND NOT EXISTS(SELECT 1 FROM completion_review.claim c WHERE c.character_id=p_character AND c.boss_id='FALLEN_KNIGHT') THEN
   RAISE EXCEPTION 'completion_region_locked';
  END IF;
  IF v.boss_id='BOSS_003' AND NOT EXISTS(SELECT 1 FROM completion_review.claim c WHERE c.character_id=p_character AND c.boss_id='BOSS_002') THEN
   RAISE EXCEPTION 'completion_region_locked';
  END IF;
  was_complete:=EXISTS(SELECT 1 FROM completion_review.claim c WHERE c.character_id=p_character AND c.boss_id=v.boss_id);
  INSERT INTO completion_review.claim VALUES(v.receipt_id,v.account_id,v.character_id,v.boss_id,v.input_digest,v.event_digest);
  UPDATE completion_review.ledger x SET revision=x.revision+1 WHERE x.character_id=p_character AND x.revision=l.revision RETURNING x.revision INTO new_revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'completion_revision_conflict'; END IF;
 END IF;
 RETURN QUERY SELECT was_complete,new_revision,
 EXISTS(SELECT 1 FROM completion_review.claim c WHERE c.character_id=p_character AND c.boss_id='FALLEN_KNIGHT'),
 EXISTS(SELECT 1 FROM completion_review.claim c WHERE c.character_id=p_character AND c.boss_id='BOSS_002'),
 EXISTS(SELECT 1 FROM completion_review.claim c WHERE c.character_id=p_character AND c.boss_id='BOSS_003'),false,false,false;
END $$;
REVOKE ALL ON FUNCTION completion_review.settle(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION completion_review.settle(text,text,text) TO completion_review_service;
