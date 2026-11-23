-- Veldryn 2.0 READ-ONLY boss source proof diagnostic; NOT a reward grant.
-- Intentionally NULL target: no user data is selected until a privileged caller
-- binds a verified entitlement UUID in a future separate, locked transaction.
-- Do NOT use this SELECT to authorize an item mint or Market listing.
-- Grounded in real 2026-11-23 production/staging PostgreSQL 17 columns.
WITH target AS (
  SELECT NULL::uuid AS entitlement_id
), authored_bosses(expedition_id, boss_content_id) AS (
  VALUES
    ('EXP_001'::text, 'BOSS_EXP_ROOT'::text),
    ('EXP_001', 'BOSS_EXP_BELL'),
    ('EXP_003', 'BOSS_EXP_SOLAR'),
    ('EXP_003', 'BOSS_EXP_SPHINX')
  -- EXP_005 and EXP_007 have source-authored bosses, but remain unpublished.
  -- Retired EXP_002, EXP_004, EXP_006, EXP_008 are always excluded.
), source_entitlement AS (
  SELECT
    e.id AS entitlement_id, e.run_id, e.recipient_account_id, e.character_id,
    e.claimed_at, r.expedition_id, r.completed_at, r.route_graph_json
  FROM public.coop_reward_entitlements e
  JOIN public.expedition_runs r ON r.id=e.run_id
  JOIN target t ON t.entitlement_id=e.id
  WHERE e.entitlement_kind='participant'
    AND e.reward_stage='final'
    AND e.recipient_account_id IS NOT NULL
    AND e.character_id IS NOT NULL
    AND e.claimed_at IS NOT NULL
    AND e.reward_json @> '{"enhanced_reward":true}'::jsonb
    AND r.status='completed'
    AND r.phase='completed'
    AND r.completed_at IS NOT NULL
    AND r.completed_at <= e.claimed_at
    AND r.expedition_id IN ('EXP_001','EXP_003')
    AND r.route_graph_json->>'runId'=r.id::text
    AND r.route_graph_json->>'expeditionId'=r.expedition_id
), graph_boss_nodes AS (
  SELECT e.*, n.value->>'nodeId' AS node_id,
         n.value->>'contentId' AS boss_content_id,
         (n.value->>'nodeId' = e.route_graph_json->>'bossNodeId') AS pointer_matches
  FROM source_entitlement e
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(e.route_graph_json->'nodes')='array'
         THEN e.route_graph_json->'nodes'
         ELSE '[]'::jsonb END
  ) AS n(value)
  WHERE n.value->>'kind'='boss'
), frozen_boss AS (
  SELECT entitlement_id, MIN(boss_content_id) AS boss_content_id,
         COUNT(DISTINCT boss_content_id) AS variant_count,
         COUNT(*) FILTER (WHERE pointer_matches) AS pointer_count
  FROM graph_boss_nodes
  GROUP BY entitlement_id
  HAVING COUNT(DISTINCT boss_content_id)=1
     AND COUNT(*) FILTER (WHERE pointer_matches)=1
), committed_victory AS (
  SELECT b.entitlement_id,b.run_id,b.recipient_account_id,b.character_id,
         b.expedition_id,b.boss_content_id,b.node_id,
         nr.result_json->>'eventDigest' AS event_digest,
         nr.committed_at
  FROM graph_boss_nodes b
  JOIN frozen_boss f
    ON f.entitlement_id=b.entitlement_id
   AND f.boss_content_id=b.boss_content_id
  JOIN authored_bosses a
    ON a.expedition_id=b.expedition_id
   AND a.boss_content_id=b.boss_content_id
  JOIN public.coop_node_results nr
    ON nr.run_id=b.run_id
   AND nr.node_id=b.node_id
  WHERE nr.success IS TRUE
    AND nr.result_json->>'kind'='combat'
    AND nr.result_json->>'reason'='victory'
    AND NULLIF(nr.result_json->>'eventDigest','') IS NOT NULL
    AND nr.committed_at <= b.completed_at
    AND nr.committed_at <= b.claimed_at
)
SELECT entitlement_id,run_id,recipient_account_id,character_id,
       expedition_id,boss_content_id,
       MIN(node_id) AS victorious_boss_node_id,
       MIN(event_digest) AS original_boss_event_digest
FROM committed_victory
GROUP BY entitlement_id,run_id,recipient_account_id,character_id,
         expedition_id,boss_content_id
HAVING COUNT(*)=1;
