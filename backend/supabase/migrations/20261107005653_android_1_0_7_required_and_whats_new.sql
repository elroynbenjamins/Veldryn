-- VELDRYN Android 1.0.7 rollout: require the approved build and publish
-- player-facing What's New in the same database migration.
-- Version 20261107005653 matches the applied production migration.
-- Other platforms, maintenance settings and older release notes are unchanged.
DO $guard$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.app_release_policy WHERE platform='android' AND latest_version='1.0.6' AND minimum_version='1.0.6')
 THEN RAISE EXCEPTION 'Unexpected Android release gate; inspect before changing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.app_release_notes WHERE platform='android' AND version='1.0.7' AND is_published=false)
 THEN RAISE EXCEPTION 'Android 1.0.7 draft missing or already published; inspect before changing'; END IF;
END $guard$;
UPDATE public.app_release_policy
SET latest_version='1.0.7',minimum_version='1.0.7',force_after=NULL,
 title='VELDRYN 1.0.7 update required',
 message='Update VELDRYN to version 1.0.7 on Google Play to continue your adventure.',
 updated_at=now()
WHERE platform='android' AND latest_version='1.0.6' AND minimum_version='1.0.6';
UPDATE public.app_release_notes
SET title='Faith & Fellowship',
 highlights=jsonb_build_array(
  'Faith: Choose blessings for combat, gathering, production and XP.',
  'Guild Projects: See contributions from your guildmates and work toward shared weekly goals.',
  'Guild Tokens: Daily Activity rewards now count regular hunting and skilling.',
  'Quests: Clearer guidance and more useful progression rewards.',
  'Food & Potions: Easier healing controls, improved food balance and role-focused dungeon potions.',
  'More Polish: Clearer VIP and VIP+ details, inventory improvements and expanded translations.'
 ),
 is_published=true,published_at=now(),updated_at=now()
WHERE platform='android' AND version='1.0.7' AND is_published=false;
DO $verify$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.app_release_policy WHERE platform='android' AND minimum_version='1.0.7' AND latest_version='1.0.7' AND force_after IS NULL)
 OR NOT EXISTS(SELECT 1 FROM public.app_release_notes WHERE platform='android' AND version='1.0.7' AND is_published AND published_at<=now())
 THEN RAISE EXCEPTION 'Release gate and notes did not both update'; END IF;
END $verify$;
