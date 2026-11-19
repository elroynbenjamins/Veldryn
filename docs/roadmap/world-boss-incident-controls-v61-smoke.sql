-- V61: disposable PostgreSQL source-contract assertions only.
-- No live battle, event scheduling, player accounts, staging or production.
-- Source V17/V27/V28/V61 schema must already exist in disposable CI.
BEGIN;
-- V34 character-ownership guards run before V57 privacy and V61 stop gates.
-- Use a synthetic owned character to reach the intended V61 assertions.
INSERT INTO auth.users(id) VALUES
 ('10000000-0000-4000-8000-000000000061');
INSERT INTO public.characters(id,account_id) VALUES
 ('20000000-0000-4000-8000-000000000061',
  '10000000-0000-4000-8000-000000000061');
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
VALUES (
 'a0000000-0000-4000-8000-000000000061'::uuid,'hollowroot','draft',
 '2026-11-16T00:00:00Z'::timestamptz,
 '2026-11-23T00:00:00Z'::timestamptz,'v61-test',1000,1000),
 (
 'a0000000-0000-4000-8000-000000000062'::uuid,'sunscar','draft',
 '2026-12-14T00:00:00Z'::timestamptz,
 '2026-12-21T00:00:00Z'::timestamptz,'v61-test',1000,1000);

DO $test$
DECLARE
 e uuid:='a0000000-0000-4000-8000-000000000061'::uuid;
 f uuid:='a0000000-0000-4000-8000-000000000062'::uuid;
 action text;
 rows_seen bigint;
 synthetic_account uuid:='10000000-0000-4000-8000-000000000061'::uuid;
 synthetic_character uuid:='20000000-0000-4000-8000-000000000061'::uuid;
BEGIN
 -- All brand-new events are blocked, even before an operator inserts a
 -- control record. Error must be stable and action-agnostic.
 FOREACH action IN ARRAY ARRAY['raid','donation','claim'] LOOP
  BEGIN
   PERFORM private.world_boss_v61_assert_new_action(e,action);
   RAISE EXCEPTION 'WB61_UNEXPECTED_DEFAULT_ALLOW';
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'WB61_NEW_ACTION_PAUSED' THEN RAISE; END IF;
  END;
 END LOOP;

 -- An operator must not accidentally open a boss on first insert:
 -- enrollment must always start with all three controls CLOSED.
 BEGIN
  INSERT INTO private.world_boss_ops_v61(
   event_id,new_raids_open,changed_by,change_reason)
  VALUES(e,true,'ci-operator','unsafe initial enrollment should fail');
  RAISE EXCEPTION 'WB61_INITIAL_OPEN_ACCEPTED';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'WB61_INITIAL_CONTROL_MUST_BE_CLOSED' THEN RAISE; END IF;
 END;
 INSERT INTO private.world_boss_ops_v61(
  event_id,changed_by,change_reason)
 VALUES(e,'ci-operator','initial state: all new actions are paused');
 IF EXISTS(SELECT 1 FROM private.world_boss_ops_v61
  WHERE event_id=e AND (new_raids_open OR new_donations_open OR new_claims_open))
 THEN RAISE EXCEPTION 'WB61_UNSAFE_INITIAL_CONTROL'; END IF;

 -- V34 validates character ownership, then V57 validates account privacy,
 -- then V61's stop gate runs. Valid fixture identities must be supplied
 -- before asserting V61 blocks
 -- each receipt before any unrelated NOT NULL / FK constraints run.
 -- Trigger-level fail-closed guards must stop inserts BEFORE other
 -- constraints run. These intentionally incomplete rows never commit.
 BEGIN
  INSERT INTO private.world_boss_attempts_v17(event_id,account_id,character_id)
  VALUES(e,synthetic_account,synthetic_character);
  RAISE EXCEPTION 'WB61_UNEXPECTED_RAID_WRITE';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'WB61_NEW_ACTION_PAUSED' THEN RAISE; END IF;
 END;
 BEGIN
  INSERT INTO private.world_boss_war_donations_v27(event_id,account_id,character_id)
  VALUES(e,synthetic_account,synthetic_character);
  RAISE EXCEPTION 'WB61_UNEXPECTED_DONATION_WRITE';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'WB61_NEW_ACTION_PAUSED' THEN RAISE; END IF;
 END;
 BEGIN
  INSERT INTO private.world_boss_claim_receipts_v28(event_id,account_id)
  VALUES(e,synthetic_account);
  RAISE EXCEPTION 'WB61_UNEXPECTED_CLAIM_WRITE';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'WB61_NEW_ACTION_PAUSED' THEN RAISE; END IF;
 END;

 UPDATE private.world_boss_ops_v61 SET
  new_raids_open=true,new_donations_open=true,new_claims_open=true,
  revision=revision+1,changed_by='ci-operator',
  change_reason='controlled opening of three new-action paths'
 WHERE event_id=e;
 FOREACH action IN ARRAY ARRAY['raid','donation','claim'] LOOP
  PERFORM private.world_boss_v61_assert_new_action(e,action);
  BEGIN
   PERFORM private.world_boss_v61_assert_new_action(f,action);
   RAISE EXCEPTION 'WB61_OTHER_EVENT_OPENED';
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'WB61_NEW_ACTION_PAUSED' THEN RAISE; END IF;
  END;
 END LOOP;

 -- A missing required field should now be the failure, not our stop gate.
 BEGIN
  INSERT INTO private.world_boss_attempts_v17(event_id,account_id,character_id)
  VALUES(e,synthetic_account,synthetic_character);
  RAISE EXCEPTION 'WB61_INVALID_ATTEMPT_INSERTED';
 EXCEPTION WHEN not_null_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO private.world_boss_war_donations_v27(event_id,account_id,character_id)
  VALUES(e,synthetic_account,synthetic_character);
  RAISE EXCEPTION 'WB61_INVALID_DONATION_INSERTED';
 EXCEPTION WHEN not_null_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO private.world_boss_claim_receipts_v28(event_id,account_id)
  VALUES(e,synthetic_account);
  RAISE EXCEPTION 'WB61_INVALID_CLAIM_INSERTED';
 EXCEPTION WHEN not_null_violation THEN NULL;
 END;

 -- Stop raids only. Donations and claims can remain accessible to
 -- preserve completed participation and avoid blanket reward forfeiture.
 UPDATE private.world_boss_ops_v61 SET
  new_raids_open=false,revision=revision+1,
  changed_by='ci-operator',
  change_reason='incident: pause only new raid attempts'
 WHERE event_id=e;
 BEGIN
  PERFORM private.world_boss_v61_assert_new_action(e,'raid');
  RAISE EXCEPTION 'WB61_RAID_PAUSE_BYPASS';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'WB61_NEW_ACTION_PAUSED' THEN RAISE; END IF;
 END;
 PERFORM private.world_boss_v61_assert_new_action(e,'donation');
 PERFORM private.world_boss_v61_assert_new_action(e,'claim');
 SELECT count(*) INTO rows_seen FROM private.world_boss_ops_audit_v61
  WHERE event_id=e AND revision IN (1,2,3);
 IF rows_seen<>3 THEN RAISE EXCEPTION 'WB61_AUDIT_MISSING_REVISION'; END IF;

 BEGIN
  UPDATE private.world_boss_ops_v61
   SET new_raids_open=true,changed_by='ci-operator',
    change_reason='bad update missing monotonic revision'
  WHERE event_id=e;
  RAISE EXCEPTION 'WB61_INVALID_REVISION_ACCEPTED';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'WB61_INVALID_CONTROL_REVISION' THEN RAISE; END IF;
 END;
 BEGIN
  DELETE FROM private.world_boss_ops_v61 WHERE event_id=e;
  RAISE EXCEPTION 'WB61_CONTROL_DELETED';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'WB61_CONTROL_DELETE_FORBIDDEN' THEN RAISE; END IF;
 END;
 BEGIN
  DELETE FROM private.world_boss_ops_audit_v61 WHERE event_id=e;
  RAISE EXCEPTION 'WB61_AUDIT_DELETED';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'WB61_AUDIT_IMMUTABLE' THEN RAISE; END IF;
 END;

 -- Aggregate operator view must expose the live event's operational
 -- health without returning any account or replay identities.
 IF NOT EXISTS(SELECT 1 FROM private.world_boss_ops_status_v61
  WHERE event_id=e AND new_raids_open=false
    AND new_donations_open=true AND new_claims_open=true
    AND controls_revision=3 AND reserved_attempts=0
    AND committed_attempts=0 AND voided_attempts=0
    AND committed_without_replay_proof=0
    AND accepted_donations=0 AND accepted_claims=0
    AND reward_ledger_rows=0)
 THEN RAISE EXCEPTION 'WB61_INCORRECT_OPERATOR_STATUS'; END IF;
 IF EXISTS(SELECT 1 FROM pg_attribute
  WHERE attrelid='private.world_boss_ops_status_v61'::regclass
    AND attnum>0 AND NOT attisdropped
    AND (attname LIKE '%account%' OR attname LIKE '%character%'
      OR attname LIKE '%replay_key%'))
 THEN RAISE EXCEPTION 'WB61_OPERATOR_STATUS_LEAKS_IDENTITY'; END IF;
 IF has_table_privilege('service_role','private.world_boss_ops_status_v61','SELECT')
 THEN RAISE EXCEPTION 'WB61_OPERATOR_STATUS_PUBLIC_GRANT'; END IF;

 IF has_table_privilege('service_role','private.world_boss_ops_v61','UPDATE')
  OR has_table_privilege('authenticated','private.world_boss_ops_v61','UPDATE')
  OR has_table_privilege('anon','private.world_boss_ops_v61','UPDATE')
  OR has_function_privilege('authenticated',
   'private.world_boss_v61_assert_new_action(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'WB61_UNAUTHORIZED_OPERATOR_PRIVILEGES'; END IF;
 IF (SELECT count(*) FROM pg_trigger
  WHERE tgrelid IN (
   'private.world_boss_attempts_v17'::regclass,
   'private.world_boss_war_donations_v27'::regclass,
   'private.world_boss_claim_receipts_v28'::regclass)
   AND tgname LIKE 'world_boss_v61_%_gate' AND NOT tgisinternal
   AND tgenabled='O')<>3
 THEN RAISE EXCEPTION 'WB61_MISSING_NEW_ACTION_GATES'; END IF;
END
$test$;

-- No real attempts, receipts or event controls survive this check.
ROLLBACK;
