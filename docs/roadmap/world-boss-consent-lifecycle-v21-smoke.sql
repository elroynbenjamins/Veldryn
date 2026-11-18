-- V21 disposable PostgreSQL consent lifecycle smoke, NEVER a migration.
-- Runs after V17/V18 fixture and V20/V21 draft SQL in isolated PG16.
-- All event/consent/attempt writes are ROLLED BACK.
BEGIN;
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
VALUES('30000000-0000-4000-8000-000000000021','sunscar','active',
 clock_timestamp()-interval '1 hour',clock_timestamp()+interval '6 days',
 'wb21-review-only',1000,650);

DO $test$
DECLARE
 e uuid:='30000000-0000-4000-8000-000000000021';
 owner uuid:='10000000-0000-4000-8000-000000000002';
 ch uuid:='20000000-0000-4000-8000-000000000002';
 initiator uuid:='10000000-0000-4000-8000-000000000001';
 initiator_ch uuid:='20000000-0000-4000-8000-000000000001';
 receipt jsonb;
 packet jsonb;
 blocked boolean;
BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class
  WHERE oid='private.world_boss_consent_commands_v21'::regclass)
 THEN RAISE EXCEPTION 'WB21_CONSENT_LEDGER_RLS_OFF'; END IF;
 IF has_table_privilege('anon','private.world_boss_consent_commands_v21','SELECT') OR
    has_table_privilege('authenticated','private.world_boss_echo_consents_v20','UPDATE') OR
    has_function_privilege('authenticated',
     'private.world_boss_v21_set_consent(uuid,uuid,uuid,boolean,bigint,text)',
     'EXECUTE')
 THEN RAISE EXCEPTION 'WB21_PUBLIC_CONSENT_ACCESS'; END IF;

 receipt:=private.world_boss_v21_set_consent(
  e,owner,ch,true,0,'WB21_PUBLISH_001');
 IF receipt->>'enabled'<>'true' OR
    (receipt->>'consentRevision')::integer<>1 OR
    receipt->>'repeated'<>'false'
 THEN RAISE EXCEPTION 'WB21_PUBLISH_INVALID'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM private.world_boss_echo_consents_v20
  WHERE event_id=e AND owner_account_id=owner AND character_id=ch
   AND enabled AND consent_revision=1
   AND expires_at>clock_timestamp() AND expires_at<=(
    SELECT ends_at FROM private.world_boss_events_v17 WHERE id=e)
 ) THEN RAISE EXCEPTION 'WB21_GRANT_NOT_WINDOW_BOUND'; END IF;

 receipt:=private.world_boss_v21_set_consent(
  e,owner,ch,true,0,'WB21_PUBLISH_001');
 IF receipt->>'repeated'<>'true' OR
    (receipt->>'consentRevision')::integer<>1
 THEN RAISE EXCEPTION 'WB21_DUPLICATE_KEY_NOT_REPLAYED'; END IF;
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v21_set_consent(
   e,owner,ch,false,0,'WB21_PUBLISH_001');
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB21_REQUEST_REUSED%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB21_REUSED_KEY_CHANGED_INTENT'; END IF;

 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v21_set_consent(
   e,owner,ch,true,0,'WB21_STALE_REV_02');
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB21_STALE_CONSENT_REVISION%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB21_STALE_REVISION_ACCEPTED'; END IF;
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v21_set_consent(
   e,'10000000-0000-4000-8000-000000000003',ch,true,0,
   'WB21_WRONG_OWNER');
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB21_CHARACTER_NOT_OWNED%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB21_WRONG_CHARACTER_OWNER'; END IF;

 -- The V20 reservation can use this grant only before owner revocation.
 packet:=jsonb_build_object(
  'schema','world-boss-v20-serialized-v9',
  'eventId',e::text,'accountId',initiator::text,
  'warCamp',jsonb_build_object('digest',repeat('d',64)),
  'encounterProfiles',jsonb_build_object(
   'armored',jsonb_build_object('digest',repeat('a',64)),
   'exposed',jsonb_build_object('digest',repeat('b',64)),
   'enraged',jsonb_build_object('digest',repeat('c',64))),
  'realEchoConsents',jsonb_build_array(jsonb_build_object(
   'eventId',e::text,'ownerAccountId',owner::text,
   'characterId',ch::text,'consentRevision',1)),
  'serializedPrepared',repeat('X',180));
 receipt:=private.world_boss_v20_reserve(
  e,initiator,initiator_ch,'WB21_BATTLE_001','hold_line',
  repeat('S',32),repeat('a',64),packet,
  'wb21-engine-review','WB21_PRIVATE_WORKER',repeat('d',64),NULL);
 IF receipt->>'repeated'<>'false'
 THEN RAISE EXCEPTION 'WB21_AUTHORIZED_ECHO_NOT_RESERVED'; END IF;

 receipt:=private.world_boss_v21_set_consent(
  e,owner,ch,false,1,'WB21_REVOKE_002');
 IF receipt->>'enabled'<>'false' OR
   (receipt->>'consentRevision')::integer<>2
 THEN RAISE EXCEPTION 'WB21_REVOCATION_FAILED'; END IF;

 -- Lost-ACK of an already-frozen attempt survives revocation.
 receipt:=private.world_boss_v20_reserve(
  e,initiator,initiator_ch,'WB21_BATTLE_001','hold_line',
  repeat('Z',32),repeat('f',64),packet,
  'wb21-engine-review','WB21_PRIVATE_WORKER',repeat('d',64),NULL);
 IF receipt->>'repeated'<>'true'
 THEN RAISE EXCEPTION 'WB21_EXISTING_BATTLE_RETRIED_AS_NEW'; END IF;

 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v20_reserve(
   e,initiator,initiator_ch,'WB21_NEW_AFTER_REV','hold_line',
   repeat('S',32),repeat('a',64),packet,
   'wb21-engine-review','WB21_PRIVATE_WORKER',repeat('d',64),NULL);
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB20_ECHO_CONSENT_REVOKED_OR_UNOWNED%';
 END;
 IF NOT blocked OR (SELECT count(*) FROM private.world_boss_attempts_v17
  WHERE event_id=e AND account_id=initiator)<>1
 THEN RAISE EXCEPTION 'WB21_REVOCATION_DID_NOT_FENCE_NEW_BORROW'; END IF;

 receipt:=private.world_boss_v21_set_consent(
  e,owner,ch,true,2,'WB21_RENEW_003');
 IF (receipt->>'consentRevision')::integer<>3
 THEN RAISE EXCEPTION 'WB21_RENEWAL_NOT_MONOTONIC'; END IF;
 UPDATE private.world_boss_events_v17 SET status='closed' WHERE id=e;
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v21_set_consent(
   e,owner,ch,true,3,'WB21_AFTER_CLOSE');
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB21_EVENT_NOT_OPEN_FOR_SHARING%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB21_PUBLISH_AFTER_CLOSE'; END IF;
 receipt:=private.world_boss_v21_set_consent(
  e,owner,ch,false,3,'WB21_CLOSE_REVOKE');
 IF (receipt->>'consentRevision')::integer<>4
 THEN RAISE EXCEPTION 'WB21_CLOSED_EVENT_REVOCATION_DENIED'; END IF;
 receipt:=private.world_boss_v21_set_consent(
  e,owner,ch,true,2,'WB21_RENEW_003');
 IF receipt->>'repeated'<>'true' OR
   (receipt->>'consentRevision')::integer<>3 OR
   (SELECT enabled FROM private.world_boss_echo_consents_v20
    WHERE event_id=e AND owner_account_id=owner)
 THEN RAISE EXCEPTION 'WB21_OLD_ACK_REENABLED_ECHO'; END IF;
 RAISE NOTICE 'WORLD_BOSS_V21_PRIVATE_CONSENT_LIFECYCLE_PASSED';
END
$test$;
ROLLBACK;
