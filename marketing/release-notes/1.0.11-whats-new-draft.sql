-- VELDRYN Android 1.0.11 What's New — UNPUBLISHED DRAFT ONLY.
-- This is a manually reviewed DML draft, NOT an auto-applied migration.
-- Safe before building an AAB: the app only fetches is_published=true notes.
-- Only publish with a separate, approved rollout operation; do not touch app_release_policy.
BEGIN;
DO $already_published$
BEGIN
 IF EXISTS (SELECT 1 FROM public.app_release_notes
            WHERE platform='android' AND version='1.0.11' AND is_published=true)
 THEN RAISE EXCEPTION 'Refusing to modify published 1.0.11 notes'; END IF;
END $already_published$;
INSERT INTO public.app_release_notes
 (platform, version, title, highlights, published_at, is_published, updated_at)
VALUES
 ('android','1.0.11','Beyond the Depths',jsonb_build_array(
  'Equipment Rolls: New T1–T5 gear can roll useful class-neutral bonus stats, while existing equipment keeps its progress.',
  'Gathering Tools: Stack tiers and forge individually rolled rarity, quality and Speed or Rare Find bonuses.',
  'Dungeon Endurance: Explore tougher rooms and choose a boss encounter at every seven-room checkpoint.',
  'Dungeon Weeklies: Take on dedicated weekly Dungeon challenges for Expedition Marks.',
  'Friends & Guild Echoes: Recruit eligible friends or guildmates as Solo Dungeon allies.',
  'Deeper Dungeons: Discover more boons and artifacts, plus quicker enemy previews and clearer room choices.',
  'Everyday Progress: Enjoy Supply Journey boosts, Companion XP banking, Cooking XP previews and extra Class Challenges.',
  'More Polish: Clearer Skills and recipes, Gear Storage details, improved Character Roster, Inbox, Guild contributions and audio controls.'
 ),now(),false,now())
ON CONFLICT(platform,version) DO UPDATE
 SET title=excluded.title, highlights=excluded.highlights, updated_at=now()
 WHERE public.app_release_notes.is_published=false;
DO $verify$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.app_release_notes
    WHERE platform='android' AND version='1.0.11'
      AND title='Beyond the Depths' AND is_published=false
      AND jsonb_array_length(highlights)=8
 ) THEN RAISE EXCEPTION 'Unpublished release note verification failed'; END IF;
END $verify$;
COMMIT;
-- During actual release ONLY, after production readiness approval:
-- UPDATE public.app_release_notes SET is_published=true,
--   published_at=now(),updated_at=now()
-- WHERE platform='android' AND version='1.0.11' AND is_published=false;
