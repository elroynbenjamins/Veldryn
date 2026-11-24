-- Disposable CI schema only. No live migration or public RPC.
CREATE SCHEMA weekly_raid_qa;
REVOKE ALL ON SCHEMA weekly_raid_qa FROM PUBLIC;
CREATE TABLE weekly_raid_qa.encounter(
 id text PRIMARY KEY,guild_id text NOT NULL, start_at timestamptz NOT NULL,end_at timestamptz NOT NULL,
 max_hp bigint NOT NULL CHECK(max_hp>0),remaining_hp bigint NOT NULL CHECK(remaining_hp>=0 AND remaining_hp<=max_hp),
 revision bigint NOT NULL DEFAULT 0, CHECK(end_at=start_at+interval '7 days')
);
CREATE TABLE weekly_raid_qa.roster(
 encounter_id text REFERENCES weekly_raid_qa.encounter(id),account_id text,member boolean NOT NULL DEFAULT true,
 PRIMARY KEY(encounter_id,account_id)
);
CREATE TABLE weekly_raid_qa.actor(
 account_id text,character_id text,revision bigint NOT NULL CHECK(revision>0),snapshot jsonb NOT NULL,
 PRIMARY KEY(account_id,character_id)
);
CREATE TABLE weekly_raid_qa.attempt(
 encounter_id text,account_id text,nonce text CHECK(length(nonce) BETWEEN 8 AND 128),character_id text NOT NULL,
 attempt_number integer NOT NULL CHECK(attempt_number BETWEEN 1 AND 3),actor_revision bigint NOT NULL,
 actor_snapshot jsonb NOT NULL,engine_version text NOT NULL,
 started_at timestamptz NOT NULL,resolves_at timestamptz NOT NULL,
 replay jsonb NOT NULL,actual_hp bigint NOT NULL CHECK(actual_hp>=0),score bigint NOT NULL CHECK(score>=0),
 settled_at timestamptz,credited_hp bigint CHECK(credited_hp>=0 AND credited_hp<=actual_hp),
 PRIMARY KEY(encounter_id,account_id,nonce),UNIQUE(encounter_id,account_id,attempt_number),
 FOREIGN KEY(encounter_id,account_id) REFERENCES weekly_raid_qa.roster(encounter_id,account_id),
 CHECK(resolves_at=started_at+interval '180 seconds'),
 CHECK((settled_at IS NULL AND credited_hp IS NULL) OR (settled_at>=resolves_at AND credited_hp IS NOT NULL))
);
CREATE UNIQUE INDEX one_pending ON weekly_raid_qa.attempt(encounter_id,account_id) WHERE settled_at IS NULL;
ALTER TABLE weekly_raid_qa.encounter ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_raid_qa.roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_raid_qa.actor ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_raid_qa.attempt ENABLE ROW LEVEL SECURITY;
-- Trusted synthetic engine result is accepted ONLY by this private test function.
-- Future production adapter must obtain and simulate verified actor in the same
-- transaction or revalidate a signed immutable revision; never accept these from a client.
CREATE FUNCTION weekly_raid_qa.reserve(eid text,aid text,cid text,n text,at_time timestamptz,
 expected_revision bigint,engine_hp bigint,engine_score bigint,engine_replay jsonb)
RETURNS integer LANGUAGE plpgsql SET search_path=pg_catalog,weekly_raid_qa AS $$
DECLARE e encounter%ROWTYPE; a actor%ROWTYPE; old attempt%ROWTYPE; used integer; personal bigint;
BEGIN
 SELECT * INTO STRICT e FROM encounter WHERE id=eid FOR UPDATE;
 PERFORM 1 FROM roster WHERE encounter_id=eid AND account_id=aid AND member FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'MEMBERSHIP'; END IF;
 SELECT * INTO old FROM attempt WHERE encounter_id=eid AND account_id=aid AND nonce=n;
 IF FOUND THEN
  IF old.character_id<>cid THEN RAISE EXCEPTION 'NONCE_CONFLICT'; END IF;
  RETURN old.attempt_number;
 END IF;
 IF at_time<e.start_at OR at_time>=e.end_at OR e.remaining_hp=0 THEN RAISE EXCEPTION 'CLOSED'; END IF;
 IF EXISTS(SELECT 1 FROM attempt WHERE encounter_id=eid AND account_id=aid AND settled_at IS NULL) THEN RAISE EXCEPTION 'PENDING'; END IF;
 SELECT count(*),coalesce(sum(credited_hp),0) INTO used,personal FROM attempt WHERE encounter_id=eid AND account_id=aid;
 IF used>=3 THEN RAISE EXCEPTION 'CAP'; END IF;
 IF personal>=ceil(e.max_hp*.28) THEN RAISE EXCEPTION 'PERSONAL_CAP'; END IF;
 SELECT * INTO a FROM actor WHERE account_id=aid AND character_id=cid FOR SHARE;
 IF NOT FOUND OR a.revision IS DISTINCT FROM expected_revision THEN RAISE EXCEPTION 'ACTOR_REVISION'; END IF;
 INSERT INTO attempt(encounter_id,account_id,nonce,character_id,attempt_number,actor_revision,actor_snapshot,engine_version,started_at,resolves_at,replay,actual_hp,score)
 VALUES(eid,aid,n,cid,used+1,a.revision,a.snapshot,'weekly-shared-review-v1',at_time,at_time+interval '180 seconds',engine_replay,engine_hp,engine_score);
 UPDATE encounter SET revision=revision+1 WHERE id=eid;
 RETURN used+1;
END $$;
CREATE FUNCTION weekly_raid_qa.settle(eid text,at_time timestamptz)
RETURNS integer LANGUAGE plpgsql SET search_path=pg_catalog,weekly_raid_qa AS $$
DECLARE e encounter%ROWTYPE; a attempt%ROWTYPE; personal bigint; credit bigint; done integer:=0;
BEGIN
 SELECT * INTO STRICT e FROM encounter WHERE id=eid FOR UPDATE;
 FOR a IN SELECT * FROM attempt WHERE encounter_id=eid AND settled_at IS NULL AND resolves_at<=at_time ORDER BY resolves_at,account_id,attempt_number FOR UPDATE LOOP
  SELECT coalesce(sum(credited_hp),0) INTO personal FROM attempt WHERE encounter_id=eid AND account_id=a.account_id;
  credit:=greatest(0,least(a.actual_hp,e.remaining_hp,ceil(e.max_hp*.11)::bigint,ceil(e.max_hp*.28)::bigint-personal));
  UPDATE attempt SET credited_hp=credit,settled_at=at_time WHERE encounter_id=eid AND account_id=a.account_id AND nonce=a.nonce;
  e.remaining_hp:=e.remaining_hp-credit;done:=done+1;
 END LOOP;
 UPDATE encounter SET remaining_hp=e.remaining_hp,revision=revision+done WHERE id=eid;
 RETURN done;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA weekly_raid_qa FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA weekly_raid_qa FROM PUBLIC;
