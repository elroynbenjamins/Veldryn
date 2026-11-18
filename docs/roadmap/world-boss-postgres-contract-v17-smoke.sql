-- V17 schema smoke: run ONLY against a disposable local PostgreSQL.
-- Assumes the v17-fixture bootstrap and v17 schema were applied.
-- Nothing is committed: all fixture records are rolled back.
BEGIN;
INSERT INTO auth.users(id)
 VALUES ('11111111-1111-4111-8111-111111111111');
INSERT INTO public.characters(id,account_id) VALUES
 ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111');
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
VALUES ('33333333-3333-4333-8333-333333333333','hollowroot','draft',
 clock_timestamp()-interval '1 hour',clock_timestamp()+interval '6 days',
 'wb17-review-only',1000000,1000000);

DO $test$
DECLARE
 v_event uuid:='33333333-3333-4333-8333-333333333333';
 v_account uuid:='11111111-1111-4111-8111-111111111111';
 v_char uuid:='22222222-2222-4222-8222-222222222222';
 v_bad boolean;
BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class
    WHERE oid='private.world_boss_attempts_v17'::regclass)
 THEN RAISE EXCEPTION 'WB17_MISSING_RLS'; END IF;
 IF has_table_privilege('anon','private.world_boss_attempts_v17','SELECT') OR
    has_table_privilege('authenticated','private.world_boss_attempts_v17','INSERT')
 THEN RAISE EXCEPTION 'WB17_CLIENT_ACCESS_EXPOSED'; END IF;
 IF NOT has_table_privilege('service_role','private.world_boss_attempts_v17','SELECT')
 THEN RAISE EXCEPTION 'WB17_SERVICE_ACCESS_MISSING'; END IF;

 INSERT INTO private.world_boss_attempts_v17(
  event_id,account_id,request_id,ordinal,character_id,war_order,phase,
  rules_version,engine_version,server_seed,squad_digest,frozen_squad,
  lease_owner,lease_expires_at,hard_expires_at)
 VALUES(v_event,v_account,'WB17_REQ_ONE',1,v_char,'hold_line','armored',
  'wb17-review-only','wb17-engine-only',repeat('S',32),repeat('a',64),
  jsonb_build_object('serverOwnedSnapshot',repeat('X',150)),
  'WB17_WORKER_A',clock_timestamp()+interval '2 minutes',
  clock_timestamp()+interval '15 minutes');

 -- A second simultaneous active ordinal must fail.
 v_bad:=false;
 BEGIN
  INSERT INTO private.world_boss_attempts_v17(
   event_id,account_id,request_id,ordinal,character_id,war_order,phase,
   rules_version,engine_version,server_seed,squad_digest,frozen_squad,
   lease_owner,lease_expires_at,hard_expires_at)
  VALUES(v_event,v_account,'WB17_REQ_TWO',1,v_char,'hold_line','armored',
   'wb17-review-only','wb17-engine-only',repeat('T',32),repeat('b',64),
   jsonb_build_object('serverOwnedSnapshot',repeat('Y',150)),
   'WB17_WORKER_B',clock_timestamp()+interval '2 minutes',
   clock_timestamp()+interval '15 minutes');
 EXCEPTION WHEN unique_violation THEN v_bad:=true;
 END;
 IF NOT v_bad THEN RAISE EXCEPTION 'WB17_ACTIVE_ORDINAL_NOT_UNIQUE'; END IF;

 -- Frozen seed and original roster may not be modified.
 v_bad:=false;
 BEGIN
  UPDATE private.world_boss_attempts_v17 SET server_seed=repeat('Z',32)
   WHERE event_id=v_event AND account_id=v_account AND request_id='WB17_REQ_ONE';
 EXCEPTION WHEN raise_exception THEN
  v_bad:=SQLERRM LIKE '%WB17_FROZEN_ATTEMPT_MUTATION%';
 END;
 IF NOT v_bad THEN RAISE EXCEPTION 'WB17_FROZEN_SEED_WAS_MUTABLE'; END IF;

 -- A different worker must increase generation to take a lease.
 v_bad:=false;
 BEGIN
  UPDATE private.world_boss_attempts_v17 SET lease_owner='WB17_WORKER_B'
   WHERE event_id=v_event AND account_id=v_account AND request_id='WB17_REQ_ONE';
 EXCEPTION WHEN raise_exception THEN
  v_bad:=SQLERRM LIKE '%WB17_LEASE_OWNER_NEEDS_NEW_GENERATION%';
 END;
 IF NOT v_bad THEN RAISE EXCEPTION 'WB17_UNFENCED_WORKER'; END IF;
 UPDATE private.world_boss_attempts_v17
 SET lease_generation=2,lease_owner='WB17_WORKER_B'
 WHERE event_id=v_event AND account_id=v_account AND request_id='WB17_REQ_ONE';

 -- A voided request keeps its primary key, but frees the slot for a NEW key.
 UPDATE private.world_boss_attempts_v17
 SET status='voided',voided_at=clock_timestamp()
 WHERE event_id=v_event AND account_id=v_account AND request_id='WB17_REQ_ONE';

 v_bad:=false;
 BEGIN
  INSERT INTO private.world_boss_attempts_v17(
   event_id,account_id,request_id,ordinal,character_id,war_order,phase,
   rules_version,engine_version,server_seed,squad_digest,frozen_squad,
   lease_owner,lease_expires_at,hard_expires_at)
  VALUES(v_event,v_account,'WB17_REQ_ONE',1,v_char,'hold_line','armored',
   'wb17-review-only','wb17-engine-only',repeat('S',32),repeat('a',64),
   jsonb_build_object('serverOwnedSnapshot',repeat('X',150)),
   'WB17_WORKER_A',clock_timestamp()+interval '2 minutes',
   clock_timestamp()+interval '15 minutes');
 EXCEPTION WHEN unique_violation THEN v_bad:=true;
 END;
 IF NOT v_bad THEN RAISE EXCEPTION 'WB17_VOID_TOMBSTONE_WAS_REUSED'; END IF;

 -- Slot 1 is now free for another request.
 INSERT INTO private.world_boss_attempts_v17(
  event_id,account_id,request_id,ordinal,character_id,war_order,phase,
  rules_version,engine_version,server_seed,squad_digest,frozen_squad,
  lease_owner,lease_expires_at,hard_expires_at)
 VALUES(v_event,v_account,'WB17_REQ_THREE',1,v_char,'steady_assault','armored',
  'wb17-review-only','wb17-engine-only',repeat('V',32),repeat('c',64),
  jsonb_build_object('serverOwnedSnapshot',repeat('Q',150)),
  'WB17_WORKER_C',clock_timestamp()+interval '2 minutes',
  clock_timestamp()+interval '15 minutes');

 -- A completed record cannot be edited or returned to reserved state.
 UPDATE private.world_boss_attempts_v17 SET
  status='committed',committed_at=clock_timestamp(),replay_digest=repeat('d',64),
  replay_object_key='WB17_REPLAY_OBJECT_123',
  raw_boss_damage=100,local_guard_damage=10,hp_before=1000000,
  hp_after=999900,credited_hp=100,residual_echo=false
 WHERE event_id=v_event AND account_id=v_account AND request_id='WB17_REQ_THREE';
 v_bad:=false;
 BEGIN
  UPDATE private.world_boss_attempts_v17 SET raw_boss_damage=200
   WHERE event_id=v_event AND account_id=v_account AND request_id='WB17_REQ_THREE';
 EXCEPTION WHEN raise_exception THEN
  v_bad:=SQLERRM LIKE '%WB17_TERMINAL_ATTEMPT_MUTATION%';
 END;
 IF NOT v_bad THEN RAISE EXCEPTION 'WB17_COMMITTED_RECEIPT_WAS_MUTABLE'; END IF;

 -- A fourth account-wide ordinal must fail before even reaching uniqueness.
 v_bad:=false;
 BEGIN
  INSERT INTO private.world_boss_attempts_v17(
   event_id,account_id,request_id,ordinal,character_id,war_order,phase,
   rules_version,engine_version,server_seed,squad_digest,frozen_squad,
   lease_owner,lease_expires_at,hard_expires_at)
  VALUES(v_event,v_account,'WB17_REQ_FOUR',4,v_char,'hold_line','armored',
   'wb17-review-only','wb17-engine-only',repeat('S',32),repeat('a',64),
   jsonb_build_object('serverOwnedSnapshot',repeat('X',150)),
   'WB17_WORKER_A',clock_timestamp()+interval '2 minutes',
   clock_timestamp()+interval '15 minutes');
 EXCEPTION WHEN check_violation THEN v_bad:=true;
 END;
 IF NOT v_bad THEN RAISE EXCEPTION 'WB17_FOURTH_ATTEMPT_WAS_ALLOWED'; END IF;
 RAISE NOTICE 'WORLD_BOSS_V17_DISPOSABLE_POSTGRES_SCHEMA_SMOKE_PASSED';
END
$test$;
ROLLBACK;
