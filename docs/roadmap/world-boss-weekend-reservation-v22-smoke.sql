-- V22 disposable PostgreSQL 16 smoke. NO real event, no Supabase.
-- Run only after V17/V18 fixture and V22 draft SQL. Everything rolls back.
BEGIN;
DO $test$
DECLARE
 monday timestamptz:='2026-11-16 00:00:00+00';
 spring timestamptz:='2027-03-29 00:00:00+00';
BEGIN
 IF private.world_boss_v22_window_at(monday,monday)<>-1 OR
    private.world_boss_v22_window_at(monday,monday+interval '4 days 23 hours 59 minutes')<>-1
 THEN RAISE EXCEPTION 'WB22_PREPARATION_OPEN_TO_ATTACK'; END IF;

 -- All of Saturday and Sunday must be open without gaps, including
 -- times between old 30-minute sessions and the Sunday closing boundary.
 IF private.world_boss_v22_window_at(monday,monday+interval '5 days')<>0 OR
    private.world_boss_v22_window_at(monday,monday+interval '5 days 30 minutes')<>0 OR
    private.world_boss_v22_window_at(monday,monday+interval '5 days 8 hours 45 minutes')<>0 OR
    private.world_boss_v22_window_at(monday,monday+interval '5 days 23 hours 59 minutes 59 seconds')<>0 OR
    private.world_boss_v22_window_at(monday,monday+interval '6 days')<>0 OR
    private.world_boss_v22_window_at(monday,monday+interval '6 days 12 hours')<>0 OR
    private.world_boss_v22_window_at(monday,monday+interval '6 days 23 hours 59 minutes 59 seconds')<>0
 THEN RAISE EXCEPTION 'WB22_CONTINUOUS_WEEKEND_HAS_GAP'; END IF;
 IF private.world_boss_v22_window_at(monday,monday+interval '7 days')<>-1 OR
    private.world_boss_v22_window_at(monday,monday+interval '14 days')<>-1 OR
    private.world_boss_v22_window_at(monday+interval '1 day',
     monday+interval '6 days')<>-1
 THEN RAISE EXCEPTION 'WB22_EVENT_OUTSIDE_WINDOW'; END IF;
 -- UTC weekend boundaries do NOT drift when Amsterdam changes daylight saving.
 IF private.world_boss_v22_window_at(spring,spring+interval '5 days 8 hours')<>0 OR
    private.world_boss_v22_window_at(spring,spring+interval '6 days 22 hours')<>0 OR
    private.world_boss_v22_window_at(spring,spring+interval '7 days')<>-1
 THEN RAISE EXCEPTION 'WB22_UTC_DST_DRIFT'; END IF;
 IF has_function_privilege('anon',
     'private.world_boss_v22_reserve_account(uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)','EXECUTE') OR
    has_function_privilege('authenticated',
     'private.world_boss_v22_window_at(timestamptz,timestamptz)','EXECUTE') OR
    has_function_privilege('authenticated',
     'private.world_boss_v22_reserve_account(uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'WB22_PUBLIC_RESERVATION_EXPOSED'; END IF;
 RAISE NOTICE 'WB22_CONTINUOUS_48H_UTC_AND_PRIVATE_RESERVATION_PASSED';
END
$test$;

INSERT INTO public.characters(id,account_id) VALUES
 ('20000000-0000-4000-8000-000000000015',
  '10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000016',
  '10000000-0000-4000-8000-000000000001');
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
VALUES ('30000000-0000-4000-8000-000000000022','sunscar','active',
 '2020-01-06 00:00:00+00','2020-01-13 00:00:00+00',
 'wb22-review-only',1000000,1000000);
DO $test$
DECLARE
 e uuid:='30000000-0000-4000-8000-000000000022';
 acct uuid:='10000000-0000-4000-8000-000000000001';
 ch uuid:='20000000-0000-4000-8000-000000000001';
 packet jsonb;
 blocked boolean:=false;
BEGIN
 packet:=jsonb_build_object(
  'schema','world-boss-v22-account-raid-prototype',
  'accountId',acct::text,'characters',jsonb_build_array(
   jsonb_build_object('characterId',ch::text),
   jsonb_build_object('characterId','20000000-0000-4000-8000-000000000015'),
   jsonb_build_object('characterId','20000000-0000-4000-8000-000000000016')));
 BEGIN
  PERFORM private.world_boss_v22_reserve_account(
   e,acct,ch,'WB22_ACCOUNT_RAID_01','steady_assault',
   repeat('S',32),repeat('a',64),packet,
   'world-boss-account-raid-v22-prototype',
   'WB22_PRIVATE_WORKER',NULL,NULL);
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB22_WEEKEND_WINDOW_CLOSED%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB22_CLOSED_WINDOW_CREATED_ATTEMPT'; END IF;
 IF EXISTS(SELECT 1 FROM private.world_boss_attempts_v17
  WHERE event_id=e AND account_id=acct)
 THEN RAISE EXCEPTION 'WB22_PREMATURE_ATTEMPT_DEBIT'; END IF;
 RAISE NOTICE 'WB22_WEEKEND_ACCOUNT_ATTEMPT_WINDOW_GATE_PASSED';
END
$test$;
ROLLBACK;
