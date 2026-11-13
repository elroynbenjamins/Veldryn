-- Disposable PostgreSQL 16 smoke only, NOT a Supabase migration.
-- Runs after V17/V18 fixtures and transaction tests; all rows roll back.
BEGIN;
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
VALUES ('30000000-0000-4000-8000-000000000020','sunscar','active',
 clock_timestamp()-interval '1 hour',clock_timestamp()+interval '6 days',
 'wb20-review-only',100,65);
INSERT INTO private.world_boss_echo_consents_v20(
 event_id,owner_account_id,character_id,consent_revision,enabled,
 granted_at,expires_at)
VALUES (
 '30000000-0000-4000-8000-000000000020',
 '10000000-0000-4000-8000-000000000002',
 '20000000-0000-4000-8000-000000000002',
 1,false,clock_timestamp()-interval '1 minute',
 clock_timestamp()+interval '1 day'
);
DO $test$
DECLARE
 e uuid:='30000000-0000-4000-8000-000000000020';
 a uuid:='10000000-0000-4000-8000-000000000001';
 c uuid:='20000000-0000-4000-8000-000000000001';
 owner uuid:='10000000-0000-4000-8000-000000000002';
 profile jsonb;
 received jsonb;
 blocked boolean;
BEGIN
 profile:=jsonb_build_object(
  'schema','world-boss-v20-serialized-v9',
  'eventId',e::text,'accountId',a::text,
  'warCamp',jsonb_build_object('digest',repeat('d',64)),
  'encounterProfiles',jsonb_build_object(
   'armored',jsonb_build_object('digest',repeat('a',64)),
   'exposed',jsonb_build_object('digest',repeat('b',64)),
   'enraged',jsonb_build_object('digest',repeat('c',64))),
  'realEchoConsents',jsonb_build_array(jsonb_build_object(
   'eventId',e::text,'ownerAccountId',owner::text,
   'characterId','20000000-0000-4000-8000-000000000002',
   'consentRevision',1)),
  'serializedPrepared',repeat('X',180));

 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v20_reserve(
   e,a,c,'WB20_REVOKED_KEY','hold_line',repeat('S',32),repeat('a',64),
   profile,'wb20-engine-review','WB20_WORKER_A',repeat('d',64),NULL);
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB20_ECHO_CONSENT_REVOKED_OR_UNOWNED%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB20_REVOKED_GRANT_WAS_ACCEPTED'; END IF;
 IF EXISTS(SELECT 1 FROM private.world_boss_attempts_v17
  WHERE event_id=e AND account_id=a)
 THEN RAISE EXCEPTION 'WB20_REVOKED_GRANT_CONSUMED_ATTEMPT'; END IF;

 UPDATE private.world_boss_echo_consents_v20
 SET enabled=true WHERE event_id=e AND owner_account_id=owner;
 received:=private.world_boss_v20_reserve(
  e,a,c,'WB20_VALID_KEY','hold_line',repeat('S',32),repeat('a',64),
  profile,'wb20-engine-review','WB20_WORKER_A',repeat('d',64),NULL);
 IF received->>'phase'<>'exposed' OR received->>'repeated'<>'false' THEN
  RAISE EXCEPTION 'WB20_LOCKED_PHASE_NOT_EXPOSED'; END IF;
 IF NOT EXISTS (SELECT 1 FROM private.world_boss_attempts_v17
  WHERE event_id=e AND account_id=a AND request_id='WB20_VALID_KEY'
   AND war_camp_digest=repeat('d',64)
   AND encounter_profile_digest=repeat('b',64))
 THEN RAISE EXCEPTION 'WB20_FROZEN_PHASE_PROFILE_NOT_SELECTED'; END IF;

 -- Revoke after reservation. A same-key lost-ACK must NOT reroll the Echo,
 -- but new requests must fail and leave no extra active slot.
 UPDATE private.world_boss_echo_consents_v20
 SET enabled=false,consent_revision=2
 WHERE event_id=e AND owner_account_id=owner;
 received:=private.world_boss_v20_reserve(
  e,a,c,'WB20_VALID_KEY','hold_line',repeat('Z',32),repeat('f',64),
  profile,'wb20-engine-review','WB20_WORKER_A',repeat('d',64),NULL);
 IF received->>'repeated'<>'true'
 THEN RAISE EXCEPTION 'WB20_FROZEN_RETRY_NOT_REPLAYED'; END IF;
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v20_reserve(
   e,a,c,'WB20_NEW_AFTER_REVOKE','hold_line',repeat('S',32),
   repeat('a',64),profile,'wb20-engine-review','WB20_WORKER_A',
   repeat('d',64),NULL);
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB20_ECHO_CONSENT_REVOKED_OR_UNOWNED%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB20_REVOKED_ECHO_BORROWED_AGAIN'; END IF;

 -- Foreign/mismatched event consent must not be accepted, and no public role
 -- may directly call the private reservation routine.
 IF has_function_privilege('anon',
   'private.world_boss_v20_reserve(uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)',
   'EXECUTE') OR
  has_function_privilege('authenticated',
   'private.world_boss_v20_reserve(uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)',
   'EXECUTE')
 THEN RAISE EXCEPTION 'WB20_PUBLIC_RESERVATION_ACCESS'; END IF;
 IF (SELECT count(*) FROM private.world_boss_attempts_v17
     WHERE event_id=e AND account_id=a)<>1
 THEN RAISE EXCEPTION 'WB20_FAILED_RESERVE_NOT_ATOMIC'; END IF;
 RAISE NOTICE 'WORLD_BOSS_V20_CONSENT_RECHECK_AND_PHASE_ATOMIC_PASSED';
END
$test$;
ROLLBACK;
