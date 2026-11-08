-- Hidden Party Events v2: choose and freeze Day 8 reward bundles.
-- Full cache >=15 personal EP, small participation award >=5 EP.
-- NO public endpoint, Inbox messages, XP, currency, or Renown are granted here.
BEGIN;

ALTER TABLE private.party_weekly_event_reward_entitlements_v2
  DROP CONSTRAINT IF EXISTS party_weekly_event_reward_entitlements_v2_renown_check;
ALTER TABLE private.party_weekly_event_reward_entitlements_v2
  ADD CONSTRAINT party_weekly_event_reward_entitlements_v2_renown_check
  CHECK(renown IN (0,10,12,14));
ALTER TABLE private.party_weekly_event_reward_entitlements_v2
  ADD COLUMN IF NOT EXISTS participation_only boolean NOT NULL DEFAULT false;
ALTER TABLE private.party_weekly_event_reward_entitlements_v2
  ADD COLUMN IF NOT EXISTS reward_payload jsonb;
ALTER TABLE private.party_weekly_event_reward_entitlements_v2
  ADD COLUMN IF NOT EXISTS chosen_at timestamptz;
ALTER TABLE private.party_weekly_event_reward_entitlements_v2
  ADD COLUMN IF NOT EXISTS inbox_delivered_at timestamptz;

ALTER TABLE private.party_weekly_event_reward_entitlements_v2
  ADD CONSTRAINT party_event_reward_choice_consistent_v2 CHECK(
    (participation_only AND renown=0 AND choice IS NULL)
    OR (NOT participation_only AND renown IN (10,12,14))
  );
ALTER TABLE private.party_weekly_event_reward_entitlements_v2
  ADD CONSTRAINT party_event_reward_payload_consistent_v2 CHECK(
    (reward_payload IS NULL AND chosen_at IS NULL)
    OR (reward_payload IS NOT NULL AND chosen_at IS NOT NULL
      AND jsonb_typeof(reward_payload)='object')
  );

-- Correct the initial Day 8 reservation threshold before the first launch:
-- low-effort (5–14 EP) members get a modest participation offer without
-- Party Renown; full three-choice caches require >=15 personal EP.
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
    WHEN 'standard' THEN 10 WHEN 'veteran' THEN 12
    WHEN 'heroic' THEN 14 ELSE NULL END;
  IF v_renown IS NULL THEN
    RAISE EXCEPTION 'PARTY_EVENT_INVALID_REWARD_DIFFICULTY';
  END IF;
  INSERT INTO private.party_weekly_event_reward_entitlements_v2(
    event_id,account_id,week_start,choice,renown,status,
    boss_reward_band,member_event_points,source,participation_only
  )
  SELECT v_event.id,m.account_id,v_event.starts_at,NULL,
    CASE WHEN m.activity_points+m.special_points>=15 THEN v_renown ELSE 0 END,
    'pending',NEW.reward_band,m.activity_points+m.special_points,
    'party_event_day8_v2',m.activity_points+m.special_points<15
  FROM private.party_weekly_event_members_v2 m
  WHERE m.event_id=v_event.id AND m.activity_points+m.special_points>=5
  ON CONFLICT(event_id,account_id) DO NOTHING;
  IF EXISTS(
    SELECT 1 FROM private.party_weekly_event_members_v2 m
    JOIN private.party_weekly_event_reward_entitlements_v2 r
      ON r.account_id=m.account_id AND r.week_start=v_event.starts_at
    WHERE m.event_id=v_event.id AND m.activity_points+m.special_points>=5
      AND r.event_id<>v_event.id
  ) THEN RAISE EXCEPTION 'PARTY_EVENT_REWARD_ACCOUNT_WEEK_COLLISION'; END IF;
  RETURN NEW;
END $reserve$;
REVOKE ALL ON FUNCTION private.party_event_boss_reserve_entitlements_v2()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_boss_reserve_entitlements_v2()
  TO service_role;

-- This deliberately outputs a canonical non-claimable bundle snapshot.
-- The Inbox bridge must later atomically credit XP/Companion Essence/Bondstones
-- as well as gold/items and Renown; no partial dispatch is permitted.
CREATE OR REPLACE FUNCTION private.party_event_reward_bundle_v2(
  p_difficulty text,p_band smallint,p_personal_points smallint,p_choice text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER
SET search_path='' AS $bundle$
DECLARE
  v_mult numeric;
  v_kind text;
  v_gold bigint;
  v_combat_xp bigint:=0;
  v_skill_xp bigint:=0;
  v_essence bigint:=0;
  v_bondstones integer:=0;
  v_renown integer:=0;
  v_materials jsonb:='{}'::jsonb;
BEGIN
  v_mult:=CASE p_difficulty
    WHEN 'standard' THEN 1::numeric
    WHEN 'veteran' THEN 1.2::numeric
    WHEN 'heroic' THEN 1.35::numeric
    ELSE NULL END;
  IF v_mult IS NULL OR p_band IS NULL OR p_band NOT BETWEEN 1 AND 6
    OR p_personal_points IS NULL OR p_personal_points NOT BETWEEN 5 AND 60
  THEN RAISE EXCEPTION 'PARTY_EVENT_INVALID_REWARD_SOURCE'; END IF;

  IF p_personal_points<15 THEN
    IF p_choice IS NOT NULL THEN
      RAISE EXCEPTION 'PARTY_EVENT_PARTICIPATION_HAS_NO_CACHE';
    END IF;
    v_kind:='participation';
    v_gold:=round((300+p_band*120)*v_mult);
  ELSE
    IF p_choice IS NULL OR p_choice NOT IN ('warrior','artisan','companion')
    THEN RAISE EXCEPTION 'PARTY_EVENT_INVALID_REWARD_CHOICE'; END IF;
    v_kind:=p_choice;
    v_gold:=round((1250+p_band*450)*v_mult);
    v_renown:=CASE p_difficulty
      WHEN 'standard' THEN 10 WHEN 'veteran' THEN 12 ELSE 14 END;
    CASE p_choice
      WHEN 'warrior' THEN
        v_combat_xp:=round((1300+p_band*350)*v_mult);
        v_materials:=jsonb_build_object('GEM_DUST',
          greatest(1,round(3+p_band*.7)));
      WHEN 'artisan' THEN
        v_skill_xp:=round((1800+p_band*450)*v_mult);
        v_materials:=jsonb_build_object('GEM_DUST',
          greatest(1,round(3+p_band*.7)));
      WHEN 'companion' THEN
        v_essence:=round((80+p_band*45)*v_mult);
        v_bondstones:=CASE WHEN p_band>=5 THEN 2
          WHEN p_band>=3 THEN 1 ELSE 0 END;
    END CASE;
  END IF;
  RETURN jsonb_build_object(
    'version','party-event-rewards-v2','kind',v_kind,
    'performanceBand',p_band,'personalPoints',p_personal_points,
    'gold',v_gold,'combatXp',v_combat_xp,'skillXp',v_skill_xp,
    'companionEssence',v_essence,'bondstones',v_bondstones,
    'partyRenown',v_renown,'materials',v_materials
  );
END $bundle$;
REVOKE ALL ON FUNCTION private.party_event_reward_bundle_v2(text,smallint,smallint,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_reward_bundle_v2(text,smallint,smallint,text)
  TO service_role;

CREATE OR REPLACE FUNCTION private.party_event_reward_choose_v2(
  p_event_id uuid,p_account_id uuid,p_choice text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $choose$
DECLARE
  v_reward private.party_weekly_event_reward_entitlements_v2%ROWTYPE;
  v_event private.party_weekly_event_instances_v2%ROWTYPE;
  v_bundle jsonb;
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM private.party_weekly_event_gate_v2
    WHERE id=1 AND enabled
  ) THEN RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED'; END IF;
  IF p_event_id IS NULL OR p_account_id IS NULL
  THEN RAISE EXCEPTION 'PARTY_EVENT_INVALID_CLAIM_IDENTITY'; END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended('party-event-reward:'||p_account_id::text,0)
  );
  SELECT * INTO v_event FROM private.party_weekly_event_instances_v2
    WHERE id=p_event_id FOR SHARE;
  IF NOT FOUND OR v_event.status<>'completed'
    OR NOT EXISTS(
      SELECT 1 FROM private.party_event_boss_results_v2
      WHERE event_id=p_event_id
    )
  THEN RAISE EXCEPTION 'PARTY_EVENT_REWARDS_NOT_FINALIZED'; END IF;
  SELECT * INTO v_reward FROM private.party_weekly_event_reward_entitlements_v2
    WHERE event_id=p_event_id AND account_id=p_account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARTY_EVENT_REWARD_NOT_ELIGIBLE'; END IF;

  IF v_reward.reward_payload IS NOT NULL THEN
    IF (v_reward.participation_only AND p_choice IS NOT NULL)
      OR (NOT v_reward.participation_only
        AND v_reward.choice IS DISTINCT FROM p_choice)
    THEN RAISE EXCEPTION 'PARTY_EVENT_REWARD_CHOICE_LOCKED'; END IF;
    RETURN jsonb_build_object('alreadyChosen',true,
      'bundle',v_reward.reward_payload,'status',v_reward.status);
  END IF;

  IF (v_reward.participation_only AND p_choice IS NOT NULL)
    OR (NOT v_reward.participation_only
      AND (p_choice IS NULL OR p_choice NOT IN ('warrior','artisan','companion')))
  THEN RAISE EXCEPTION 'PARTY_EVENT_INVALID_REWARD_CHOICE'; END IF;
  v_bundle:=private.party_event_reward_bundle_v2(
    v_event.difficulty,v_reward.boss_reward_band,
    v_reward.member_event_points,p_choice
  );
  UPDATE private.party_weekly_event_reward_entitlements_v2
    SET choice=p_choice,reward_payload=v_bundle,chosen_at=now()
    WHERE id=v_reward.id;
  RETURN jsonb_build_object('alreadyChosen',false,'bundle',v_bundle,
    'status','pending','inboxDelivered',false);
END $choose$;
REVOKE ALL ON FUNCTION private.party_event_reward_choose_v2(uuid,uuid,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_reward_choose_v2(uuid,uuid,text)
  TO service_role;

COMMENT ON FUNCTION private.party_event_reward_choose_v2(uuid,uuid,text) IS
  'Hidden service-only reward choice. Freezes one complete reward bundle; does not grant, send Inbox mail, or credit Renown.';
COMMIT;
