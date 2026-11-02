-- Explicit release of all nine Guild Skill Trees.
-- Gameplay effect consumers must be connected and verified by Claude.
-- Existing server-side point limits, leader/officer checks, material costs,
-- Guild Bank deposit restrictions, idempotency and rank caps remain in force.
do $release$
declare
  v_count integer;
  v_bad_costs integer;
  v_changed integer;
begin
  select count(*) into v_count
  from public.guild_skill_catalogue_v1
  where skill_id in (
    'professions_gathering', 'professions_crafting', 'professions_mastery',
    'fellowship_membership', 'fellowship_quests', 'fellowship_projects',
    'vanguard_boss', 'vanguard_defence', 'vanguard_support'
  );
  if v_count <> 9 then
    raise exception 'guild_skill_release_catalogue_incomplete: %', v_count;
  end if;

  select count(*) into v_bad_costs
  from public.guild_skill_catalogue_v1 c
  where c.skill_id in (
    'professions_gathering', 'professions_crafting', 'professions_mastery',
    'fellowship_membership', 'fellowship_quests', 'fellowship_projects',
    'vanguard_boss', 'vanguard_defence', 'vanguard_support'
  ) and (
    c.max_rank <> 3 or
    (select count(distinct costs.rank) from public.guild_skill_rank_costs_v1 costs
     where costs.skill_id = c.skill_id) <> 3
  );
  if v_bad_costs <> 0 then
    raise exception 'guild_skill_release_missing_rank_costs: %', v_bad_costs;
  end if;

  update public.guild_skill_catalogue_v1
  set is_released = true
  where skill_id in (
    'professions_gathering', 'professions_crafting', 'professions_mastery',
    'fellowship_membership', 'fellowship_quests', 'fellowship_projects',
    'vanguard_boss', 'vanguard_defence', 'vanguard_support'
  );
  get diagnostics v_changed = row_count;
  if v_changed <> 9 then
    raise exception 'guild_skill_release_incomplete: %', v_changed;
  end if;
end
$release$;
