-- Guild Skill release HOLD for VELDRYN 1.0.4.
-- This migration intentionally DOES NOT activate any skill.
-- The former blanket release would permit purchases of Fellowship/Vanguard
-- bonuses before their authoritative consumers are connected. Never restore
-- that blanket update here. Use a separately reviewed follow-on migration to
-- release individually verified skills after staging sign-off.
DO $guild_skill_release_hold$
DECLARE v_total integer; v_released integer;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE is_released)
    INTO v_total, v_released
    FROM public.guild_skill_catalogue_v1
   WHERE skill_id IN (
     'professions_gathering','professions_crafting','professions_mastery',
     'fellowship_membership','fellowship_quests','fellowship_projects',
     'vanguard_boss','vanguard_defence','vanguard_support'
   );
  IF v_total <> 9 THEN
    RAISE EXCEPTION 'guild_skill_hold_catalogue_incomplete: %', v_total;
  END IF;
  IF v_released <> 0 THEN
    RAISE EXCEPTION 'guild_skill_hold_requires_locked_catalogue: % are already released', v_released;
  END IF;
  RAISE NOTICE 'Guild Skills held: 9 unreleased; no purchase activation';
END
$guild_skill_release_hold$;
