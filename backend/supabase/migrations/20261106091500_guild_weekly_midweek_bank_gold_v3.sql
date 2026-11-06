-- Guild weekly v3: midweek contributors and rewards paid into audited Guild Bank.
-- Frozen v1/v2 projects keep their personal 500 Gold entitlement.
BEGIN;
ALTER TABLE public.guild_bank_ledger DROP CONSTRAINT guild_bank_ledger_kind_check;
ALTER TABLE public.guild_bank_ledger ADD CONSTRAINT guild_bank_ledger_kind_check
 CHECK(kind IN ('deposit','construction','skill_upgrade','project_reward'));
INSERT INTO public.guild_project_definitions(template_id,version,definition_json,config_hash)
VALUES('guild_weekly_shared_effort',3,
'{"name":"United for Veldryn","description":"Fight, gather or craft together. Each qualifying member can claim 2,500 Gold for the Guild Bank after completion. Guild Hall earns 200 progress.","minGuildLevel":1,"guildHallProgress":200,"goldReward":2500,"rewardDestination":"guild_bank","personalEffortRequired":300,"pointsPerHour":1200,"dailyEffortCap":2400,"maxGroupDiscount":0.1,"groupDiscountPerMember":0.004,"standardHoursPerMember":8,"groupDiscountStartsAfter":5}'::jsonb,
'shared-effort-bank-v3') ON CONFLICT(template_id,version) DO NOTHING;
CREATE OR REPLACE FUNCTION public.ensure_guild_weekly_project_v2(p_guild uuid, p_now timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s timestamptz:=date_trunc('week',p_now at time zone 'UTC') at time zone 'UTC';p uuid;n integer;d jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('guild-project:'||p_guild,0));
 update guild_project_instances set status='expired' where guild_id=p_guild and status='active' and ends_at<=p_now;
 if exists(select 1 from guild_project_instances where guild_id=p_guild and (cycle_key='weekly:'||to_char(s at time zone 'UTC','YYYY-MM-DD') or status='active')) then return;end if;
 perform 1 from guild_members where guild_id=p_guild for share;
 select count(*) into n from guild_members gm where gm.guild_id=p_guild and (gm.joined_at>=p_now-interval '14 days' or exists(select 1 from online_game_states gs where gs.account_id=gm.account_id and gs.updated_at>=p_now-interval '14 days'));
 if n=0 then return;end if;
 select definition_json into d from guild_project_definitions where template_id='guild_weekly_shared_effort' and version=3;
 insert into guild_project_instances(guild_id,template_id,definition_version,definition_snapshot,config_hash,kind,focus,slot_index,cycle_key,started_at,ends_at,active_member_snapshot,target_points,minimum_meaningful_contributors,meaningful_contributor_threshold,personal_reward_threshold,single_account_completion_share_cap,mixed_minimum_fraction)
 values(p_guild,'guild_weekly_shared_effort',3,d,'shared-effort-bank-v3','weekly_campaign','mixed',1,'weekly:'||to_char(s at time zone 'UTC','YYYY-MM-DD'),s,s+interval '7 days',n,ceil(n*9600*(1-least(0.10,greatest(0,n-5)*0.004)))::bigint,greatest(1,ceil(n*.2)),250,300,case when n=1 then 1 else .5 end,0) returning id into p;
 insert into guild_project_member_progress(project_instance_id,account_id,was_member_at_start,joined_at_snapshot)
 select p,account_id,true,greatest(joined_at,s) from guild_members where guild_id=p_guild;
end $function$;

CREATE OR REPLACE FUNCTION public.credit_guild_project_effort_v2(p_account uuid, p_guild uuid, p_effort jsonb, p_now timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p record;m record;a jsonb;s timestamptz;t timestamptz;day_start timestamptz;day_end timestamptz;j timestamptz;b bigint;c bigint;points bigint;combat bigint;skills bigint;allowed bigint;binding uuid;v_source text;v_credit bigint;v_project_skill_bps integer:=least(10000,greatest(0,coalesce((public.guild_skill_effects_server_v1(p_account)->>'guildProjectEfficiencyBps')::integer,0)));
begin
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account,0));
 perform ensure_guild_weekly_project_v2(p_guild,p_now);
 select joined_at into j from guild_members where account_id=p_account and guild_id=p_guild for share;
 if not found then return;end if;
 for p in select * from guild_project_instances where guild_id=p_guild and template_id='guild_weekly_shared_effort' and status in('active','expired','completed') and ends_at+interval '7 days'>p_now order by id for update loop
 select * into m from guild_project_member_progress where project_instance_id=p.id and account_id=p_account;
 if not found and p.status='active' and p.ends_at>p_now then
   -- Allow an already-authorized new Guild member to start contributing midweek.
   -- Weekly targets remain frozen. Never credit time before guild membership.
   insert into public.guild_project_member_progress(
     project_instance_id,account_id,was_member_at_start,joined_at_snapshot,progress_fraction_at_join
   ) values(
     p.id,p_account,j<=p.started_at,greatest(p.started_at,j),
     least(1,p.completion_points::numeric/greatest(1,p.target_points)::numeric)
   ) on conflict do nothing;
   select * into m from guild_project_member_progress
   where project_instance_id=p.id and account_id=p_account;
 end if;
 if not found then continue;end if;
 combat:=0;skills:=0;
 for a in select * from jsonb_array_elements(p_effort) loop
 if a->>'kind'='crafting' and jsonb_typeof(a->'units')='number' then
   -- Each verified crafted item is 15 seconds = 5 weekly effort, without
   -- granting any extra daily capacity or multiplying the existing reward.
   v_source:='crafting';
   t:=least(p_now,p.ends_at);
   s:=greatest(t-interval '15 seconds'*least(100,greatest(0,(a->>'units')::numeric)),p.started_at,m.joined_at_snapshot,j);
 elsif a->>'kind' in ('combat','skilling','crafting') and jsonb_typeof(a->'startsAtMs')='number' and jsonb_typeof(a->'endsAtMs')='number' then
   v_source:=case when a->>'kind'='combat' then 'combat' when a->>'kind'='crafting' then 'crafting' else 'gathering' end;
   s:=greatest(to_timestamp((a->>'startsAtMs')::numeric/1000),p.started_at,m.joined_at_snapshot,j);
   t:=least(to_timestamp((a->>'endsAtMs')::numeric/1000),p.ends_at,p_now);
 else continue;end if;
 if t<=s then continue;end if;
 insert into guild_project_cycle_bindings(cycle_key,account_id,guild_id,bound_at,points_at_bind) values(p.cycle_key,p_account,p_guild,p_now,1) on conflict do nothing;
 select guild_id into binding from guild_project_cycle_bindings where cycle_key=p.cycle_key and account_id=p_account;
 if binding<>p_guild then continue;end if;
 while s<t loop
 day_start:=date_trunc('day',s at time zone 'UTC') at time zone 'UTC';day_end:=least(t,day_start+interval '1 day');
 insert into guild_project_effort_days_v1 values(p.id,p_account,(day_start at time zone 'UTC')::date,0) on conflict do nothing;
 select credited_ms into b from guild_project_effort_days_v1 where project_id=p.id and account_id=p_account and earned_day=(day_start at time zone 'UTC')::date for update;
 c:=least(7200000,b+floor(extract(epoch from day_end-s)*1000));v_credit:=floor(floor(c/3000.0)*(10000+v_project_skill_bps)/10000.0)-floor(floor(b/3000.0)*(10000+v_project_skill_bps)/10000.0);points:=v_credit;
 if v_credit>0 then
  insert into public.guild_project_effort_sources_v1(project_id,account_id,source,points)
  values(p.id,p_account,v_source,v_credit)
  on conflict(project_id,account_id,source) do update set points=public.guild_project_effort_sources_v1.points+excluded.points;
 end if;
 update guild_project_effort_days_v1 set credited_ms=c where project_id=p.id and account_id=p_account and earned_day=(day_start at time zone 'UTC')::date;
 if v_source='combat' then combat:=combat+points;else skills:=skills+points;end if;s:=day_end;
 end loop;
 end loop;
 points:=combat+skills;
 if points=0 then continue;end if;
 allowed:=greatest(0,least(points,ceil(p.target_points*p.single_account_completion_share_cap)-m.completion_points));
 update guild_project_member_progress set raw_points=raw_points+points,completion_points=completion_points+allowed,combat_points=combat_points+combat,skilling_points=skilling_points+skills,first_contribution_at=coalesce(first_contribution_at,p_now),last_contribution_at=p_now where project_instance_id=p.id and account_id=p_account;
 update guild_project_instances set completion_points=completion_points+allowed,combat_points=combat_points+combat,skilling_points=skilling_points+skills,meaningful_contributors=(select count(*) from guild_project_member_progress where project_instance_id=p.id and raw_points>=250) where id=p.id;
 update guild_project_instances set status='completed',completed_at=p_now,completion_snapshot=jsonb_build_object('hallProgress',200,'gold',coalesce((p.definition_snapshot->>'goldReward')::integer,500),'rewardDestination',coalesce(p.definition_snapshot->>'rewardDestination','character')) where id=p.id and status<>'completed' and completion_points>=target_points and meaningful_contributors>=minimum_meaningful_contributors;
 end loop;
end $function$;

CREATE OR REPLACE FUNCTION public.claim_guild_project_reward_v2(p_project uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $claim$
DECLARE v_uid uuid:=auth.uid();v_game record;v_project record;v_gold integer;v_bank_reward boolean;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT * INTO v_game FROM public.online_game_states WHERE account_id=v_uid FOR UPDATE;
 IF NOT FOUND OR v_game.character_id IS NULL THEN RAISE EXCEPTION 'CHARACTER_REQUIRED'; END IF;
 SELECT p.* INTO v_project FROM public.guild_project_instances p
 JOIN public.guild_members gm ON gm.guild_id=p.guild_id AND gm.account_id=v_uid
 WHERE p.id=p_project AND p.template_id='guild_weekly_shared_effort' FOR UPDATE OF p;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROJECT_UNAVAILABLE'; END IF;
 IF EXISTS(SELECT 1 FROM public.guild_project_reward_claims c
  WHERE c.project_instance_id=v_project.id AND c.account_id=v_uid AND c.reward_key='completion')
 THEN RETURN jsonb_build_object('alreadyClaimed',true); END IF;
 IF v_project.status<>'completed' OR now()>=v_project.ends_at+interval '7 days'
 THEN RAISE EXCEPTION 'REWARD_UNAVAILABLE'; END IF;
 IF coalesce((SELECT raw_points FROM public.guild_project_member_progress
  WHERE project_instance_id=v_project.id AND account_id=v_uid),0)<v_project.personal_reward_threshold
 THEN RAISE EXCEPTION 'CONTRIBUTION_REQUIRED'; END IF;
 v_bank_reward:=coalesce(v_project.definition_snapshot->>'rewardDestination','character')='guild_bank';
 v_gold:=CASE WHEN v_bank_reward THEN 2500 ELSE 500 END;
 INSERT INTO public.guild_project_reward_claims(project_instance_id,account_id,reward_key)
 VALUES(v_project.id,v_uid,'completion');
 IF v_bank_reward THEN
   INSERT INTO public.guild_bank_balances(guild_id,resource_id,amount)
   VALUES(v_project.guild_id,'gold',v_gold)
   ON CONFLICT(guild_id,resource_id) DO UPDATE SET amount=public.guild_bank_balances.amount+excluded.amount;
   INSERT INTO public.guild_bank_ledger(guild_id,account_id,request_key,kind,resource_id,amount,template_id)
   VALUES(v_project.guild_id,v_uid,'weekly-project:'||v_project.id::text,'project_reward','gold',v_gold,v_project.template_id);
   RETURN jsonb_build_object('alreadyClaimed',false,'guildBankGold',v_gold,'gold',0);
 END IF;
 -- Preserve old frozen v1/v2 weekly rewards and their original destination.
 INSERT INTO public.character_wallets(character_id,gold) VALUES(v_game.character_id,v_gold)
 ON CONFLICT(character_id) DO UPDATE SET gold=public.character_wallets.gold+excluded.gold;
 UPDATE public.online_game_states SET revision=revision+1,updated_at=now(),
 state=jsonb_set(state,'{character,gold}',to_jsonb(
  (SELECT gold FROM public.character_wallets WHERE character_id=v_game.character_id)))
 WHERE account_id=v_uid;
 RETURN jsonb_build_object('alreadyClaimed',false,'gold',v_gold);
END $claim$;
REVOKE ALL ON FUNCTION public.claim_guild_project_reward_v2(uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.claim_guild_project_reward_v2(uuid) TO authenticated;
-- All released Construction buildings add significant treasury Gold sinks.
-- Existing +20% per extra Guild member scaling applies to Gold as well.
INSERT INTO public.guild_construction_requirements(template_id,resource_id,required_amount)
SELECT t.template_id,'gold',
 CASE ((regexp_match(t.template_id,'_([0-9]+)$'))[1])::integer
 WHEN 1 THEN 25000 WHEN 2 THEN 75000 WHEN 3 THEN 175000 ELSE 350000 END
FROM public.guild_construction_templates t
WHERE t.enabled AND t.template_id LIKE 'construction_%'
ON CONFLICT(template_id,resource_id) DO NOTHING;
-- Skills remain material-gated, with additional Guild Bank Gold per rank.
INSERT INTO public.guild_skill_rank_costs_v1(skill_id,rank,resource_id,amount)
SELECT s.skill_id,steps.rank,'gold',
 CASE steps.rank WHEN 1 THEN 5000 WHEN 2 THEN 15000 WHEN 3 THEN 30000
 WHEN 4 THEN 50000 ELSE least(250000,50000+(steps.rank-4)*25000) END
FROM public.guild_skill_catalogue_v1 s
CROSS JOIN LATERAL generate_series(1,s.max_rank) AS steps(rank)
WHERE s.is_released
ON CONFLICT(skill_id,rank,resource_id) DO NOTHING;
REVOKE ALL ON FUNCTION public.ensure_guild_weekly_project_v2(uuid,timestamptz) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_guild_weekly_project_v2(uuid,timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.credit_guild_project_effort_v2(uuid,uuid,jsonb,timestamptz) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.credit_guild_project_effort_v2(uuid,uuid,jsonb,timestamptz) TO service_role;
COMMIT;
