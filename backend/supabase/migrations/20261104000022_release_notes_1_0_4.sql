-- What's New for 1.0.4. Created as an UNPUBLISHED draft (is_published=false)
-- so it is not announced to players still on 1.0.3 before the 1.0.4 build is
-- actually live on Google Play. Publish it only once 1.0.4 has rolled out:
--   update public.app_release_notes
--     set is_published=true, published_at=now()
--     where platform='android' and version='1.0.4';
-- The feed's RLS policy already hides rows while is_published is false or
-- published_at is in the future, so deploying this migration early is safe.
insert into public.app_release_notes(platform,version,title,highlights,is_published,published_at)
values (
 'android','1.0.4','Version 1.0.4',
 jsonb_build_array(
  'Upgraded the game engine for better performance, smoother screens and improved stability',
  'Chat input now stays above the keyboard so you can always see what you are typing',
  'Faster loading with more work done in the background for seamless gameplay',
  'Various bug fixes and polish across inventory, guild, dungeons and account screens'
 ),
 false, now()
)
on conflict (platform,version) do update
set title=excluded.title,
    highlights=excluded.highlights,
    updated_at=now();
