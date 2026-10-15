# VELDRYN release announcements and update requirements

Release notes and the minimum supported app version are **separate controls**. Publishing What's New must never force a player to update.

## Publish a release announcement

After a build is accepted by Google Play, deploy `20261015090000_public_release_notes.sql`, then publish release notes for that actual app version:

```sql
insert into public.app_release_notes(platform,version,title,highlights,is_published,published_at)
values (
  'android', '0.9.6', 'Version 0.9.6',
  '["Explain the changes actually shipped","Include important fixes","Keep each highlight short"]'::jsonb,
  true, now()
)
on conflict (platform,version) do update
set title=excluded.title,highlights=excluded.highlights,
    is_published=excluded.is_published,published_at=excluded.published_at,updated_at=now();
```

Replace the example version and content; do not publish unshipped features.

- On the first start of the installed version, a published matching release note is shown once per device.
- Players can reopen What's New from More or Settings at any time.
- If `latest_version` is newer than the installed version, the panel offers an optional Play Store update.
- Release notes are fetched best-effort; missing tables/network do not block gameplay.

## Require an update only when necessary

The existing `public.app_release_policy` controls compatibility:
- `latest_version`: optional update notice and Play Store link.
- `minimum_version`: hard block only for binaries **older** than this value.
- `force_after`: optional scheduled hard block of older-than-latest builds.
- `maintenance_mode`: a separate maintenance lock.

Do not raise the minimum version until the replacement has been distributed and tested on Google Play. Publish the required version on Play first, allow rollout time, then adjust the policy. The current installed version is taken from the native app binary.
