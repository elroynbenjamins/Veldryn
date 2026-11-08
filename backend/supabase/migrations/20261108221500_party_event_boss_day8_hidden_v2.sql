-- Hidden Party Events v2: durable loadout snapshots and Day 8 boss results.
-- No public grants, automatic jobs, payout RPCs, or live feature enablement.
BEGIN;

CREATE TABLE IF NOT EXISTS private.party_event_boss_loadouts_v2(
  event_id uuid NOT NULL REFERENCES private.party_weekly_event_instances_v2(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id),
  loadout_id text NOT NULL CHECK(length(loadout_id) BETWEEN 1 AND 120),
  revision integer NOT NULL CHECK(revision>=0),
  snapshot_hash text NOT NULL CHECK(snapshot_hash ~ '^[a-f0-9]{64}$'),
  snapshot_json jsonb NOT NULL CHECK (
    jsonb_typeof(snapshot_json)='object' AND
    octet_length(snapshot_json::text) BETWEEN 128 AND 131072
  ),
  saved_at timestamptz NOT NULL DEFAULT now(),
  frozen_at timestamptz,
  PRIMARY KEY(event_id,account_id),
  UNIQUE(event_id,character_id),
  FOREIGN KEY(event_id,account_id)
    REFERENCES private.party_weekly_event_members_v2(event_id,account_id)
);
CREATE INDEX IF NOT EXISTS party_event_boss_loadout_by_event_v2
  ON private.party_event_boss_loadouts_v2(event_id,frozen_at);

CREATE TABLE IF NOT EXISTS private.party_event_boss_results_v2(
  event_id uuid PRIMARY KEY REFERENCES private.party_weekly_event_instances_v2(id) ON DELETE RESTRICT,
  result_version text NOT NULL DEFAULT 'day8-boss-v1'
    CHECK(result_version='day8-boss-v1'),
  resolved_at timestamptz NOT NULL DEFAULT now(),
  frozen_roster_count smallint NOT NULL CHECK(frozen_roster_count BETWEEN 2 AND 4),
  highest_tier smallint NOT NULL CHECK(highest_tier BETWEEN 1 AND 12),
  tiers_cleared smallint NOT NULL CHECK(tiers_cleared BETWEEN 0 AND 12),
  reward_band smallint NOT NULL CHECK(reward_band BETWEEN 1 AND 6),
  boss_damage numeric(18,2) NOT NULL CHECK(boss_damage>=0),
  result_json jsonb NOT NULL CHECK(
    jsonb_typeof(result_json)='object' AND
    octet_length(result_json::text) BETWEEN 100 AND 131072
  )
);
ALTER TABLE private.party_event_boss_loadouts_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.party_event_boss_results_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.party_event_boss_loadouts_v2,
  private.party_event_boss_results_v2 FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.party_event_boss_loadouts_v2,
  private.party_event_boss_results_v2 TO service_role;

-- Committing a verified snapshot can be repeated/updated during the event.
-- It is never treated as a client-side arbitrary stat payload. Only a backend
-- service that looked up the real equipment, class and ability state may call.
CREATE OR REPLACE FUNCTION private.party_event_boss_save_loadout_v2(
  p_event_id uuid,p_account_id uuid,p_character_id uuid,
  p_loadout_id text,p_revision integer,p_snapshot_hash text,p_snapshot jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $save$
DECLARE
  v_event private.party_weekly_event_instances_v2%ROWTYPE;
  v_saved private.party_event_boss_loadouts_v2%ROWTYPE;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM private.party_weekly_event_gate_v2
    WHERE id=1 AND enabled) THEN
    RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED';
  END IF;
  IF p_event_id IS NULL OR p_account_id IS NULL OR p_character_id IS NULL
     OR p_loadout_id IS NULL OR length(p_loadout_id) NOT BETWEEN 1 AND 120
     OR p_revision IS NULL OR p_revision<0
     OR p_snapshot_hash IS NULL OR p_snapshot_hash !~ '^[a-f0-9]{64}$'
     OR p_snapshot IS NULL OR jsonb_typeof(p_snapshot)<>'object'
     OR octet_length(p_snapshot::text) NOT BETWEEN 128 AND 131072
  THEN RAISE EXCEPTION 'PARTY_EVENT_INVALID_LOADOUT'; END IF;

  SELECT * INTO v_event FROM private.party_weekly_event_instances_v2
  WHERE id=p_event_id FOR UPDATE;
  IF NOT FOUND OR v_event.status<>'active'
    OR now()<v_event.starts_at OR now()>=v_event.ends_at
  THEN RAISE EXCEPTION 'PARTY_EVENT_LOADOUT_SAVE_CLOSED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM private.party_weekly_event_members_v2 m
    WHERE m.event_id=p_event_id AND m.account_id=p_account_id)
    OR NOT EXISTS(SELECT 1 FROM public.characters c
      WHERE c.id=p_character_id AND c.account_id=p_account_id)
  THEN RAISE EXCEPTION 'PARTY_EVENT_LOADOUT_NOT_OWNED'; END IF;

  -- Shape checks prevent accidental ingestion of arbitrary, partial player
  -- payloads. Cryptographic verification is done by the trusted TS service.
  IF p_snapshot->>'accountId' IS DISTINCT FROM p_account_id::text
    OR p_snapshot->>'characterId' IS DISTINCT FROM p_character_id::text
    OR p_snapshot->>'loadoutId' IS DISTINCT FROM p_loadout_id
    OR p_snapshot->>'snapshotHash' IS DISTINCT FROM p_snapshot_hash
    OR p_snapshot->>'revision' IS DISTINCT FROM p_revision::text
    OR p_snapshot#>>'{actor,id}' IS DISTINCT FROM p_character_id::text
    OR p_snapshot#>>'{actor,team}' IS DISTINCT FROM 'players'
    OR p_snapshot#>>'{actor,role}' NOT IN ('tank','support','damage')
    OR jsonb_typeof(p_snapshot#>'{actor,stats}')<>'object'
    OR jsonb_typeof(p_snapshot#>'{actor,abilities}')<>'array'
    OR jsonb_typeof(p_snapshot->'savedAtMs')<>'number'
  THEN RAISE EXCEPTION 'PARTY_EVENT_INVALID_FROZEN_SNAPSHOT'; END IF;
  IF abs((p_snapshot->>'savedAtMs')::numeric
    - extract(epoch FROM now())*1000)>120000
  THEN RAISE EXCEPTION 'PARTY_EVENT_LOADOUT_TIMESTAMP_INVALID'; END IF;

  SELECT * INTO v_saved FROM private.party_event_boss_loadouts_v2
    WHERE event_id=p_event_id AND account_id=p_account_id FOR UPDATE;
  IF FOUND AND v_saved.frozen_at IS NOT NULL THEN
    RAISE EXCEPTION 'PARTY_EVENT_LOADOUT_FROZEN';
  END IF;
  INSERT INTO private.party_event_boss_loadouts_v2(
    event_id,account_id,character_id,loadout_id,revision,snapshot_hash,snapshot_json
  ) VALUES(
    p_event_id,p_account_id,p_character_id,p_loadout_id,p_revision,
    p_snapshot_hash,p_snapshot
  ) ON CONFLICT(event_id,account_id) DO UPDATE SET
    character_id=excluded.character_id,loadout_id=excluded.loadout_id,
    revision=excluded.revision,snapshot_hash=excluded.snapshot_hash,
    snapshot_json=excluded.snapshot_json,saved_at=now();
  RETURN jsonb_build_object('eventId',p_event_id,'accountId',p_account_id,
    'saved',true,'snapshotHash',p_snapshot_hash);
END $save$;
REVOKE ALL ON FUNCTION private.party_event_boss_save_loadout_v2(
  uuid,uuid,uuid,text,integer,text,jsonb
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_boss_save_loadout_v2(
  uuid,uuid,uuid,text,integer,text,jsonb
) TO service_role;

-- Freeze all saved loadouts in one event transaction. This is called after
-- the seven-day period and the one-hour server settlement grace. No player is
-- required to log in on Day 8. An event with fewer than two saved actors must
-- be retried after its missing default snapshots are repaired server-side.
CREATE OR REPLACE FUNCTION private.party_event_boss_lock_roster_v2(
  p_event_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $lock$
DECLARE
  v_event private.party_weekly_event_instances_v2%ROWTYPE;
  v_count integer;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM private.party_weekly_event_gate_v2
    WHERE id=1 AND enabled) THEN
    RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED';
  END IF;
  SELECT * INTO v_event FROM private.party_weekly_event_instances_v2
    WHERE id=p_event_id FOR UPDATE;
  IF NOT FOUND OR v_event.status<>'active'
    OR now()<v_event.ends_at+interval '1 hour' THEN
    RAISE EXCEPTION 'PARTY_EVENT_DAY_EIGHT_NOT_READY';
  END IF;
  SELECT count(*) INTO v_count FROM private.party_event_boss_loadouts_v2
    WHERE event_id=p_event_id;
  IF v_count NOT BETWEEN 2 AND 4 THEN
    RAISE EXCEPTION 'PARTY_EVENT_INSUFFICIENT_SAVED_LOADOUTS';
  END IF;
  UPDATE private.party_event_boss_loadouts_v2
    SET frozen_at=coalesce(frozen_at,now()) WHERE event_id=p_event_id;
  RETURN (
    SELECT jsonb_build_object('eventId',p_event_id,'frozen',true,
      'roster',jsonb_agg(l.snapshot_json ORDER BY l.account_id))
    FROM private.party_event_boss_loadouts_v2 l
    WHERE l.event_id=p_event_id
  );
END $lock$;
REVOKE ALL ON FUNCTION private.party_event_boss_lock_roster_v2(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_boss_lock_roster_v2(uuid)
  TO service_role;

-- The trusted backend computes the deterministic fight using frozen actors
-- and consumed supply receipts, then stores its authoritative summary here.
-- This only stores a result; reward/inbox credit is a DIFFERENT, not-yet-built
-- idempotent settlement path and cannot be inferred from this row.
CREATE OR REPLACE FUNCTION private.party_event_boss_record_result_v2(
  p_event_id uuid,p_result jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $result$
DECLARE
  v_event private.party_weekly_event_instances_v2%ROWTYPE;
  v_existing private.party_event_boss_results_v2%ROWTYPE;
  v_count integer;
  v_cleared integer;
  v_reached integer;
  v_band integer;
  v_damage numeric;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM private.party_weekly_event_gate_v2
    WHERE id=1 AND enabled) THEN
    RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED';
  END IF;
  SELECT * INTO v_event FROM private.party_weekly_event_instances_v2
    WHERE id=p_event_id FOR UPDATE;
  IF NOT FOUND OR now()<v_event.ends_at+interval '1 hour' THEN
    RAISE EXCEPTION 'PARTY_EVENT_DAY_EIGHT_NOT_READY';
  END IF;
  SELECT * INTO v_existing FROM private.party_event_boss_results_v2
    WHERE event_id=p_event_id FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object('alreadyRecorded',true,'eventId',p_event_id,
      'rewardBand',v_existing.reward_band);
  END IF;
  IF v_event.status<>'active' OR p_result IS NULL
    OR jsonb_typeof(p_result)<>'object'
    OR octet_length(p_result::text) NOT BETWEEN 100 AND 131072
    OR jsonb_typeof(p_result->'contributions')<>'array'
    OR jsonb_typeof(p_result->'tiers')<>'array'
  THEN RAISE EXCEPTION 'PARTY_EVENT_BOSS_INVALID_RESULT'; END IF;

  SELECT count(*) INTO v_count FROM private.party_event_boss_loadouts_v2
    WHERE event_id=p_event_id AND frozen_at IS NOT NULL;
  IF v_count NOT BETWEEN 2 AND 4
    OR jsonb_array_length(p_result->'contributions')<>v_count
  THEN RAISE EXCEPTION 'PARTY_EVENT_BOSS_ROSTER_MISMATCH'; END IF;

  v_cleared:=(p_result->>'tiersCleared')::integer;
  v_reached:=(p_result->>'highestTierReached')::integer;
  v_band:=(p_result->>'rewardBand')::integer;
  v_damage:=(p_result->>'totalBossDamage')::numeric;
  IF v_reached NOT BETWEEN 1 AND 12 OR v_cleared NOT BETWEEN 0 AND 12
     OR v_cleared>v_reached OR v_band NOT BETWEEN 1 AND 6
     OR v_damage<0 OR jsonb_array_length(p_result->'tiers')<>v_reached
  THEN RAISE EXCEPTION 'PARTY_EVENT_BOSS_OUTCOME_OUT_OF_RANGE'; END IF;

  INSERT INTO private.party_event_boss_results_v2(
    event_id,frozen_roster_count,highest_tier,tiers_cleared,
    reward_band,boss_damage,result_json
  ) VALUES (p_event_id,v_count,v_reached,v_cleared,v_band,v_damage,p_result);
  UPDATE private.party_weekly_event_instances_v2
    SET status='completed',completed_at=now(),
      finale_cleared_at=CASE WHEN v_cleared>0 THEN now() ELSE null END
    WHERE id=p_event_id;
  RETURN jsonb_build_object('alreadyRecorded',false,'eventId',p_event_id,
    'rewardBand',v_band,'tiersCleared',v_cleared,'damage',v_damage);
END $result$;
REVOKE ALL ON FUNCTION private.party_event_boss_record_result_v2(uuid,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_boss_record_result_v2(uuid,jsonb)
  TO service_role;
COMMIT;