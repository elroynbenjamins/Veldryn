-- World Boss V53: disposable PostgreSQL schema-constraint regression.
-- REVIEW ONLY, NOT A MIGRATION. DO NOT RUN ON STAGING OR PRODUCTION.
-- Apply AFTER the other V17-V41 disposable fixture/smoke suites.
-- The code below is wrapped in one transaction and ends in ROLLBACK.
-- It adds no player data, wallets, credits, claims or real event jobs.
BEGIN;

-- One canonical realm event may begin at any given instant, irrespective
-- of boss_id, status or region. No partial unique indexes by boss/status.
CREATE UNIQUE INDEX world_boss_v53_one_global_start
  ON private.world_boss_events_v17(starts_at);

-- A cycle lasts a fixed 14*86400 seconds in UTC, not 14 local civil days.
-- integer epoch seconds avoid timezone/DST-sensitive timestamptz+interval
-- expressions in an immutable GiST exclusion constraint. Any two overlapping
-- realm cycles conflict, including a different-boss or differently timed row.
ALTER TABLE private.world_boss_events_v17
  ADD CONSTRAINT world_boss_v53_global_cycle_no_overlap
  EXCLUDE USING gist (
    int8range(
      floor(extract(epoch FROM starts_at))::bigint,
      floor(extract(epoch FROM starts_at))::bigint + 1209600,
      '[)'
    ) WITH &&
  );

INSERT INTO private.world_boss_events_v17
  (id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
VALUES
  ('30000000-0000-4000-8000-000000000053','hollowroot','draft',
   '2035-01-01 00:00:00+00','2035-01-08 00:00:00+00',
   'wb53-ci-review',100000,100000);

DO $assert$
DECLARE
 blocked_same_start boolean:=false;
 blocked_overlap boolean:=false;
BEGIN
 -- Must reject *another boss* in the SAME global 14-day cycle.
 BEGIN
  INSERT INTO private.world_boss_events_v17
   (id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
  VALUES
   ('30000000-0000-4000-8000-000000000054','sunscar','draft',
    '2035-01-01 00:00:00+00','2035-01-08 00:00:00+00',
    'wb53-ci-review',100000,100000);
 EXCEPTION WHEN unique_violation OR exclusion_violation THEN
  blocked_same_start:=true;
 END;
 IF NOT blocked_same_start THEN
  RAISE EXCEPTION 'WB53_ACCEPTED_SECOND_GLOBAL_BOSS_SAME_START';
 END IF;

 -- Same-boss/different-boss, even a 7-day offset, also conflicts.
 BEGIN
  INSERT INTO private.world_boss_events_v17
   (id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
  VALUES
   ('30000000-0000-4000-8000-000000000055','frostmarch','closed',
    '2035-01-08 00:00:00+00','2035-01-15 00:00:00+00',
    'wb53-ci-review',100000,100000);
 EXCEPTION WHEN exclusion_violation THEN
  blocked_overlap:=true;
 END;
 IF NOT blocked_overlap THEN
  RAISE EXCEPTION 'WB53_ACCEPTED_OVERLAPPING_CYCLE';
 END IF;
END
$assert$;

-- An adjacent second cycle is valid (no artificial 42-day lockout).
INSERT INTO private.world_boss_events_v17
  (id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
VALUES
  ('30000000-0000-4000-8000-000000000056','sunscar','draft',
   '2035-01-15 00:00:00+00','2035-01-22 00:00:00+00',
   'wb53-ci-review',100000,100000);

DO $verify$
BEGIN
 IF (SELECT count(*) FROM private.world_boss_events_v17
     WHERE starts_at >= '2035-01-01 00:00:00+00'
       AND starts_at < '2035-01-29 00:00:00+00') <> 2 THEN
  RAISE EXCEPTION 'WB53_CANONICAL_TWO_CYCLES_NOT_PRESERVED';
 END IF;
 RAISE NOTICE 'WORLD_BOSS_V53_GLOBAL_CYCLE_UNIQUENESS=PASS';
END
$verify$;
ROLLBACK;
