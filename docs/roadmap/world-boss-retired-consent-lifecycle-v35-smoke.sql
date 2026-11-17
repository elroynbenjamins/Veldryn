-- V35: retired World Boss V20/V21 Echo consents must never block
-- character deletion. Disposable PostgreSQL only; all synthetic data
-- rolls back, and no borrowed-Echo game feature is enabled.
BEGIN;
INSERT INTO auth.users(id)
VALUES('10000000-0000-4000-8000-000000000035');
INSERT INTO public.characters(id,account_id)
VALUES('20000000-0000-4000-8000-000000000035',
       '10000000-0000-4000-8000-000000000035');
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
VALUES(
 '30000000-0000-4000-8000-000000000035',
 'hollowroot','draft',clock_timestamp(),
 clock_timestamp()+interval '7 days','wb35-fixture',1000,1000);
INSERT INTO private.world_boss_echo_consents_v20(
 event_id,owner_account_id,character_id,consent_revision,enabled,
 granted_at,expires_at)
VALUES(
 '30000000-0000-4000-8000-000000000035',
 '10000000-0000-4000-8000-000000000035',
 '20000000-0000-4000-8000-000000000035',
 1,false,clock_timestamp(),clock_timestamp()+interval '1 day');
INSERT INTO private.world_boss_consent_commands_v21(
 event_id,owner_account_id,request_id,character_id,enabled,
 expected_revision,resulting_revision,receipt)
VALUES(
 '30000000-0000-4000-8000-000000000035',
 '10000000-0000-4000-8000-000000000035',
 'WB35_ECHO_CONSENT_REQ','20000000-0000-4000-8000-000000000035',
 false,0,1,'{"repeated":false}'::jsonb);
DO $check$
DECLARE
 ch uuid:='20000000-0000-4000-8000-000000000035';
 acct uuid:='10000000-0000-4000-8000-000000000035';
 relevant_count integer;
BEGIN
 -- If a new draft table reintroduces a restrictive FK to characters,
 -- fail instead of letting an account-wide release strand a roster.
 SELECT count(*) INTO relevant_count
 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
 JOIN pg_namespace n ON n.oid=r.relnamespace
 WHERE c.contype='f' AND c.confrelid='public.characters'::regclass
 AND n.nspname='private' AND r.relname LIKE 'world_boss_%'
 AND c.confdeltype NOT IN ('c','n');
 IF relevant_count<>0 THEN
  RAISE EXCEPTION 'WB35_WORLD_BOSS_CHARACTER_DELETION_BLOCKERS: %',relevant_count;
 END IF;
 DELETE FROM public.characters WHERE id=ch AND account_id=acct;
 IF EXISTS(SELECT 1 FROM private.world_boss_echo_consents_v20
  WHERE owner_account_id=acct)
 OR EXISTS(SELECT 1 FROM private.world_boss_consent_commands_v21
  WHERE owner_account_id=acct)
 THEN RAISE EXCEPTION 'WB35_RETIRED_ECHO_CONSENT_NOT_CLEANED'; END IF;
 DELETE FROM auth.users WHERE id=acct;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=acct)
 THEN RAISE EXCEPTION 'WB35_ECHO_ONLY_ACCOUNT_NOT_ERASED'; END IF;
 RAISE NOTICE 'WORLD_BOSS_V35_RETIRED_ECHO_LIFECYCLE=PASS';
END
$check$;
ROLLBACK;
