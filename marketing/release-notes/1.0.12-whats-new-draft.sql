-- VELDRYN Android 1.0.12 What's New — UNPUBLISHED DRAFT ONLY.
-- Manual application only after release manager verifies the final scope.
-- Not a migration; does not publish notes or change app_release_policy.
BEGIN;
DO $already_published$
BEGIN
 IF EXISTS (SELECT 1 FROM public.app_release_notes
            WHERE platform='android' AND version='1.0.12' AND is_published=true)
 THEN RAISE EXCEPTION 'Refusing to modify published 1.0.12 notes'; END IF;
END $already_published$;
INSERT INTO public.app_release_notes
 (platform, version, title, highlights, published_at, is_published, updated_at)
VALUES
 ('android','1.0.12','Smoother Adventures',jsonb_build_array(
  'Dungeons: Improved Q-Mode level scaling, stronger Echo equipment relevance, smoother room progression and clearer rewards.',
  'Gathering Tools: Dedicated tier management, active and reserve tool slots, Skill XP bonus rolls and improved tool transfers.',
  'Equipment: Refined item inspection, clearer stat comparisons and the ability to inspect equipment on other players'' profiles.',
  'Cooking: New Combat XP meal, combined Meals tab, stackable buff durations up to 24 hours and rebalanced recipes.',
  'Social: Larger chat emotes and text, unique Party names, improved Social Name consistency and active character profiles.',
  'Economy: Rebalanced Cooking and crafting recipes, resource requirements, Gold costs and skill XP rewards.',
  'Quality of Life: Seamless regional music, refined shortcuts, improved profile cosmetics and cleaner interfaces.',
  'Performance: Optimized server requests, improved crafting responsiveness, dungeon synchronization, stability and various bug fixes.'
 ),now(),false,now())
ON CONFLICT(platform,version) DO UPDATE
 SET title=excluded.title, highlights=excluded.highlights, updated_at=now()
 WHERE public.app_release_notes.is_published=false;
DO $verify$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.app_release_notes
    WHERE platform='android' AND version='1.0.12'
      AND title='Smoother Adventures' AND is_published=false
      AND highlights=jsonb_build_array(
        'Dungeons: Improved Q-Mode level scaling, stronger Echo equipment relevance, smoother room progression and clearer rewards.',
        'Gathering Tools: Dedicated tier management, active and reserve tool slots, Skill XP bonus rolls and improved tool transfers.',
        'Equipment: Refined item inspection, clearer stat comparisons and the ability to inspect equipment on other players'' profiles.',
        'Cooking: New Combat XP meal, combined Meals tab, stackable buff durations up to 24 hours and rebalanced recipes.',
        'Social: Larger chat emotes and text, unique Party names, improved Social Name consistency and active character profiles.',
        'Economy: Rebalanced Cooking and crafting recipes, resource requirements, Gold costs and skill XP rewards.',
        'Quality of Life: Seamless regional music, refined shortcuts, improved profile cosmetics and cleaner interfaces.',
        'Performance: Optimized server requests, improved crafting responsiveness, dungeon synchronization, stability and various bug fixes.'
      )
 ) THEN RAISE EXCEPTION 'Unpublished release note verification failed'; END IF;
END $verify$;
COMMIT;
-- Publication is a separate explicitly approved action after Play availability.
