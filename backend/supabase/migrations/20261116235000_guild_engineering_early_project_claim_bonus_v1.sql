-- Guild Engineering Rank 3: recover the +10% Project Token bonus when the
-- weekly 40-Token contribution reward was claimed BEFORE project completion.
-- A 44-Token project claim made after completion remains final: no duplicate +4.
-- All rewards stay inside the normal weekly cap and exact-once claim ledger.
BEGIN;

CREATE OR REPLACE FUNCTION private.guild_weekly_project_early_bonus_eligible_v1(
 p_account_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $early_bonus$
SELECT EXISTS(
 SELECT 1
 FROM public.guild_members gm
 JOIN public.guild_project_instances p ON p.guild_id=gm.guild_id
 JOIN public.guild_project_member_progress mp
   ON mp.project_instance_id=p.id AND mp.account_id=gm.account_id
 JOIN public.guild_shop_claim_sources src
   ON src.account_id=gm.account_id
   AND src.claim_key='guild-weekly:'||
      (date_trunc('week',now() AT TIME ZONE 'UTC')::date)::text||':project'
 WHERE gm.account_id=p_account_id
   AND p.status='completed'
   AND p.completed_at IS NOT NULL AND p.completed_at<=now()
   AND p.started_at>=date_trunc('week',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
   AND p.started_at<now()
   AND gm.joined_at<=p.completed_at
   AND src.reward_kind='standard'
   AND src.reward_amount=40
   AND src.consumed_at IS NOT NULL
   AND src.consumed_at>=greatest(gm.joined_at,p.started_at)
   AND src.consumed_at<=p.completed_at
   AND (p.completion_snapshot->>'guildProjectCompletionTokenBonusBps')::integer=1000
   AND mp.raw_points>=greatest(10,coalesce(p.meaningful_contributor_threshold,10))
   AND mp.first_contribution_at IS NOT NULL
   AND mp.first_contribution_at<=p.completed_at
)
$early_bonus$;
REVOKE ALL ON FUNCTION private.guild_weekly_project_early_bonus_eligible_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.guild_weekly_project_early_bonus_eligible_v1(uuid) TO service_role;

-- Continue using the same server proof and Guild membership checks as the
-- standard weekly Guild rewards. Only a verified earlier 40-Token receipt
-- unlocks the one-time extra claim. Never ask the mobile client for an amount.
DO $project_topup_eligibility$
DECLARE v_src text;v_old text;v_new text;
BEGIN
 v_src:=pg_get_functiondef('public.guild_shop_weekly_eligible_server_v1(uuid,text)'::regprocedure);
 v_old:='if p_kind=''quest'' then';
 v_new:='if p_kind=''project_bonus'' then return private.guild_weekly_project_early_bonus_eligible_v1(p_account_id); end if;'||
  E'\n '||v_old;
 IF position(v_new IN v_src)>0 THEN RETURN; END IF;
 IF position(v_old IN v_src)=0 THEN RAISE EXCEPTION 'guild_weekly_project_bonus_eligibility_source_changed'; END IF;
 EXECUTE replace(v_src,v_old,v_new);
END $project_topup_eligibility$;

DO $project_topup_claim$
DECLARE v_src text;v_old text;v_new text;
BEGIN
 v_src:=pg_get_functiondef('public.guild_shop_claim_weekly_server_v1(uuid,text)'::regprocedure);
 v_old:='when ''quest'' then private.guild_weekly_quest_tokens_v1(p_account_id) else null end';
 v_new:='when ''quest'' then private.guild_weekly_quest_tokens_v1(p_account_id) when ''project_bonus'' then 4 else null end';
 IF position(v_new IN v_src)>0 THEN RETURN; END IF;
 IF position(v_old IN v_src)=0 THEN RAISE EXCEPTION 'guild_weekly_project_bonus_claim_source_changed'; END IF;
 EXECUTE replace(v_src,v_old,v_new);
END $project_topup_claim$;

-- Hidden until earned. Once claimed, keep the +4 line visible on this week's
-- Shop receipt even if a later guild change makes it ineligible.
DO $project_topup_shop_snapshot$
DECLARE v_src text;v_old text;v_new text;
BEGIN
 v_src:=pg_get_functiondef('public.guild_shop_weekly_rewards_server_v1(uuid)'::regprocedure);
 v_old:='(4,''quest'',private.guild_weekly_quest_tokens_v1(p_account_id)))';
 v_new:='(4,''quest'',private.guild_weekly_quest_tokens_v1(p_account_id)),(5,''project_bonus'',4))';
 IF position(v_old IN v_src)>0 THEN v_src:=replace(v_src,v_old,v_new);
 ELSIF position(v_new IN v_src)=0 THEN RAISE EXCEPTION 'guild_weekly_project_bonus_rows_source_changed'; END IF;
 v_old:='as v(ord,kind,amount)';
 v_new:='as v(ord,kind,amount)'||E'\n'||
  ' where v.kind<>''project_bonus'' or public.guild_shop_weekly_eligible_server_v1(p_account_id,''project_bonus'')'||
  E'\n'||' or exists(select 1 from public.guild_shop_claim_sources src where src.account_id=p_account_id'||
  ' and src.consumed_at is not null and src.claim_key=''guild-weekly:''||'||
  '(date_trunc(''week'',now() at time zone ''utc'')::date)::text||'':project_bonus'')';
 IF position(v_new IN v_src)=0 THEN
  IF position(v_old IN v_src)=0 THEN RAISE EXCEPTION 'guild_weekly_project_bonus_visibility_source_changed'; END IF;
  v_src:=replace(v_src,v_old,v_new);
 END IF;
 EXECUTE v_src;
END $project_topup_shop_snapshot$;

-- No rewards or project requirements are written during migration.
DO $project_topup_contract$
BEGIN
 IF private.guild_weekly_project_early_bonus_eligible_v1(null)
   OR (select count(*) from jsonb_array_elements(public.guild_shop_weekly_rewards_server_v1(null)) AS s(value)
       where s.value->>'kind'='project_bonus')<>0
   OR position('when ''project_bonus'' then 4' in
     pg_get_functiondef('public.guild_shop_claim_weekly_server_v1(uuid,text)'::regprocedure))=0
 THEN RAISE EXCEPTION 'guild_weekly_project_bonus_contract_failed'; END IF;
END $project_topup_contract$;
COMMIT;
