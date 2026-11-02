-- Refresh the 1.0.4 What's New with the final shipped contents. Kept as an
-- UNPUBLISHED draft (is_published=false): the feed's RLS policy hides it until
-- published, so this is safe to deploy early. Publish only once the 1.0.4 build
-- is live on Google Play:
--   update public.app_release_notes
--     set is_published=true, published_at=now()
--     where platform='android' and version='1.0.4';
insert into public.app_release_notes(platform,version,title,highlights,is_published,published_at)
values (
 'android','1.0.4','Version 1.0.4',
 jsonb_build_array(
  'Redesigned Guild Hall: daily check-in and Guild Token claiming are now front and center, with a Guild widget on your home dashboard',
  'New Guild Skills screen in the Guild Hall — see your skill points, ranks and Guild Bank material readiness',
  'Smoother, more compact Dungeon combat and a clearer rewards flow',
  'Upgraded the game engine for better performance, faster screens and improved stability',
  'Fixes: inventory lock and favorite now save reliably, Guild Projects load correctly, and chat input stays above the keyboard'
 ),
 false, now()
)
on conflict (platform,version) do update
set title=excluded.title,
    highlights=excluded.highlights,
    updated_at=now();
