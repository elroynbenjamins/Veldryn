-- Match authoritative Guild Skill snapshot names with the redesigned Fellowship cards.
-- IDs, ranks, earned rewards, points, and material prices are unchanged.
UPDATE public.guild_skill_catalogue_v1 SET label='Quest Mastery'
 WHERE skill_id='fellowship_quests';
UPDATE public.guild_skill_catalogue_v1 SET label='Guild Engineering'
 WHERE skill_id='fellowship_projects';
