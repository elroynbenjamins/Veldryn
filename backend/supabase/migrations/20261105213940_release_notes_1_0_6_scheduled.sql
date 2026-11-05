-- What's New for Android 1.0.6.
-- Published notes are still hidden from public clients until published_at
-- reaches the scheduled time (RLS policy + mobile feed date filter).
-- Schedule: 2026-11-06 21:39:39 UTC = 22:39:39 Europe/Amsterdam.
-- Store an absolute release time so retrying this migration cannot shift
-- an announcement back another 24 hours.
insert into public.app_release_notes(platform,version,title,highlights,is_published,published_at)
values (
 'android','1.0.6','Stronger Together',
 jsonb_build_array(
  'Guild Projects: Track your contributions and see how your guildmates help reach shared goals.',
  'Equipment Comparison: Compare gear stats before equipping and find your next upgrade.',
  'Alchemy: Discover new combat potions to prepare for challenging dungeon encounters.',
  'Guilds & Parties: Enjoy improved guild interfaces, clearer rewards, and refined party recruitment.',
  'Quests & Dungeons: Experience cleaner quests, improved battles, and smoother navigation.',
  'More Polish: Expanded translations, clearer messages, and fixes across chat, inventory, and companions.'
 ),
 true,
 '2026-11-06 21:39:39.336520+00'::timestamptz
)
on conflict (platform,version) do update
set title=excluded.title,
    highlights=excluded.highlights,
    is_published=excluded.is_published,
    published_at=excluded.published_at,
    updated_at=now();
