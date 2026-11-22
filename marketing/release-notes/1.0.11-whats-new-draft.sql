-- VELDRYN Android 1.0.11 What's New — UNPUBLISHED DRAFT ONLY.
-- The release-copy draft is intentionally safe to store before the AAB is approved.
-- It does NOT publish notes, deploy functions, change Social Name flags or touch app_release_policy.
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
  'Equipment Rolls: New T1–T5 gear can roll class-neutral bonus stats; existing items keep their progress.',
  'Gathering Tools: Stack four tool tiers and forge rarity, quality and one Speed or Rare Find bonus per tool.',
  'Dungeon Endurance: Face escalating rooms and choose a boss at every seven-room checkpoint.',
  'Dungeon Weeklies & Echoes: Earn Expedition Marks from weekly challenges and recruit eligible friend or guild Echo allies.',
  'Deeper Dungeons: Discover more boons, artifacts and clearer enemy previews and room choices.',
  'Social Name & Showcases: Choose one account-wide name and present each hero''s own showcase.',
  'Everyday Progress: Enjoy Supply Journey boosts, Companion XP banking, Cooking XP previews and extra Class Challenges.',
  'Cleaner Adventures: Improved crafting, inventory, gear comparisons, stable Character Roster, Rewards Inbox and audio controls.'
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
-- Only after explicit 1.0.11 publication approval:
-- UPDATE public.app_release_notes SET is_published=true,
--   published_at=now(),updated_at=now()
-- WHERE platform='android' AND version='1.0.11' AND is_published=false;
