-- STAGING-ONLY transactional regression fixture for Guild Engineering (no persistent writes).
-- Run with privileged SQL access in a staging database with an auth user and templates.
-- The entire fixture, including Guild Token claims and wallet changes, is rolled back.
BEGIN;
DO $guild_engineering_polish_test$
DECLARE
 v_user uuid; v_guild uuid; v_project uuid; v_template record;
 v_week timestamptz := date_trunc('week',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 v_complete timestamptz := now() - interval '5 minutes';
 v_claimed timestamptz := now() - interval '15 minutes';
 v_amount bigint;v_snapshot jsonb;v_rank integer;
BEGIN
 SELECT id INTO v_user FROM auth.users ORDER BY created_at LIMIT 1;
 IF v_user IS NULL THEN RAISE EXCEPTION 'test_requires_staging_auth_user'; END IF;
 SELECT * INTO v_template FROM public.guild_project_definitions ORDER BY template_id,version LIMIT 1;
 IF v_template.template_id IS NULL THEN RAISE EXCEPTION 'test_requires_project_template'; END IF;
 INSERT INTO public.guilds(name,owner_account_id,level,member_cap)
 VALUES('FellowshipTest',v_user,10,12) RETURNING id INTO v_guild;
 INSERT INTO public.guild_members(guild_id,account_id,role)
 VALUES(v_guild,v_user,'leader') ON CONFLICT DO NOTHING;

 FOR v_rank IN 0..3 LOOP
  INSERT INTO public.guild_skill_allocations(guild_id,skill_id,rank)
  VALUES(v_guild,'fellowship_projects',v_rank)
  ON CONFLICT(guild_id,skill_id) DO UPDATE SET rank=EXCLUDED.rank;
  IF private.guild_project_supply_target_v1(v_guild,40,5) <>
    (CASE v_rank WHEN 0 THEN 200 WHEN 1 THEN 190 WHEN 2 THEN 180 ELSE 170 END)
  THEN RAISE EXCEPTION 'materials_rank_wrong_%',v_rank;END IF;
 END LOOP;

 INSERT INTO public.guild_project_instances(
  guild_id,template_id,definition_version,definition_snapshot,config_hash,
  kind,focus,slot_index,cycle_key,status,started_at,ends_at,
  active_member_snapshot,target_points,minimum_meaningful_contributors,
  meaningful_contributor_threshold,personal_reward_threshold,single_account_completion_share_cap)
 VALUES(
  v_guild,v_template.template_id,v_template.version,v_template.definition_json,v_template.config_hash,
  'weekly_campaign','skilling',2,'choice:'||v_week::date::text,'active',v_week, v_week+interval '7 days',
  1,100,1,10,10,1)
 RETURNING id INTO v_project;
 INSERT INTO public.guild_project_member_progress(
  project_instance_id,account_id,raw_points,first_contribution_at,last_contribution_at)
 VALUES(v_project,v_user,100,now()-interval '30 minutes',now()-interval '10 minutes');
 INSERT INTO public.guild_shop_claim_sources(account_id,claim_key,reward_amount,reward_kind,consumed_at)
 VALUES(v_user,'guild-weekly:'||v_week::date::text||':project',40,'standard',v_claimed);
 IF private.guild_weekly_project_early_bonus_eligible_v1(v_user)
 THEN RAISE EXCEPTION 'early_bonus_before_completion';END IF;
 UPDATE public.guild_project_instances
 SET status='completed',completed_at=v_complete,
  completion_snapshot='{"gold":500}'::jsonb
 WHERE id=v_project;
 SELECT completion_snapshot INTO v_snapshot FROM public.guild_project_instances WHERE id=v_project;
 IF (v_snapshot->>'guildProjectCompletionTokenBonusBps')::integer<>1000
 THEN RAISE EXCEPTION 'completion_snapshot_missing_bonus'; END IF;
 IF NOT private.guild_weekly_project_early_bonus_eligible_v1(v_user)
 THEN RAISE EXCEPTION 'early_bonus_not_eligible';END IF;
 IF private.guild_weekly_project_tokens_v1(v_user)<>44
 THEN RAISE EXCEPTION 'late_claim_should_be_44';END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.guild_shop_weekly_rewards_server_v1(v_user)) x
    WHERE x->>'kind'='project_bonus' AND x->>'eligible'='true' AND x->>'claimed'='false')
 THEN RAISE EXCEPTION 'bonus_row_not_visible_when_earned';END IF;
 SELECT public.guild_shop_claim_weekly_server_v1(v_user,'project_bonus') INTO v_amount;
 IF v_amount <> 4 THEN RAISE EXCEPTION 'early_bonus_credit_wrong_%',v_amount;END IF;
 SELECT public.guild_shop_claim_weekly_server_v1(v_user,'project_bonus') INTO v_amount;
 IF v_amount <> 0 THEN RAISE EXCEPTION 'early_bonus_duplicate_credit_%',v_amount;END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.guild_shop_weekly_rewards_server_v1(v_user)) x
    WHERE x->>'kind'='project_bonus' AND x->>'claimed'='true')
 THEN RAISE EXCEPTION 'bonus_claimed_receipt_not_visible';END IF;
 RAISE NOTICE 'PASS: supply discount ranks 0..3, completion snapshot, early +4, duplicate 0, claimed row';
END $guild_engineering_polish_test$;
ROLLBACK;
