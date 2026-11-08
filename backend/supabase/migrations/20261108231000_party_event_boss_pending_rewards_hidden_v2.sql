-- Hidden Party Events v2: reserve each eligible member's Day 8 reward
-- exactly once, based on the verified party performance band.
-- NO items, gold, Renown or Inbox message are granted by this migration.
BEGIN;

ALTER TABLE private.party_weekly_event_reward_entitlements_v2
  ADD COLUMN IF NOT EXISTS boss_reward_band smallint NOT NULL DEFAULT 1
    CHECK(boss_reward_band BETWEEN 1 AND 6);
ALTER TABLE private.party_weekly_event_reward_entitlements_v2
  ADD COLUMN IF NOT EXISTS member_event_points smallint NOT NULL DEFAULT 0
    CHECK(member_event_points BETWEEN 0 AND 60);
ALTER TABLE private.party_weekly_event_reward_entitlements_v2
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'party_event_day8_v2'
    CHECK(source='party_event_day8_v2');

-- This trigger runs in the same transaction as the single immutable boss
-- result and the historical leaderboard score. A retry cannot mint rewards.
CREATE OR REPLACE FUNCTION private.party_event_boss_reserve_entitlements_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $reserve$
DECLARE
  v_event private.party_weekly_event_instances_v2%ROWTYPE;
  v_renown smallint;
BEGIN
  SELECT * INTO v_event FROM private.party_weekly_event_instances_v2
    WHERE id=NEW.event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARTY_EVENT_REWARD_SOURCE_MISSING'; END IF;

  v_renown:=CASE v_event.difficulty
    WHEN 'standard' THEN 10
    WHEN 'veteran' THEN 12
    WHEN 'heroic' THEN 14
    ELSE NULL END;
  IF v_renown IS NULL THEN RAISE EXCEPTION 'PARTY_EVENT_INVALID_REWARD_DIFFICULTY'; END IF;

  INSERT INTO private.party_weekly_event_reward_entitlements_v2(
    event_id,account_id,week_start,choice,renown,status,
    boss_reward_band,member_event_points,source
  )
  SELECT v_event.id,m.account_id,v_event.starts_at,NULL,v_renown,
    'pending',NEW.reward_band,m.activity_points+m.special_points,
    'party_event_day8_v2'
  FROM private.party_weekly_event_members_v2 m
  WHERE m.event_id=v_event.id
    AND m.activity_points+m.special_points>=15
  ON CONFLICT(event_id,account_id) DO NOTHING;

  -- Sanity check: no two events can give the same account duplicate reward
  -- entitlements for this event week, regardless of character selection.
  IF EXISTS(
    SELECT 1 FROM private.party_weekly_event_members_v2 m
    JOIN private.party_weekly_event_reward_entitlements_v2 e
      ON e.account_id=m.account_id AND e.week_start=v_event.starts_at
    WHERE m.event_id=v_event.id AND m.activity_points+m.special_points>=15
      AND e.event_id<>v_event.id
  ) THEN
    RAISE EXCEPTION 'PARTY_EVENT_REWARD_ACCOUNT_WEEK_COLLISION';
  END IF;

  RETURN NEW;
END $reserve$;

DROP TRIGGER IF EXISTS party_event_boss_reserve_entitlements_v2
  ON private.party_event_boss_results_v2;
CREATE TRIGGER party_event_boss_reserve_entitlements_v2
AFTER INSERT ON private.party_event_boss_results_v2
FOR EACH ROW EXECUTE FUNCTION private.party_event_boss_reserve_entitlements_v2();

REVOKE ALL ON FUNCTION private.party_event_boss_reserve_entitlements_v2()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_boss_reserve_entitlements_v2()
  TO service_role;

COMMENT ON FUNCTION private.party_event_boss_reserve_entitlements_v2() IS
 'Creates private pending performance-based chest offers for >=15 EP; does NOT grant gold/items/Renown or contact Inbox.';
COMMIT;
