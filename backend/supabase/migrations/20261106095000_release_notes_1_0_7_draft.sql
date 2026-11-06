-- VELDRYN 1.0.7 What's New — editorial draft, intentionally NOT published.
-- This seed must not modify required-version policy or expose the notes
-- before Android 1.0.7 and its corresponding online migrations are ready.
-- 2099 placeholder prevents accidental publication by toggling only is_published.
-- At launch: set BOTH is_published=true AND published_at=real release time.
insert into public.app_release_notes (
  platform, version, title, highlights, is_published, published_at
)
values (
  'android', '1.0.7', 'Faith & Fellowship',
  jsonb_build_array(
    'Faith Reimagined: Choose from 18 blessings for combat, gathering, production, and XP.',
    'Better Quest Rewards: Earn Companion Essence and useful equipment-upgrade materials instead of generic ore caches.',
    'Guild Projects: Join in midweek and contribute; new weekly Gold rewards support the Guild Bank.',
    'Guild Progression: Guild Bank Gold now helps fund Construction and Guild Skill upgrades.',
    'Clearer Progress: Improved Faith selection, Quest reward previews, and Guild Project reward information.'
  ),
  false,
  '2099-01-01 00:00:00+00'::timestamptz
)
on conflict (platform, version) do nothing;
