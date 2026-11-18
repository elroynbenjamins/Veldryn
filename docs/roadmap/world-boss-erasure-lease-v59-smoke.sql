-- V59 durable privacy lease / replay manifest: disposable PostgreSQL ONLY.
-- Synthetic Auth UUIDs and replay object KEYS; no Storage or Auth Admin call.
-- Every operation is rolled back. Never run against staging/production.
BEGIN;
INSERT INTO auth.users(id) VALUES
 ('10000000-0000-4000-8000-000000000059'),
 ('10000000-0000-4000-8000-000000000060');
INSERT INTO private.world_boss_erasure_fences_v57(account_id) VALUES
 ('10000000-0000-4000-8000-000000000059'),
 ('10000000-0000-4000-8000-000000000060');
INSERT INTO private.world_boss_erasure_jobs_v59(
 account_id,ticket_digest)
VALUES
 ('10000000-0000-4000-8000-000000000059',repeat('a',64)),
 ('10000000-0000-4000-8000-000000000060',repeat('b',64));
INSERT INTO private.world_boss_erasure_objects_v59(account_id,object_key)
VALUES
 ('10000000-0000-4000-8000-000000000059',
  'synthetic/private/replays/owner059'),
 ('10000000-0000-4000-8000-000000000060',
  'synthetic/private/replays/other060');

DO $regression$
DECLARE
 acct uuid:='10000000-0000-4000-8000-000000000059';
 other_account uuid:='10000000-0000-4000-8000-000000000060';
 key text:='synthetic/private/replays/owner059';
 token text:=repeat('a',64);
 gen bigint;
 receipt jsonb;
 blocked boolean;
 reason text;
 first_ack timestamptz;
BEGIN
 IF has_table_privilege('anon',
  'private.world_boss_erasure_jobs_v59','SELECT')
 OR has_table_privilege('authenticated',
  'private.world_boss_erasure_objects_v59','SELECT')
 OR has_table_privilege('service_role',
  'private.world_boss_erasure_jobs_v59','INSERT')
 OR has_function_privilege('anon',
  'private.world_boss_v59_advance(uuid,text,bigint,text,text)','EXECUTE')
 OR has_function_privilege('service_role',
  'private.world_boss_v59_acquire(uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'WB59_PRIVATE_JOBS_OR_LEASE_FUNCTIONS_EXPOSED'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class
  WHERE oid='private.world_boss_erasure_jobs_v59'::regclass)
 OR NOT (SELECT relrowsecurity FROM pg_class
  WHERE oid='private.world_boss_erasure_objects_v59'::regclass)
 THEN RAISE EXCEPTION 'WB59_MISSING_PRIVATE_RLS'; END IF;

 -- Explicit V36 review must recognize exactly the two recovery identities;
 -- the recovery job itself is NOT a gameplay receipt.
 IF (private.world_boss_v36_erasure_preflight(acct)->>'status')
    IS DISTINCT FROM 'no_world_boss_rows'
 THEN RAISE EXCEPTION 'WB59_V36_UNREVIEWED_ERASURE_STATE'; END IF;

 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v59_acquire(acct,repeat('f',64),'WB59_BAD_TICKET');
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB59_PRIVACY_TICKET_NOT_AUTHORIZED%'; END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB59_WRONG_TICKET_ACCEPTED'; END IF;
 receipt:=private.world_boss_v59_acquire(acct,token,'WB59_WORKER_OLD');
 IF receipt->>'kind'<>'acquired' OR
  (receipt->>'generation')::bigint<>1 OR receipt->>'stage'<>'fenced'
 THEN RAISE EXCEPTION 'WB59_FIRST_GENERATION_INVALID: %',receipt; END IF;
 IF (private.world_boss_v59_acquire(acct,token,'WB59_WORKER_OTHER')
     ->>'kind')<>'busy'
 THEN RAISE EXCEPTION 'WB59_DOUBLE_WORKER_LEASE_ALLOWED'; END IF;
 
 -- Simulate a worker crash. The old lease generation must never ACK a
 -- storage deletion or advance any state after the new worker acquires.
 UPDATE private.world_boss_erasure_jobs_v59
 SET lease_expires_at=clock_timestamp()-interval '1 second'
 WHERE account_id=acct;
 receipt:=private.world_boss_v59_acquire(acct,token,'WB59_WORKER_NEW');
 gen:=(receipt->>'generation')::bigint;
 IF receipt->>'kind'<>'acquired' OR gen<>2
 THEN RAISE EXCEPTION 'WB59_EXPIRED_LEASE_NOT_TAKEN_OVER: %',receipt; END IF;
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v59_mark_object_deleted(
   acct,'WB59_WORKER_OLD',1,key);
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB59_STALE_OR_MISSING_WORKER_LEASE%'; END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB59_STALE_WORKER_ACK_ALLOWED'; END IF;

 -- The V56 runtime is disabled. V59 must also refuse an unapproved
 -- retention/purge policy, even in a privileged private session.
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v59_advance(
   acct,'WB59_WORKER_NEW',gen,'fenced','replays_purged');
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB59_PRIVACY_POLICY_UNAPPROVED%'; END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB59_UNAPPROVED_ERASURE_ADVANCED'; END IF;

 -- ONLY in this synthetic rolled-back fixture, simulate policy approval.
 UPDATE private.world_boss_erasure_jobs_v59
 SET policy_review_approved=true WHERE account_id=acct;
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v59_advance(
   acct,'WB59_WORKER_NEW',gen,'fenced','replays_purged');
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB59_REPLAY_MANIFEST_NOT_SEALED%'; END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB59_UNSEALED_MANIFEST_ADVANCED'; END IF;
 UPDATE private.world_boss_erasure_jobs_v59
 SET manifest_sealed=true WHERE account_id=acct;
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v59_advance(
   acct,'WB59_WORKER_NEW',gen,'fenced','replays_purged');
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB59_REPLAY_OBJECTS_NOT_CONFIRMED_DELETED%'; END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB59_UNPURGED_OBJECT_ADVANCED'; END IF;
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v59_mark_object_deleted(
   acct,'WB59_WORKER_NEW',gen,'synthetic/unknown/object');
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB59_OBJECT_NOT_IN_SEALED_MANIFEST%'; END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB59_UNKNOWN_OBJECT_ACKED'; END IF;

 -- The test ACK simulates successful external removal; it does NOT delete
 -- a real object. Duplicate ACK must preserve the first confirmation.
 PERFORM private.world_boss_v59_mark_object_deleted(
  acct,'WB59_WORKER_NEW',gen,key);
 SELECT deleted_at INTO first_ack FROM private.world_boss_erasure_objects_v59
 WHERE account_id=acct AND object_key=key;
 PERFORM private.world_boss_v59_mark_object_deleted(
  acct,'WB59_WORKER_NEW',gen,key);
 IF (SELECT deleted_at FROM private.world_boss_erasure_objects_v59
  WHERE account_id=acct AND object_key=key) IS DISTINCT FROM first_ack
 THEN RAISE EXCEPTION 'WB59_DUPLICATE_REPLAY_ACK_CHANGED'; END IF;
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v59_advance(
   acct,'WB59_WORKER_NEW',gen,'fenced','auth_deleted');
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB59_ILLEGAL_STAGE_TRANSITION%'; END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB59_ILLEGAL_STAGE_SKIP_ALLOWED'; END IF;
 PERFORM private.world_boss_v59_advance(
  acct,'WB59_WORKER_NEW',gen,'fenced','replays_purged');
 PERFORM private.world_boss_v59_advance(
  acct,'WB59_WORKER_NEW',gen,'replays_purged','rows_purged');

 -- Auth user cannot disappear until an approved private Admin deletion.
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v59_advance(
   acct,'WB59_WORKER_NEW',gen,'rows_purged','auth_deleted');
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB59_AUTH_IDENTITY_STILL_PRESENT%'; END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB59_AUTH_DELETE_ACK_FAKED'; END IF;
 -- Never delete production auth.users directly. This deletion is entirely
 -- synthetic and will be rolled back.
 DELETE FROM auth.users WHERE id=acct;
 PERFORM private.world_boss_v59_advance(
  acct,'WB59_WORKER_NEW',gen,'rows_purged','auth_deleted');
 PERFORM private.world_boss_v59_advance(
  acct,'WB59_WORKER_NEW',gen,'auth_deleted','complete');
 PERFORM private.world_boss_v59_release(acct,'WB59_WORKER_NEW',gen);
 IF (private.world_boss_v59_acquire(acct,token,'WB59_WORKER_LATER')
     ->>'kind')<>'complete'
 THEN RAISE EXCEPTION 'WB59_COMPLETION_RETRY_NOT_IDEMPOTENT'; END IF;
 -- A released or completed worker must not clear the privacy fence.
 IF NOT EXISTS(SELECT 1 FROM private.world_boss_erasure_fences_v57
  WHERE account_id=acct)
 THEN RAISE EXCEPTION 'WB59_ERASURE_FENCE_DISAPPEARED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=other_account)
 OR NOT EXISTS(SELECT 1 FROM private.world_boss_erasure_objects_v59
  WHERE account_id=other_account AND deleted_at IS NULL)
 OR (SELECT stage FROM private.world_boss_erasure_jobs_v59
  WHERE account_id=other_account)<>'fenced'
 THEN RAISE EXCEPTION 'WB59_OTHER_ACCOUNT_WAS_CHANGED'; END IF;

 -- V36 fails closed if any new identity table appears without review.
 CREATE TABLE private.world_boss_v59_unreviewed_account_data(
  account_id uuid NOT NULL);
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v36_erasure_preflight(other_account);
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB36_UNREVIEWED_ACCOUNT_DATA%'; END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB59_SCHEMA_DRIFT_IGNORED'; END IF;

 RAISE NOTICE 'WORLD_BOSS_V59_GENERATION_FENCED_ERASURE_STATE=PASS';
END $regression$;
ROLLBACK;
