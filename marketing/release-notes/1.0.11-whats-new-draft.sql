-- Veldryn 1.0.11 What's New: DRAFT ONLY — not an auto-applied migration.
-- Run on STAGING first after exact-head source/backend QA and approval.
-- A draft row is never exposed to clients because is_published=false (see existing RLS).
-- published_at is a non-null storage placeholder while unpublished; reset to the
-- actual approved rollout timestamp when publishing. Do NOT advance app_release_policy.
BEGIN;
DO $release_notes_guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.app_release_notes
    WHERE platform='android' AND version='1.0.11' AND is_published
  ) THEN
    RAISE EXCEPTION 'Refusing to overwrite already-published Android 1.0.11 notes';
  END IF;
END
$release_notes_guard$;

INSERT INTO public.app_release_notes
  (platform, version, title, highlights, published_at, is_published, updated_at)
VALUES
  ('android', '1.0.11', 'Beyond the Depths', jsonb_build_array(
    'Equipment Rolls: Forge Tier 1+ gear with bonus stat rolls; previously owned equipment stays intact.',
    'Gathering Tools: Stack tool tiers for stronger Mining, Woodcutting and Fishing speed bonuses.',
    'Dungeon Endurance: Brave tougher rooms and choose boss encounters at seven-room checkpoints.',
    'Dungeon Weeklies: Complete dedicated challenges for Expedition Marks, separate from regular Quests.',
    'Familiar Allies: Recruit eligible friends and guildmates as role-balanced Solo Dungeon Echoes.',
    'Dungeon Discoveries: Explore more boons and artifacts, with clearer room choices and combat previews.',
    'Better Daily Progress: Enjoy Supply Journey boosts, Companion XP banking and clearer Cooking XP.',
    'Realm Polish: A cleaner character roster and Rewards Inbox, improved Guild cues, audio controls, chat and transitions.'
  ), now(), false, now())
ON CONFLICT (platform, version) DO UPDATE
SET title=EXCLUDED.title,
    highlights=EXCLUDED.highlights,
    updated_at=now()
WHERE public.app_release_notes.is_published=false;

DO $release_notes_verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.app_release_notes
    WHERE platform='android' AND version='1.0.11'
      AND title='Beyond the Depths' AND is_published=false
      AND jsonb_array_length(highlights)=8
  ) THEN
    RAISE EXCEPTION 'Unpublished 1.0.11 release notes were not created';
  END IF;
END
$release_notes_verify$;
COMMIT;

-- POST-APPROVAL, IN A SEPARATE VERIFIED RELEASE OPERATION ONLY:
-- UPDATE public.app_release_notes
-- SET is_published=true, published_at=now(), updated_at=now()
-- WHERE platform='android' AND version='1.0.11' AND is_published=false;
-- Verify signed 1.0.11 AAB + production backend parity + Play rollout before
-- running any publication change. Do not change minimum_version here.
