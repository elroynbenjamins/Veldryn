-- WORLD BOSS V23: DISPOSABLE POSITIVE ACCOUNT RAID TRANSACTION FIXTURE.
-- NEVER APPLY TO STAGING OR PRODUCTION. Rollback EVERYTHING.
-- V22 tests separately prove six real UTC 30-minute windows. This file
-- temporarily overrides the pure window predicate WITHIN A ROLLED-BACK
-- TRANSACTION, so full positive private DB reservation can be validated
-- on ANY day/time that CI executes. The real predicate is restored on rollback.
BEGIN;
CREATE OR REPLACE FUNCTION private.world_boss_v22_window_at(
 p_starts_at timestamptz,p_now timestamptz) RETURNS integer
 LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER SET search_path=''
 AS $$ SELECT 0::integer $$;

CREATE TABLE public.online_game_states (
 account_id uuid NOT NULL REFERENCES auth.users(id),
 character_id uuid NOT NULL REFERENCES public.characters(id),
 revision bigint NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 state jsonb NOT NULL,
 PRIMARY KEY(account_id,character_id)
);
INSERT INTO public.characters(id,account_id)
SELECT ('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
 '10000000-0000-4000-8000-000000000001'::uuid
FROM (VALUES (15),(16),(17),(18)) AS t(i);
INSERT INTO public.online_game_states(account_id,character_id,revision,state)
SELECT '10000000-0000-4000-8000-000000000001'::uuid,
 id,2,'{"synthetic":true}'::jsonb
FROM public.characters WHERE account_id='10000000-0000-4000-8000-000000000001'::uuid;

INSERT INTO private.world_boss_events_v17 (
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
SELECT '30000000-0000-4000-8000-000000000024'::uuid,
 'sunscar','active',
 date_trunc('week',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
 (date_trunc('week',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')+interval '7 days',
 'WB23_TEST_ONLY',1000,1000;

DO $test$
DECLARE
 ev uuid:='30000000-0000-4000-8000-000000000024';
 owner uuid:='10000000-0000-4000-8000-000000000001';
 leader uuid:='20000000-0000-4000-8000-000000000001';
 selectors jsonb;
 roster jsonb;
 packet jsonb;
 receipt jsonb;
 blocked boolean;
 n integer;
 active_count integer;
BEGIN
 SELECT jsonb_agg(jsonb_build_object(
  'characterId',id::text,'sourceRevision',2) ORDER BY id)
 INTO selectors FROM public.characters WHERE account_id=owner;
 IF jsonb_array_length(selectors)<>5
 THEN RAISE EXCEPTION 'WB23_FIXTURE_NOT_FIVE_OWNED_CHARACTERS'; END IF;
 roster:=jsonb_build_object(
  'accountId',owner::text,'rosterDigest',repeat('a',64),
  'characters',selectors,'capturedAtUtcMs',1795000000000);
 packet:=jsonb_build_object(
  'schema','world-boss-v23-frozen-account-raid',
  'eventId',ev::text,'accountId',owner::text,
  'requestId','WB23_MULTI_001','order','steady_assault',
  'rulesVersion','WB23_TEST_ONLY','rosterDigest',repeat('a',64),
  'serializedRoster',roster::text,'characters',selectors,
  'warCamp',jsonb_build_object('eventId',ev::text,'digest',repeat('b',64)),
  'encounterProfiles',jsonb_build_object(
   'armored',jsonb_build_object('eventId',ev::text,'boss','sunscar',
    'phase','armored','digest',repeat('c',64)),
   'exposed',jsonb_build_object('eventId',ev::text,'boss','sunscar',
    'phase','exposed','digest',repeat('d',64)),
   'enraged',jsonb_build_object('eventId',ev::text,'boss','sunscar',
    'phase','enraged','digest',repeat('e',64))));

 receipt:=private.world_boss_v23_reserve_account(
  ev,owner,leader,'WB23_MULTI_001','steady_assault',
  repeat('S',32),repeat('a',64),packet,
  'world-boss-account-raid-v22-prototype','WB23_TRUSTED_WORKER',repeat('b',64));
 IF receipt->>'status'<>'reserved' OR receipt->>'ordinal'<>'1' OR
    receipt->>'phase'<>'armored'
 THEN RAISE EXCEPTION 'WB23_FIVE_CHARACTER_FIRST_ATTEMPT_FAILED'; END IF;
 IF (SELECT encounter_profile_digest FROM private.world_boss_attempts_v17
      WHERE event_id=ev AND account_id=owner AND request_id='WB23_MULTI_001')
    IS DISTINCT FROM repeat('c',64)
 THEN RAISE EXCEPTION 'WB23_WRONG_FROZEN_ARMOR_PROFILE'; END IF;

 -- Same account, five characters = ONE attempt. Exact retry is immutable.
 receipt:=private.world_boss_v23_reserve_account(
  ev,owner,leader,'WB23_MULTI_001','steady_assault',
  NULL,NULL,NULL,
  'world-boss-account-raid-v22-prototype','WB23_TRUSTED_WORKER',NULL);
 IF receipt->>'repeated'<>'true' OR receipt->>'ordinal'<>'1'
 THEN RAISE EXCEPTION 'WB23_IDEMPOTENT_MULTI_CHARACTER_RETRY_FAILED'; END IF;

 -- A character changing equipment/state revision before reservation
 -- invalidates the original packet; no extra ordinal is consumed.
 UPDATE public.online_game_states SET revision=3
 WHERE character_id='20000000-0000-4000-8000-000000000018'::uuid;
 packet:=jsonb_set(packet,'{requestId}','"WB23_MULTI_002"'::jsonb);
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v23_reserve_account(
   ev,owner,leader,'WB23_MULTI_002','steady_assault',
   repeat('S',32),repeat('a',64),packet,
   'world-boss-account-raid-v22-prototype','WB23_TRUSTED_WORKER',repeat('b',64));
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB23_CHARACTER_SOURCE_REVISION_CHANGED%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB23_STALE_FIFTH_CHARACTER_ACCEPTED'; END IF;

 UPDATE public.online_game_states SET revision=2
 WHERE character_id='20000000-0000-4000-8000-000000000018'::uuid;
 UPDATE private.world_boss_events_v17 SET remaining_hp=600 WHERE id=ev;
 receipt:=private.world_boss_v23_reserve_account(
  ev,owner,leader,'WB23_MULTI_002','steady_assault',
  repeat('S',32),repeat('a',64),packet,
  'world-boss-account-raid-v22-prototype','WB23_TRUSTED_WORKER',repeat('b',64));
 IF receipt->>'ordinal'<>'2' OR receipt->>'phase'<>'exposed'
 THEN RAISE EXCEPTION 'WB23_PHASE_AT_LOCK_OR_ACCOUNT_ORDINAL_FAILED'; END IF;
 IF (SELECT encounter_profile_digest FROM private.world_boss_attempts_v17
      WHERE event_id=ev AND account_id=owner AND request_id='WB23_MULTI_002')
    IS DISTINCT FROM repeat('d',64)
 THEN RAISE EXCEPTION 'WB23_WRONG_EXPOSED_PROFILE'; END IF;

 UPDATE private.world_boss_events_v17 SET remaining_hp=200 WHERE id=ev;
 packet:=jsonb_set(packet,'{requestId}','"WB23_MULTI_003"'::jsonb);
 receipt:=private.world_boss_v23_reserve_account(
  ev,owner,leader,'WB23_MULTI_003','steady_assault',
  repeat('S',32),repeat('a',64),packet,
  'world-boss-account-raid-v22-prototype','WB23_TRUSTED_WORKER',repeat('b',64));
 IF receipt->>'ordinal'<>'3' OR receipt->>'phase'<>'enraged'
 THEN RAISE EXCEPTION 'WB23_THIRD_ACCOUNT_ATTEMPT_WRONG_PHASE'; END IF;
 IF (SELECT encounter_profile_digest FROM private.world_boss_attempts_v17
      WHERE event_id=ev AND account_id=owner AND request_id='WB23_MULTI_003')
    IS DISTINCT FROM repeat('e',64)
 THEN RAISE EXCEPTION 'WB23_WRONG_ENRAGED_PROFILE'; END IF;

 packet:=jsonb_set(packet,'{requestId}','"WB23_MULTI_004"'::jsonb);
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v23_reserve_account(
   ev,owner,leader,'WB23_MULTI_004','steady_assault',
   repeat('S',32),repeat('a',64),packet,
   'world-boss-account-raid-v22-prototype','WB23_TRUSTED_WORKER',repeat('b',64));
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB18_ACCOUNT_ATTEMPT_LIMIT%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB23_FIVE_CHARACTERS_CREATED_EXTRA_ATTEMPT'; END IF;
 SELECT count(*) INTO active_count FROM private.world_boss_attempts_v17
 WHERE event_id=ev AND account_id=owner AND status='reserved';
 IF active_count<>3
 THEN RAISE EXCEPTION 'WB23_EXPECTED_THREE_ACCOUNT_RECEIPTS'; END IF;
 RAISE NOTICE 'WB23_REAL_SQL_FIVE_CHARACTERS_PHASE_REVISION_THREE_ATTEMPTS_PASSED';
END
$test$;
ROLLBACK;
