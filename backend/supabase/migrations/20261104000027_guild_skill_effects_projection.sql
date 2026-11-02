-- Authoritative service-role-only read model for nine Guild Skill bonuses.
-- DO NOT enable is_released until effects are applied by the gameplay runtime.
CREATE OR REPLACE FUNCTION public.guild_skill_effects_server_v1(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with membership as (
  select m.guild_id
  from public.guild_members m
  where m.account_id = p_account_id
  limit 1
),
effects as (
  select c.skill_id, (a.rank * c.bonus_per_rank)::integer as value
  from membership m
  join public.guild_skill_allocations a on a.guild_id = m.guild_id
  join public.guild_skill_catalogue_v1 c on c.skill_id = a.skill_id
  where c.is_released and a.rank between 1 and c.max_rank
),
totals as (
  select
    coalesce(max(value) filter(where skill_id='professions_gathering'),0)*100 as gathering_speed_bps,
    coalesce(max(value) filter(where skill_id='professions_crafting'),0)*100 as crafting_speed_bps,
    coalesce(max(value) filter(where skill_id='professions_mastery'),0)*100 as skilling_xp_bps,
    coalesce(max(value) filter(where skill_id='fellowship_membership'),0) as member_capacity_extra,
    coalesce(max(value) filter(where skill_id='fellowship_quests'),0)*100 as guild_quest_reward_bps,
    coalesce(max(value) filter(where skill_id='fellowship_projects'),0)*100 as guild_project_efficiency_bps,
    coalesce(max(value) filter(where skill_id='vanguard_boss'),0)*100 as guild_boss_damage_bps,
    coalesce(max(value) filter(where skill_id='vanguard_defence'),0)*100 as guild_defence_bps,
    coalesce(max(value) filter(where skill_id='vanguard_support'),0)*100 as guild_support_bps
  from effects
)
select jsonb_build_object(
 'schemaVersion',1,
 'guildId',(select guild_id from membership),
 'gatheringSpeedBps',gathering_speed_bps,
 'craftingSpeedBps',crafting_speed_bps,
 'skillingXpBps',skilling_xp_bps,
 'memberCapacityExtra',member_capacity_extra,
 'guildQuestRewardBps',guild_quest_reward_bps,
 'guildProjectEfficiencyBps',guild_project_efficiency_bps,
 'guildBossDamageBps',guild_boss_damage_bps,
 'guildDefenceBps',guild_defence_bps,
 'guildSupportBps',guild_support_bps
) from totals
$function$
;
revoke all on function public.guild_skill_effects_server_v1(uuid) from public, anon, authenticated;
grant execute on function public.guild_skill_effects_server_v1(uuid) to service_role;