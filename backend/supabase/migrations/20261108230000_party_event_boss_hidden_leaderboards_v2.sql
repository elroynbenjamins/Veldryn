-- Hidden Party Events v2: build leaderboard rows only from trusted, committed
-- Day 8 boss results. No player-visible grants, APIs, views or schedulers.
BEGIN;

-- Separate gate from Party Events. Even a future boss rollout must not expose
-- rankings until the full Leaderboards feature has been implemented.
CREATE TABLE IF NOT EXISTS private.party_event_leaderboard_gate_v2 (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id=1),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO private.party_event_leaderboard_gate_v2(id,enabled)
VALUES(1,false) ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS private.party_event_boss_leaderboard_entries_v2 (
  event_id uuid PRIMARY KEY
    REFERENCES private.party_event_boss_results_v2(event_id) ON DELETE RESTRICT,
  party_id uuid NOT NULL REFERENCES public.parties(id),
  -- Stable at settlement: existing public.parties has no name column yet.
  -- Use a leader-based party label until the actual naming feature exists.
  party_name text NOT NULL CHECK(length(party_name) BETWEEN 1 AND 64),
  event_starts_at timestamptz NOT NULL,
  difficulty text NOT NULL CHECK(difficulty IN ('standard','veteran','heroic')),
  family text NOT NULL CHECK(family IN
    ('broken_caravan','nightfall_hunt','broken_wards','lost_reliquary')),
  party_size smallint NOT NULL CHECK(party_size BETWEEN 2 AND 4),
  tiers_cleared smallint NOT NULL CHECK(tiers_cleared BETWEEN 0 AND 12),
  highest_tier smallint NOT NULL CHECK(highest_tier BETWEEN 1 AND 12),
  boss_damage numeric(18,2) NOT NULL CHECK(boss_damage >= 0),
  team_healing numeric(18,2) NOT NULL CHECK(team_healing >= 0),
  team_shielding numeric(18,2) NOT NULL CHECK(team_shielding >= 0),
  team_absorbed numeric(18,2) NOT NULL CHECK(team_absorbed >= 0),
  team_interrupts integer NOT NULL CHECK(team_interrupts >= 0),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK(tiers_cleared <= highest_tier)
);
CREATE INDEX IF NOT EXISTS party_event_boss_leaderboard_scope_v2
  ON private.party_event_boss_leaderboard_entries_v2(
    event_starts_at,difficulty,party_size,boss_damage DESC
  );
CREATE INDEX IF NOT EXISTS party_event_boss_leaderboard_depth_v2
  ON private.party_event_boss_leaderboard_entries_v2(
    event_starts_at,difficulty,tiers_cleared DESC
  );

ALTER TABLE private.party_event_leaderboard_gate_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.party_event_boss_leaderboard_entries_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.party_event_leaderboard_gate_v2,
  private.party_event_boss_leaderboard_entries_v2 FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.party_event_leaderboard_gate_v2,
  private.party_event_boss_leaderboard_entries_v2 TO service_role;

-- Project ONE historical entry for a settled event, in the SAME transaction
-- as inserting the authoritative boss result. No client may set scores/names.
CREATE OR REPLACE FUNCTION private.party_event_boss_project_leaderboard_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $project$
DECLARE
  v_event private.party_weekly_event_instances_v2%ROWTYPE;
  v_leader_name text;
  v_party_label text;
  v_healing numeric(18,2);
  v_shielding numeric(18,2);
  v_absorbed numeric(18,2);
  v_interrupts numeric(18,0);
  v_invalid_count integer;
BEGIN
  SELECT * INTO v_event FROM private.party_weekly_event_instances_v2
  WHERE id=NEW.event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARTY_LEADERBOARD_EVENT_MISSING'; END IF;

  SELECT c.name INTO v_leader_name
  FROM public.parties p
  LEFT JOIN public.characters c ON c.id=p.leader_character_id
  WHERE p.id=v_event.party_id;
  v_party_label:=CASE
    WHEN nullif(btrim(v_leader_name),'') IS NOT NULL
      THEN left(btrim(v_leader_name),46)||'''s Party'
    ELSE 'Unnamed Party'
  END;

  IF jsonb_typeof(NEW.result_json->'contributions')<>'array'
    OR jsonb_array_length(NEW.result_json->'contributions')<>NEW.frozen_roster_count
  THEN RAISE EXCEPTION 'PARTY_LEADERBOARD_INVALID_CONTRIBUTIONS'; END IF;

  SELECT
    count(*) FILTER(WHERE
      jsonb_typeof(x.value)<>'object'
      OR jsonb_typeof(x.value->'damage')<>'number'
      OR jsonb_typeof(x.value->'healing')<>'number'
      OR jsonb_typeof(x.value->'shielding')<>'number'
      OR jsonb_typeof(x.value->'absorbedDamage')<>'number'
      OR jsonb_typeof(x.value->'interrupts')<>'number'
    )
  INTO v_invalid_count
  FROM jsonb_array_elements(NEW.result_json->'contributions') x;
  IF v_invalid_count>0 THEN
    RAISE EXCEPTION 'PARTY_LEADERBOARD_INVALID_CONTRIBUTIONS';
  END IF;

  SELECT
    coalesce(sum((x.value->>'healing')::numeric),0),
    coalesce(sum((x.value->>'shielding')::numeric),0),
    coalesce(sum((x.value->>'absorbedDamage')::numeric),0),
    coalesce(sum((x.value->>'interrupts')::numeric),0)
  INTO v_healing,v_shielding,v_absorbed,v_interrupts
  FROM jsonb_array_elements(NEW.result_json->'contributions') x;

  IF v_healing<0 OR v_shielding<0 OR v_absorbed<0 OR v_interrupts<0
    OR v_interrupts<>trunc(v_interrupts)
  THEN RAISE EXCEPTION 'PARTY_LEADERBOARD_INVALID_METRICS'; END IF;

  INSERT INTO private.party_event_boss_leaderboard_entries_v2(
    event_id,party_id,party_name,event_starts_at,difficulty,family,
    party_size,tiers_cleared,highest_tier,boss_damage,
    team_healing,team_shielding,team_absorbed,team_interrupts,recorded_at
  ) VALUES(
    NEW.event_id,v_event.party_id,v_party_label,v_event.starts_at,
    v_event.difficulty,v_event.family,NEW.frozen_roster_count,
    NEW.tiers_cleared,NEW.highest_tier,NEW.boss_damage,
    v_healing,v_shielding,v_absorbed,v_interrupts,NEW.resolved_at
  );
  RETURN NEW;
END $project$;
DROP TRIGGER IF EXISTS party_event_boss_project_leaderboard_v2
  ON private.party_event_boss_results_v2;
CREATE TRIGGER party_event_boss_project_leaderboard_v2
AFTER INSERT ON private.party_event_boss_results_v2
FOR EACH ROW EXECUTE FUNCTION private.party_event_boss_project_leaderboard_v2();
REVOKE ALL ON FUNCTION private.party_event_boss_project_leaderboard_v2()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_boss_project_leaderboard_v2()
  TO service_role;

-- Future Leaderboards integration may call this server-only query AFTER the
-- independent leaderboard release gate is enabled. Scores are partitioned
-- by event/difficulty and optionally 2-,3-,4-person roster for fair comparison.
CREATE OR REPLACE FUNCTION private.party_event_boss_rankings_v2(
  p_event_starts_at timestamptz,p_difficulty text,p_metric text,
  p_party_size smallint DEFAULT NULL,p_limit integer DEFAULT 50
) RETURNS TABLE(
  rank bigint,event_id uuid,party_id uuid,party_name text,
  family text,party_size smallint,tiers_cleared smallint,
  boss_damage numeric,team_support numeric,team_absorbed numeric,
  team_interrupts integer,score numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $rankings$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM private.party_event_leaderboard_gate_v2
    WHERE id=1 AND enabled
  ) THEN RAISE EXCEPTION 'PARTY_EVENT_LEADERBOARDS_DISABLED'; END IF;
  IF p_event_starts_at IS NULL
    OR p_difficulty NOT IN ('standard','veteran','heroic')
    OR p_difficulty IS NULL
    OR p_metric NOT IN ('damage','depth','support','shielding','mechanics')
    OR p_metric IS NULL
    OR (p_party_size IS NOT NULL AND p_party_size NOT BETWEEN 2 AND 4)
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
  THEN RAISE EXCEPTION 'PARTY_LEADERBOARD_INVALID_QUERY'; END IF;

  RETURN QUERY WITH scored AS (
    SELECT e.*,
      CASE p_metric
        WHEN 'damage' THEN e.boss_damage
        WHEN 'depth' THEN e.tiers_cleared::numeric
        WHEN 'support' THEN e.team_healing+e.team_shielding
        WHEN 'shielding' THEN e.team_shielding+e.team_absorbed
        ELSE e.team_interrupts::numeric
      END AS metric_score
    FROM private.party_event_boss_leaderboard_entries_v2 e
    WHERE e.event_starts_at=p_event_starts_at
      AND e.difficulty=p_difficulty
      AND (p_party_size IS NULL OR e.party_size=p_party_size)
  ), ranked AS (
    SELECT s.*,rank() OVER (ORDER BY s.metric_score DESC) AS score_rank
    FROM scored s
  )
  SELECT r.score_rank,r.event_id,r.party_id,r.party_name,
    r.family,r.party_size,r.tiers_cleared,r.boss_damage,
    r.team_healing+r.team_shielding,r.team_absorbed,r.team_interrupts,
    r.metric_score
  FROM ranked r
  ORDER BY r.metric_score DESC,r.tiers_cleared DESC,r.boss_damage DESC,
    r.recorded_at ASC,r.event_id ASC
  LIMIT p_limit;
END $rankings$;
REVOKE ALL ON FUNCTION private.party_event_boss_rankings_v2(
  timestamptz,text,text,smallint,integer
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_boss_rankings_v2(
  timestamptz,text,text,smallint,integer
) TO service_role;

COMMENT ON TABLE private.party_event_leaderboard_gate_v2 IS
  'Independent private leaderboard release gate. Keep FALSE until global Leaderboards are implemented.';
COMMENT ON TABLE private.party_event_boss_leaderboard_entries_v2 IS
  'Historical Day 8 party-name ranking snapshots. Not player-visible; only from trusted boss-result trigger.';
COMMIT;
