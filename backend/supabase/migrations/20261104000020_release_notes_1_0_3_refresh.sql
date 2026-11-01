-- Refresh What's New for 1.0.3 with a fuller summary of changes since 1.0.2
-- and delay the in-app announcement by 24 hours so the store review has time
-- to roll out before players see the notes. The row remains flagged as
-- published; the RLS policy on app_release_notes already hides it until
-- published_at <= now().
insert into public.app_release_notes(platform,version,title,highlights,is_published,published_at)
values (
 'android','1.0.3','Version 1.0.3',
 jsonb_build_array(
  'Redesigned Inventory, Character and Companion screens with cleaner layouts and faster navigation',
  'New Codex for resources and recipes, plus a dedicated Gem Pouch to keep inventory tidy',
  'Dungeon combat animations and smoother Companion Trials for a more cinematic feel',
  'Guild Hall construction with earlier tiers, Treasury bonuses and shared Guild Bank funding',
  'Expanded Guild weekly activities, new Guild Token Shop and illustrated component icons',
  'Fixed Guild chat delivery and isolated chat from dungeon sync for reliable messaging',
  'App-wide optimization: more background loading, session receipt caching and seamless screen transitions',
  'Dungeons: realtime watchdog, background pause, reward-protected failures and automatic replay',
  'Google account linking, Play Games status and refined sign-in and guest recovery flows',
  'Polished Rankings, Adventurer''s Journal, Mastery Hall, Achievements, Rewards Inbox and Bestiary',
  'Redesigned character creation, clearer back navigation and refreshed tutorial guidance',
  'Event Bond Candy per-companion bonus selector and quieter cosmetic unlock inbox'
 ),
 true, now() + interval '24 hours'
)
on conflict (platform,version) do update
set title=excluded.title,
    highlights=excluded.highlights,
    is_published=excluded.is_published,
    published_at=excluded.published_at,
    updated_at=now();
