-- Promote the four previously gated Guild Skills ONLY after verifying each
-- authoritative consumer. Existing five live Guild Skills are unchanged.
-- This intentionally does not modify Android app_release_policy.
-- Release requires the gameplay Edge client fix in the new Android 1.0.6 app.
DO $release_verified_guild_skill_consumers$
DECLARE
  v_missing text;
  v_source text;
  v_new_count integer;
  v_skill_id text;
  v_required text[] := ARRAY[
    'fellowship_quests','vanguard_boss','vanguard_defence','vanguard_support'
  ];
BEGIN
  -- Exactly nine canonical nodes, three ranks, and two material costs per rank.
  IF (SELECT count(*) FROM public.guild_skill_catalogue_v1) <> 9
    OR (SELECT count(*) FROM public.guild_skill_catalogue_v1
         WHERE max_rank <> 3) <> 0
  THEN RAISE EXCEPTION 'guild_skill_catalogue_unexpected'; END IF;
  IF (SELECT count(*) FROM public.guild_skill_rank_costs_v1
        WHERE skill_id = ANY(v_required)) <> 24
    OR EXISTS (
      SELECT 1 FROM unnest(v_required) AS skill(skill_id)
      CROSS JOIN generate_series(1,3) AS rank(rank)
      LEFT JOIN public.guild_skill_rank_costs_v1 c
        ON c.skill_id=skill.skill_id AND c.rank=rank.rank
      GROUP BY skill.skill_id,rank.rank HAVING count(c.resource_id)<>2
    )
  THEN RAISE EXCEPTION 'guild_skill_rank_costs_incomplete'; END IF;

  -- Never release an unverified display-only node or an unexpectedly
  -- gated/removed skill. All other five must already be live.
  IF (SELECT count(*) FROM public.guild_skill_catalogue_v1
      WHERE skill_id NOT IN (SELECT unnest(v_required)) AND is_released)<>5
  THEN RAISE EXCEPTION 'existing_guild_skill_release_set_unexpected'; END IF;

  -- Both read and purchase routes require actual released flags and role,
  -- rank, points, bank and retry guards inside the authoritative RPCs.
  v_source:=pg_get_functiondef('public.guild_skill_upgrade_server_v1(uuid,text,text)'::regprocedure);
  IF position('guild_skill_not_released' in v_source)=0
     OR position('guild_skill_not_leader' in v_source)=0
     OR position('insufficient_skill_points' in v_source)=0
     OR position('insufficient_guild_bank_materials' in v_source)=0
     OR position('guild_skill_upgrade_receipts_v1' in v_source)=0
  THEN RAISE EXCEPTION 'guild_skill_purchase_authority_missing'; END IF;
  v_source:=pg_get_functiondef('public.guild_skill_effects_server_v1(uuid)'::regprocedure);
  IF position('c.is_released' in v_source)=0
     OR position('guildQuestRewardBps' in v_source)=0
     OR position('guildBossDamageBps' in v_source)=0
     OR position('guildDefenceBps' in v_source)=0
     OR position('guildSupportBps' in v_source)=0
  THEN RAISE EXCEPTION 'guild_skill_projection_missing'; END IF;
  v_source:=pg_get_functiondef('public.guild_bank_deposit_server_v1(uuid,text,integer,text)'::regprocedure);
  IF position('c.is_released' in v_source)=0
  THEN RAISE EXCEPTION 'guild_bank_deposit_skill_gate_missing'; END IF;
  v_source:=pg_get_functiondef('public.guild_bank_required_resources_guard_v1()'::regprocedure);
  IF position('skill.is_released' in v_source)=0
  THEN RAISE EXCEPTION 'guild_bank_skill_demand_guard_missing'; END IF;

  -- Fellowship Quests adds the bonus to original, immutable Guild Activity
  -- completion receipts. Past rewards must never retroactively increase.
  v_source:=pg_get_functiondef('public.guild_quest_reward_units_server_v1(uuid,text)'::regprocedure);
  IF position('fellowship_quests' in v_source)=0
     OR position('c.is_released' in v_source)=0
  THEN RAISE EXCEPTION 'guild_quest_bonus_not_gated'; END IF;
  v_source:=pg_get_functiondef('public.guild_quest_state_v1()'::regprocedure);
  IF position('guild_quest_reward_units_server_v1' in v_source)=0
     OR position('guild_quest_completions' in v_source)=0
     OR position('activity_units' in v_source)=0
  THEN RAISE EXCEPTION 'guild_quest_actual_credit_consumer_missing'; END IF;
  IF private.guild_skill_apply_bonus_units_v1(25,200)<>26
     OR private.guild_skill_apply_bonus_units_v1(60,400)<>62
     OR private.guild_skill_apply_bonus_units_v1(135,600)<>143
  THEN RAISE EXCEPTION 'guild_quest_bonus_rounding_changed'; END IF;

  -- Vanguard applies all three skills in the real server-validated
  -- three-minute raid attempt. Defence boosts the HP+Defence contribution,
  -- not imaginary incoming mitigation; Support boosts only actual
  -- companion contribution. Both attempt caps remain authoritative.
  v_source:=pg_get_functiondef('public.attempt_guild_pve_v3(uuid,text)'::regprocedure);
  IF position('guild_skill_effects_server_v1' in v_source)=0
     OR position('v_guild_boss_bps' in v_source)=0
     OR position('v_guild_defence_bps' in v_source)=0
     OR position('v_guild_support_bps' in v_source)=0
     OR position('v_companion_id is null' in v_source)=0
     OR position('PERSONAL_DAMAGE_CAP_REACHED' in v_source)=0
     OR position('guild_boss_bonus_bps' in v_source)=0
     OR position('guild_defence_bonus_bps' in v_source)=0
     OR position('guild_support_bonus_bps' in v_source)=0
  THEN RAISE EXCEPTION 'guild_vanguard_actual_attempt_consumer_missing'; END IF;
  v_source:=pg_get_functiondef('public.guild_pve_attempt_timeline_v1(uuid)'::regprocedure);
  IF position('guildBossDamageBps' in v_source)=0
     OR position('guildDefenceBps' in v_source)=0
     OR position('guildSupportBps' in v_source)=0
  THEN RAISE EXCEPTION 'guild_vanguard_immutable_attempt_receipts_missing'; END IF;
  IF (SELECT count(*) FROM information_schema.columns
       WHERE table_schema='public' AND table_name='guild_pve_attempts_v3'
         AND column_name IN ('guild_boss_bonus_bps',
             'guild_defence_bonus_bps','guild_support_bonus_bps'))<>3
  THEN RAISE EXCEPTION 'guild_vanguard_attempt_columns_missing'; END IF;

  -- Atomic promotion; repeatable and safe for staging/release retries.
  UPDATE public.guild_skill_catalogue_v1 SET is_released=true
    WHERE skill_id=ANY(v_required) AND NOT is_released;
  GET DIAGNOSTICS v_new_count=ROW_COUNT;
  IF (SELECT count(*) FROM public.guild_skill_catalogue_v1
       WHERE is_released)<>9
  THEN RAISE EXCEPTION 'guild_skill_release_all_nine_failed'; END IF;
  RAISE NOTICE 'Guild Skills released: % newly activated; 9 of 9 verified',v_new_count;
END
$release_verified_guild_skill_consumers$;
