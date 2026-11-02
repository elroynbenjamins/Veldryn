-- Fellowship Projects authoritative effect consumer for VELDRYN 1.0.4.
-- Every 3 seconds of DB-verified activity awards one base point; the 2h UTC
-- daily credited_ms cap is unchanged. The released guild skill adds up to
-- 6% earned points, using cumulative flooring to prevent batch-split exploits.
-- Do not multiply the same points again in gameplay.ts or Guild Construction.
do $guild_projects_patch$
declare v_source text;v_updated text;
begin
 select pg_get_functiondef('public.credit_guild_project_effort_v2(uuid,uuid,jsonb,timestamptz)'::regprocedure) into v_source;
 if position('v_project_skill_bps' in v_source)>0 then return;end if;
 if position('v_credit bigint;' in v_source)=0 or
    position('v_credit:=floor(c/3000.0)-floor(b/3000.0);points:=v_credit;' in v_source)=0
 then raise exception 'guild_project_efficiency_source_mismatch';end if;
 v_updated:=replace(v_source,'v_credit bigint;',
 'v_credit bigint;v_project_skill_bps integer:=least(10000,greatest(0,coalesce((public.guild_skill_effects_server_v1(p_account)->>''guildProjectEfficiencyBps'')::integer,0)));');
 v_updated:=replace(v_updated,
 'v_credit:=floor(c/3000.0)-floor(b/3000.0);points:=v_credit;',
 'v_credit:=floor(floor(c/3000.0)*(10000+v_project_skill_bps)/10000.0)-floor(floor(b/3000.0)*(10000+v_project_skill_bps)/10000.0);points:=v_credit;');
 execute v_updated;
end
$guild_projects_patch$;
