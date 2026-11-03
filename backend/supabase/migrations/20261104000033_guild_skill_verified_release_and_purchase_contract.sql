-- VELDRYN Guild Skills: release verified consumers only.
-- Live production and staging were activated on 2026-11-03 after contract checks.
-- This migration is idempotent and is retained so new environments receive the same safe state.
-- Keep Fellowship Quests and all three Vanguard skills unreleased pending consumer verification.
-- Avoid a blanket UPDATE to all nine until those effects are authoritative.
DO $guild_skill_contract$
DECLARE source_sql text; patched_sql text;
BEGIN
 SELECT pg_get_functiondef('public.guild_skill_upgrade_server_v1(uuid,text,text)'::regprocedure) INTO source_sql;
 IF position('''rank'',v_current+1,''costs'',(select coalesce(jsonb_agg(jsonb_build_object(''resourceId'',key,''amount'',value::integer) order by key),''[]''::jsonb) from jsonb_each_text(v_costs))' in source_sql) = 0 THEN
  IF position('return jsonb_build_object(''alreadyProcessed'',true,''skillId'',p_skill_id,''rank'',v_prior.to_rank);' in source_sql)=0 OR position('''rank'',v_current+1,''costs'',v_costs' in source_sql)=0
   THEN RAISE EXCEPTION 'guild_skill_purchase_contract_unexpected_source'; END IF;
  patched_sql := replace(source_sql,'return jsonb_build_object(''alreadyProcessed'',true,''skillId'',p_skill_id,''rank'',v_prior.to_rank);','return jsonb_build_object(''alreadyProcessed'',true,''skillId'',p_skill_id,''rank'',v_prior.to_rank,''costs'',(select coalesce(jsonb_agg(jsonb_build_object(''resourceId'',key,''amount'',value::integer) order by key),''[]''::jsonb) from jsonb_each_text(v_prior.costs)));');
  patched_sql := replace(patched_sql,'''rank'',v_current+1,''costs'',v_costs','''rank'',v_current+1,''costs'',(select coalesce(jsonb_agg(jsonb_build_object(''resourceId'',key,''amount'',value::integer) order by key),''[]''::jsonb) from jsonb_each_text(v_costs))');
  patched_sql := replace(patched_sql,'guild_skill_officer_required','guild_skill_not_leader');
  patched_sql := replace(patched_sql,'guild_skill_points_exhausted','insufficient_skill_points');
  patched_sql := replace(patched_sql,'guild_skill_bank_materials_missing','insufficient_guild_bank_materials');
  EXECUTE patched_sql;
 END IF;
END $guild_skill_contract$;
DO $release_verified_guild_skills$
DECLARE total integer; active integer; promoted integer;
BEGIN
 SELECT count(*),count(*) FILTER(where is_released) INTO total,active FROM public.guild_skill_catalogue_v1;
 IF total<>9 OR active NOT IN (0,5) THEN RAISE EXCEPTION 'unexpected_guild_skill_release_state: %, %',total,active; END IF;
 IF to_regprocedure('public.guild_member_cap_effective_server_v1(uuid)') IS NULL
  OR to_regprocedure('public.credit_guild_project_effort_v2(uuid,uuid,jsonb,timestamptz)') IS NULL
 THEN RAISE EXCEPTION 'guild_skill_effect_consumers_missing'; END IF;
 IF position('guildProjectEfficiencyBps' in pg_get_functiondef('public.credit_guild_project_effort_v2(uuid,uuid,jsonb,timestamptz)'::regprocedure))=0
 THEN RAISE EXCEPTION 'guild_projects_skill_consumer_missing'; END IF;
 IF position('fellowship_membership' in pg_get_functiondef('public.guild_member_cap_effective_server_v1(uuid)'::regprocedure))=0
 THEN RAISE EXCEPTION 'guild_member_skill_consumer_missing'; END IF;
 UPDATE public.guild_skill_catalogue_v1 SET is_released=true
 WHERE skill_id IN ('professions_gathering','professions_crafting','professions_mastery','fellowship_membership','fellowship_projects')
 AND is_released=false;
 GET DIAGNOSTICS promoted=ROW_COUNT;
 IF promoted<>5 AND NOT (promoted=0 AND active=5) THEN RAISE EXCEPTION 'guild_skill_release_count_mismatch: %',promoted; END IF;
 IF EXISTS (SELECT 1 FROM public.guild_skill_catalogue_v1
 WHERE skill_id IN ('fellowship_quests','vanguard_boss','vanguard_defence','vanguard_support') AND is_released)
 THEN RAISE EXCEPTION 'unverified_guild_skills_must_remain_held'; END IF;
END $release_verified_guild_skills$;
