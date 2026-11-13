-- UNDEPLOYED World Boss Leaderboards projection.
-- Event-specific history only. Never enables the overall Rankings feature.
-- Execute in a disposable/staging transaction; no automatic production migration.
BEGIN;

CREATE TABLE IF NOT EXISTS private.leaderboards_world_boss_gate_v1(
  id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO private.leaderboards_world_boss_gate_v1(id,enabled)
VALUES(1,false) ON CONFLICT(id) DO NOTHING;
ALTER TABLE private.leaderboards_world_boss_gate_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.leaderboards_world_boss_gate_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON private.leaderboards_world_boss_gate_v1 TO service_role;

-- Read only the server-finalized ranking snapshot. No client-provided damage,
-- no echo attempts, no speculative ranks before the event finishes.
CREATE OR REPLACE FUNCTION private.leaderboards_world_boss_event_v1(
  p_requester uuid,p_boss_id uuid,p_limit integer DEFAULT 50,p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $world_ranks$
DECLARE
  v_boss record;
  v_rows jsonb;
  v_self jsonb;
BEGIN
  IF p_requester IS NULL OR p_boss_id IS NULL OR p_limit IS NULL
    OR p_offset IS NULL OR p_limit NOT BETWEEN 1 AND 100
    OR p_offset NOT BETWEEN 0 AND 10000
  THEN RAISE EXCEPTION 'INVALID_WORLD_BOSS_RANKING_REQUEST'; END IF;
  IF NOT EXISTS(SELECT 1 FROM private.leaderboards_world_boss_gate_v1
    WHERE id=1 AND enabled)
  THEN RAISE EXCEPTION 'WORLD_BOSS_LEADERBOARDS_DISABLED'; END IF;
  SELECT b.id,b.name_snapshot,b.finalized_at INTO v_boss
  FROM public.shared_world_world_bosses b
  WHERE b.id=p_boss_id AND b.finalized_at IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'WORLD_BOSS_NOT_FINALIZED'; END IF;

  -- The original final_rank is event-global and intentionally not recalculated
  -- when private/blocked profiles are hidden. Gaps in rank are expected.
  WITH eligible AS (
    SELECT r.account_id,r.final_rank,r.raid_impact,r.applied_global_damage,
      r.valid_attempts,
      coalesce(nullif(btrim(r.display_name_snapshot),''),nullif(btrim(p.display_name),''),'Adventurer') AS display_name
    FROM public.shared_world_world_boss_final_ranks r
    JOIN public.player_profiles p ON p.account_id=r.account_id
    WHERE r.boss_id=p_boss_id AND r.valid_attempts>0 AND r.raid_impact>0
      AND p.profile_visibility='public'
      AND NOT EXISTS(SELECT 1 FROM public.player_blocks bl
        WHERE (bl.blocker_id=p_requester AND bl.blocked_id=r.account_id)
          OR (bl.blocker_id=r.account_id AND bl.blocked_id=p_requester))
  ), page AS (
    SELECT e.* FROM eligible e
    ORDER BY e.final_rank,e.account_id LIMIT p_limit OFFSET p_offset
  )
  SELECT
    coalesce((SELECT jsonb_agg(jsonb_build_object(
      'rank',pg.final_rank,'entityType','account',
      'displayName',pg.display_name,'value',pg.raid_impact,
      'secondaryValue',pg.applied_global_damage,
      'detail',concat(pg.valid_attempts,' scored attempts'),
      'isSelf',pg.account_id=p_requester)
      ORDER BY pg.final_rank,pg.account_id) FROM page pg),'[]'::jsonb),
    coalesce((SELECT jsonb_build_object(
      'listed',true,'rank',e.final_rank,'value',e.raid_impact,
      'secondaryValue',e.applied_global_damage)
      FROM eligible e WHERE e.account_id=p_requester LIMIT 1),
      jsonb_build_object('listed',false,'value',0))
    INTO v_rows,v_self;

  RETURN jsonb_build_object(
    'bossName',v_boss.name_snapshot,
    'bossId',p_boss_id,
    'finalizedAtMs',floor(extract(epoch from v_boss.finalized_at)*1000)::bigint,
    'generatedAtMs',floor(extract(epoch from clock_timestamp())*1000)::bigint,
    'entries',v_rows,'self',v_self,'prestigeOnly',true
  );
END $world_ranks$;
REVOKE ALL ON FUNCTION private.leaderboards_world_boss_event_v1(uuid,uuid,integer,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.leaderboards_world_boss_event_v1(uuid,uuid,integer,integer)
  TO service_role;
COMMIT;
