-- V23: disposable PostgreSQL 16 only; review-only, all changes roll back.
-- Apply after V17/V18/V20/V21/V22 and the V23 reservation draft.
BEGIN;
DO $test$
DECLARE
 r jsonb;
 event_id uuid:='30000000-0000-4000-8000-000000000023';
 owner_id uuid:='10000000-0000-4000-8000-000000000001';
 leader_id uuid:='20000000-0000-4000-8000-000000000001';
 blocked boolean;
BEGIN
 IF has_function_privilege('anon',
  'private.world_boss_v23_reserve_account(uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text)',
  'EXECUTE') OR
  has_function_privilege('authenticated',
  'private.world_boss_v23_reserve_account(uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text)',
  'EXECUTE')
 THEN RAISE EXCEPTION 'WB23_PUBLIC_RESERVATION_EXPOSED'; END IF;
 IF NOT has_function_privilege('service_role',
  'private.world_boss_v23_reserve_account(uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text)',
  'EXECUTE')
 THEN RAISE EXCEPTION 'WB23_SERVICE_ROLE_MISSING'; END IF;

 INSERT INTO private.world_boss_events_v17 (
  id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
 VALUES (
  event_id,'sunscar','closed','2020-01-06 00:00+00',
  '2020-01-13 00:00+00','WB23_REVIEW',1000,990);
 -- An already settled attempt can be fetched after the event, even when
 -- the caller no longer has a matching loadout/packet or open raid window.
 INSERT INTO private.world_boss_attempts_v17 (
  event_id,account_id,request_id,ordinal,character_id,
  status,war_order,phase,rules_version,engine_version,server_seed,
  squad_digest,frozen_squad,war_camp_digest,encounter_profile_digest,
  reserved_at,lease_owner,lease_expires_at,hard_expires_at,
  committed_at,replay_digest,replay_object_key,raw_boss_damage,
  local_guard_damage,hp_before,hp_after,credited_hp,residual_echo)
 VALUES (
  event_id,owner_id,'WB23_PRIOR_RECEIPT',1,leader_id,
  'committed','hold_line','armored','WB23_REVIEW',
  'world-boss-account-raid-v22-prototype',repeat('S',32),
  repeat('a',64),jsonb_build_object('schema','test', 'filler',repeat('F',240)),
  repeat('b',64),repeat('c',64),
  '2020-01-11 00:00+00','WB23_TEST_WORKER',
  '2020-01-11 00:02+00','2020-01-11 00:15+00',
  '2020-01-11 00:01+00',repeat('d',64),'WB23_TEST_REPLAY',
  10,0,1000,990,10,false);

 r:=private.world_boss_v23_reserve_account(
  event_id,owner_id,leader_id,'WB23_PRIOR_RECEIPT',
  'hold_line',NULL,NULL,NULL,
  'world-boss-account-raid-v22-prototype',
  'WB23_TEST_WORKER',NULL);
 IF r->>'status'<>'committed' OR r->>'ordinal'<>'1' OR
  r->>'repeated'<>'true'
 THEN RAISE EXCEPTION 'WB23_LATE_RETRY_MISSED_IMMUTABLE_RECEIPT'; END IF;
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v23_reserve_account(
   event_id,owner_id,leader_id,'WB23_PRIOR_RECEIPT',
   'steady_assault',NULL,NULL,NULL,
   'world-boss-account-raid-v22-prototype','WB23_TEST_WORKER',NULL);
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB23_REQUEST_ID_REUSED%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB23_DIFFERENT_INTENT_REUSED_KEY'; END IF;

 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v23_reserve_account(
   event_id,owner_id,leader_id,'WB23_BRAND_NEW_REQUEST',
   'hold_line',repeat('X',32),repeat('e',64),
   jsonb_build_object('schema','world-boss-v23-frozen-account-raid'),
   'world-boss-account-raid-v22-prototype','WB23_TEST_WORKER',repeat('f',64));
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB23_RAID_WINDOW_CLOSED%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB23_CLOSED_EVENT_NEW_ATTACK_ALLOWED'; END IF;
 IF (SELECT count(*) FROM private.world_boss_attempts_v17 WHERE event_id=event_id)<>1
 THEN RAISE EXCEPTION 'WB23_EXTRA_ATTEMPT_DEBIT'; END IF;
 RAISE NOTICE 'WB23_PRIVATE_ROSTER_RESERVATION_AND_LATE_RETRY_PASSED';
END
$test$;
ROLLBACK;
