-- Publish What's New for 1.0.3. The release-notes feed is independent of the
-- mandatory-update policy; this only announces the shipped build to players.
insert into public.app_release_notes(platform,version,title,highlights,is_published,published_at)
values (
 'android','1.0.3','Version 1.0.3',
 jsonb_build_array(
  'Guild Hall construction: earlier tiers, Treasury bonuses and shared Guild Bank funding',
  'Expanded Guild weekly activities, Guild Token Shop and 10x upgrade components with new icons',
  'Dungeons: realtime watchdog, chat isolation, background pause and reward-protected failures',
  'Google account linking, Play Games status and refined sign-in / guest recovery flows',
  'Game-wide performance: faster Inventory, Companion and Dungeon screens plus session receipt caching',
  'Polished Rankings, Adventurer''s Journal, Mastery Hall, Achievements, Rewards Inbox and Bestiary',
  'New Account Resource Codex, Gem Pouch storage and quieter cosmetic unlock inbox',
  'Event Bond Candy per-companion caps, redesigned character creation and clearer back navigation'
 ),
 true, now()
)
on conflict (platform,version) do update
set title=excluded.title,
    highlights=excluded.highlights,
    is_published=excluded.is_published,
    published_at=excluded.published_at,
    updated_at=now();
