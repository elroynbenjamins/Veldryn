-- Fellowship redesign: verified Guild Quest Tokens and snapshotted Guild Project supply savings.
-- No rerolls. Existing quest Activity receipts and already-started project goals are immutable.
BEGIN;

UPDATE public.guild_skill_catalogue_v1
SET bonus_per_rank = CASE skill_id WHEN 'fellowship_quests' THEN 10 ELSE 5 END
WHERE skill_id IN ('fellowship_quests','fellowship_projects');

-- Stop the obsolete +Activity / +effort multipliers before changing the catalogue.
-- Keep keys in the legacy projection for older clients; always return zero for those two fields.
DO $stop_old_bonuses$
DECLARE v_src text; v_old text; v_new text;
BEGIN
 v_src:=pg_get_functiondef('public.guild_skill_effects_server_v1(uuid)'::regprocedure);
 v_old:='coalesce(max(value) filter(where skill_id=''fellowship_quests''),0)*100 as guild_quest_reward_bps';
 v_new:='0 as guild_quest_reward_bps';
 IF position(v_old IN v_src)>0 THEN v_src:=replace(v_src,v_old,v_new);
 ELSIF position(v_new IN v_src)=0 THEN RAISE EXCEPTION 'quest_projection_source_mismatch'; END IF;
 v_old:='coalesce(max(value) filter(where skill_id=''fellowship_projects''),0)*100 as guild_project_efficiency_bps';
 v_new:='0 as guild_project_efficiency_bps';
 IF position(v_old IN v_src)>0 THEN v_src:=replace(v_src,v_old,v_new);
 ELSIF position(v_new IN v_src)=0 THEN RAISE EXCEPTION 'project_projection_source_mismatch'; END IF;
 EXECUTE v_src;
END $stop_old_bonuses$;

-- New quest completions keep their original Guild Activity amount, independently of skill rank.
CREATE OR REPLACE FUNCTION public.guild_quest_reward_units_server_v1(p_guild_id uuid,p_rarity text)
RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $quest_activity$ SELECT public.guild_quest_rarity_reward_v3(p_rarity) $quest_activity$;
REVOKE ALL ON FUNCTION public.guild_quest_reward_units_server_v1(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guild_quest_reward_units_server_v1(uuid,text) TO service_role;

-- Snapshot quest token bonus at the moment a verified guild quest first completes.
-- Existing rows use the default 0, so upgrading cannot grant retroactive bonus.
ALTER TABLE public.guild_quest_completions
 ADD COLUMN IF NOT EXISTS fellowship_token_bonus_bps integer NOT NULL DEFAULT 0;
ALTER TABLE public.guild_quest_completions
 DROP CONSTRAINT IF EXISTS guild_quest_completion_token_bonus_range;
ALTER TABLE public.guild_quest_completions
 ADD CONSTRAINT guild_quest_completion_token_bonus_range
 CHECK(fellowship_token_bonus_bps BETWEEN 0 AND 3000);

CREATE OR REPLACE FUNCTION private.guild_quest_completion_token_snapshot_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $quest_snapshot$
BEGIN
 NEW.fellowship_token_bonus_bps:=coalesce((
  SELECT least(a.rank,3)*1000
  FROM public.guild_skill_allocations a
  JOIN public.guild_skill_catalogue_v1 c ON c.skill_id=a.skill_id
  WHERE a.guild_id=NEW.guild_id AND a.skill_id='fellowship_quests' AND c.is_released
 ),0);
 RETURN NEW;
END $quest_snapshot$;
REVOKE ALL ON FUNCTION private.guild_quest_completion_token_snapshot_v1() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_guild_quest_completion_token_snapshot_v1 ON public.guild_quest_completions;
CREATE TRIGGER trg_guild_quest_completion_token_snapshot_v1
BEFORE INSERT ON public.guild_quest_completions
FOR EACH ROW EXECUTE FUNCTION private.guild_quest_completion_token_snapshot_v1();

-- Capture the project perk exactly on first completion, never later on claim.
CREATE OR REPLACE FUNCTION private.guild_project_completion_token_snapshot_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $project_snapshot$
DECLARE v_rank integer:=0;
BEGIN
 IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
  SELECT a.rank INTO v_rank FROM public.guild_skill_allocations a
  JOIN public.guild_skill_catalogue_v1 c ON c.skill_id=a.skill_id
  WHERE a.guild_id=NEW.guild_id AND a.skill_id='fellowship_projects' AND c.is_released;
  IF coalesce(v_rank,0)>=3 THEN
   NEW.completion_snapshot:=coalesce(NEW.completion_snapshot,'{}'::jsonb)
     ||jsonb_build_object('guildProjectCompletionTokenBonusBps',1000);
  END IF;
 END IF;
 RETURN NEW;
END $project_snapshot$;
REVOKE ALL ON FUNCTION private.guild_project_completion_token_snapshot_v1() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_guild_project_completion_token_snapshot_v1 ON public.guild_project_instances;
CREATE TRIGGER trg_guild_project_completion_token_snapshot_v1
BEFORE UPDATE OF status ON public.guild_project_instances
FOR EACH ROW EXECUTE FUNCTION private.guild_project_completion_token_snapshot_v1();

-- Only new project instances receive the discount. Active project target_amount
-- records and member caps are never rewritten when a rank changes.
CREATE OR REPLACE FUNCTION private.guild_project_supply_target_v1(
 p_guild uuid,p_per_member integer,p_members integer
) RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $supply$
SELECT greatest(1,ceil(
 greatest(1,coalesce(p_per_member,1))::numeric*greatest(1,coalesce(p_members,1))
 *(100-5*coalesce((
   SELECT least(3,a.rank) FROM public.guild_skill_allocations a
   JOIN public.guild_skill_catalogue_v1 c ON c.skill_id=a.skill_id
   WHERE a.guild_id=p_guild AND a.skill_id='fellowship_projects' AND c.is_released
 ),0))/100.0
)::integer)
$supply$;
REVOKE ALL ON FUNCTION private.guild_project_supply_target_v1(uuid,integer,integer)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.guild_project_supply_target_v1(uuid,integer,integer) TO service_role;

DO $patch_new_project_goals$
DECLARE v_src text; v_old text; v_new text;
BEGIN
 v_src:=pg_get_functiondef('public.guild_project_choice_tick_v1(uuid,timestamptz)'::regprocedure);
 v_old:='v_n*(SELECT coalesce(sum((goal->>''perMember'')::integer),0)';
 v_new:='(SELECT coalesce(sum(private.guild_project_supply_target_v1(p_guild,(goal->>''perMember'')::integer,v_n)),0)';
 IF position(v_old IN v_src)>0 THEN v_src:=replace(v_src,v_old,v_new);
 ELSIF position(v_new IN v_src)=0 THEN RAISE EXCEPTION 'guild_choice_donation_total_source_mismatch'; END IF;
 v_old:='(v_category->>''perMember'')::integer*v_n';
 v_new:='private.guild_project_supply_target_v1(p_guild,(v_category->>''perMember'')::integer,v_n)';
 IF position(v_old IN v_src)>0 THEN v_src:=replace(v_src,v_old,v_new);
 ELSIF position(v_new IN v_src)=0 THEN RAISE EXCEPTION 'guild_choice_supply_goal_source_mismatch'; END IF;
 EXECUTE v_src;
END $patch_new_project_goals$;

-- Guild Quest weekly claim: a guild quest has to be completed *and* the member
-- must have server-verified guild contribution before that completion. The
-- account cannot transfer guilds to claim someone else's completed objective.
CREATE OR REPLACE FUNCTION private.guild_weekly_quest_eligible_v1(p_account_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $eligible$
SELECT EXISTS(
 SELECT 1 FROM public.guild_members gm
 JOIN public.guild_quest_completions qc ON qc.guild_id=gm.guild_id
 JOIN public.guild_muster_daily d ON d.guild_id=gm.guild_id
   AND d.account_id=gm.account_id
 WHERE gm.account_id=p_account_id
   AND gm.joined_at<=qc.completed_at
   AND qc.week_key=(date_trunc('week',now() AT TIME ZONE 'UTC'))::date
   AND qc.completed_at<=now()
   AND d.activity_date>=qc.week_key AND d.activity_date<=(qc.completed_at AT TIME ZONE 'UTC')::date
   AND d.contribution_points>0 AND d.first_contribution_at<=qc.completed_at
) $eligible$;
REVOKE ALL ON FUNCTION private.guild_weekly_quest_eligible_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.guild_weekly_quest_eligible_v1(uuid) TO service_role;

-- Weekly quests pay 20 baseline Tokens, with +10/20/30% from the best
-- snapshotted qualifying new completion (22/24/26 total); no reroll or replay.
CREATE OR REPLACE FUNCTION private.guild_weekly_quest_tokens_v1(p_account_id uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $tokens$
SELECT (20*(10000+coalesce((
 SELECT max(qc.fellowship_token_bonus_bps)
 FROM public.guild_members gm
 JOIN public.guild_quest_completions qc ON qc.guild_id=gm.guild_id
 JOIN public.guild_muster_daily d ON d.guild_id=gm.guild_id
   AND d.account_id=gm.account_id
 WHERE gm.account_id=p_account_id
   AND gm.joined_at<=qc.completed_at
   AND qc.week_key=(date_trunc('week',now() AT TIME ZONE 'UTC'))::date
   AND qc.completed_at<=now()
   AND d.activity_date>=qc.week_key AND d.activity_date<=(qc.completed_at AT TIME ZONE 'UTC')::date
   AND d.contribution_points>0 AND d.first_contribution_at<=qc.completed_at
),0))/10000)::bigint
$tokens$;
REVOKE ALL ON FUNCTION private.guild_weekly_quest_tokens_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.guild_weekly_quest_tokens_v1(uuid) TO service_role;

-- Existing weekly Project contribution Tokens are 40. Rank 3 awards +10%
-- only when an eligible project was actually completed with a frozen bonus.
CREATE OR REPLACE FUNCTION private.guild_weekly_project_tokens_v1(p_account_id uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $project_tokens$
SELECT 40 + CASE WHEN EXISTS(
 SELECT 1 FROM public.guild_members gm
 JOIN public.guild_project_instances p ON p.guild_id=gm.guild_id
 JOIN public.guild_project_member_progress mp
   ON mp.project_instance_id=p.id AND mp.account_id=gm.account_id
 WHERE gm.account_id=p_account_id AND p.status='completed'
   AND gm.joined_at<=p.completed_at
   AND p.started_at >= (date_trunc('week',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
   AND p.started_at < now()
   AND (p.completion_snapshot->>'guildProjectCompletionTokenBonusBps')::integer=1000
   AND mp.raw_points>=greatest(10,coalesce(p.meaningful_contributor_threshold,10))
 ) THEN 4 ELSE 0 END
$project_tokens$;
REVOKE ALL ON FUNCTION private.guild_weekly_project_tokens_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.guild_weekly_project_tokens_v1(uuid) TO service_role;

-- Retain existing attendance, project, boss eligibility and all weekly cap,
-- idempotency and claim-source logic. Add the new verified quest kind.
DO $patch_weekly_eligibility$
DECLARE v_src text; v_old text; v_new text;
BEGIN
 v_src:=pg_get_functiondef('public.guild_shop_weekly_eligible_server_v1(uuid,text)'::regprocedure);
 v_old:='if p_kind=''attendance'' then';
 v_new:='if p_kind=''quest'' then return private.guild_weekly_quest_eligible_v1(p_account_id); end if;'||
        E'\n '||v_old;
 IF position('guild_weekly_quest_eligible_v1' IN v_src)=0 THEN
  IF position(v_old IN v_src)=0 THEN RAISE EXCEPTION 'guild_weekly_eligibility_source_mismatch'; END IF;
  v_src:=replace(v_src,v_old,v_new);EXECUTE v_src;
 END IF;
END $patch_weekly_eligibility$;

DO $patch_weekly_claim$
DECLARE v_src text; v_old text; v_new text;
BEGIN
 v_src:=pg_get_functiondef('public.guild_shop_claim_weekly_server_v1(uuid,text)'::regprocedure);
 v_old:='when ''project'' then 40';
 v_new:='when ''project'' then private.guild_weekly_project_tokens_v1(p_account_id)';
 IF position(v_old IN v_src)>0 THEN v_src:=replace(v_src,v_old,v_new);
 ELSIF position(v_new IN v_src)=0 THEN RAISE EXCEPTION 'guild_weekly_project_claim_source_mismatch'; END IF;
 v_old:='when ''boss'' then 30 else null end';
 v_new:='when ''boss'' then 30 when ''quest'' then private.guild_weekly_quest_tokens_v1(p_account_id) else null end';
 IF position(v_old IN v_src)>0 THEN v_src:=replace(v_src,v_old,v_new);
 ELSIF position(v_new IN v_src)=0 THEN RAISE EXCEPTION 'guild_weekly_quest_claim_source_mismatch'; END IF;
 EXECUTE v_src;
END $patch_weekly_claim$;

-- Give the shop the same authoritative claim amounts, including legacy
-- already-claimed amounts (no post-upgrade revaluation).
DO $patch_weekly_shop_snapshot$
DECLARE v_src text; v_old text; v_new text;
BEGIN
 v_src:=pg_get_functiondef('public.guild_shop_weekly_rewards_server_v1(uuid)'::regprocedure);
 v_old:='(2,''project'',40),(3,''boss'',30)';
 v_new:='(2,''project'',private.guild_weekly_project_tokens_v1(p_account_id)),(3,''boss'',30),(4,''quest'',private.guild_weekly_quest_tokens_v1(p_account_id))';
 IF position(v_old IN v_src)>0 THEN v_src:=replace(v_src,v_old,v_new);
 ELSIF position(v_new IN v_src)=0 THEN RAISE EXCEPTION 'guild_weekly_rewards_source_mismatch'; END IF;
 v_old:='''kind'',v.kind,''tokens'',v.amount,';
 v_new:='''kind'',v.kind,''tokens'',coalesce((select src.reward_amount from public.guild_shop_claim_sources src'||
  ' where src.account_id=p_account_id and src.consumed_at is not null and src.claim_key='||
  '''guild-weekly:''||(date_trunc(''week'',now() at time zone ''utc'')::date)::text||'':''||v.kind),v.amount),';
 IF position(v_old IN v_src)>0 THEN v_src:=replace(v_src,v_old,v_new);
 ELSIF position(v_new IN v_src)=0 THEN RAISE EXCEPTION 'guild_weekly_rewards_amount_source_mismatch'; END IF;
 EXECUTE v_src;
END $patch_weekly_shop_snapshot$;

-- Migration fails closed if any consumer accidentally still scales old Activity
-- or verified effort. Existing projects and claims were never updated.
DO $fellowship_contract$
BEGIN
 IF private.guild_project_supply_target_v1(null,40,5)<>200
   OR private.guild_weekly_quest_tokens_v1(null)<>20
   OR private.guild_weekly_project_tokens_v1(null)<>40
   OR (SELECT count(*) FROM public.guild_skill_catalogue_v1
       WHERE (skill_id='fellowship_quests' AND bonus_per_rank=10)
          OR (skill_id='fellowship_projects' AND bonus_per_rank=5))<>2
   OR position('0 as guild_quest_reward_bps' in pg_get_functiondef('public.guild_skill_effects_server_v1(uuid)'::regprocedure))=0
   OR position('0 as guild_project_efficiency_bps' in pg_get_functiondef('public.guild_skill_effects_server_v1(uuid)'::regprocedure))=0
 THEN RAISE EXCEPTION 'fellowship_perk_contract_failed'; END IF;
END $fellowship_contract$;
COMMIT;
