# VELDRYN mobile release notes and update gate

This document describes the release workflow for the **current** app, not an automatic Play Store publisher.

## Two independent pieces

- **What's New** is compiled into the Android app in `apps/mobile/src/components/WhatsNewPanel.tsx`. Update the release marker and localized notes when preparing a player-facing release. The app shows notes once per installed version/build; if Supabase advertises a newer optional release, the notice can appear once more for that newer version. Players can reopen notes under **Settings → What's New**.
- **Release policy** is server-owned in `public.app_release_policy` and read by `apps/mobile/src/online/app-version-gate.ts`. The table contains `latest_version`, `minimum_version`, optional `force_after`, plus maintenance and message fields.

The client compares the **marketing version** (`APP_BUILD_INFO.version`), *not* the Android `versionCode`. Increment the marketing version whenever you want players to detect an update. Raising `versionCode` alone does not activate the version gate.

## Safe publishing order

1. Increment `expo.version` (marketing version) and Android `versionCode` for the next AAB. Verify the generated native Gradle values if the `android/` project is checked in.
2. Update the What's New release marker and notes in all six languages. Do not advertise incomplete features.
3. Run TypeScript, core tests and a physical Android skill/navigation/claiming smoke test.
4. Upload to Google Play, verify upgrade compatibility and rollout availability.
5. **Only after the update is actually available**, set `latest_version` to the shipped marketing version in Supabase. This enables optional-update notices without blocking older clients.
6. If the old build must stop working, raise `minimum_version` to the required version (or set a future `force_after` while leaving `minimum_version` at the supported baseline). Never force users onto a version that is not available to their device.
7. For maintenance, set `maintenance_mode` and a user-facing `maintenance_message`; turn it off when service is restored.

For example, after **0.9.6** has rolled out, the release policy for Android might be:

```sql
update public.app_release_policy
set latest_version = '0.9.6',
    minimum_version = '0.9.5',
    force_after = null,
    updated_at = now()
where platform = 'android';
```

This example is **optional**, not a command to run automatically. To require 0.9.6 later, update `minimum_version` to `0.9.6` only after Play rollout is confirmed.

## Smoke checks before promoting to main

- Same installed version as `latest_version`: no update prompt.
- Older supported build: optional-update notice, dismissal remembered, Settings link still works.
- Build below `minimum_version`: blocking update screen linking to Play.
- `force_after` in the future: optional; after its timestamp: required.
- Maintenance: maintenance screen takes priority over the game.
- No policy/network timeout: the current client may continue without a blocking gate; keep gameplay API compatibility checks server-side.
- New notes: first launch shows once without covering an active tutorial or welcome-back reward.
- Normal gameplay: Cooking, Alchemy, Enchanting, bank sales, quests and AFK summary are smoke-tested in the Android AAB.

**Caution:** This release gate is a client UX control. Do not rely on it alone as a security or data-migration enforcement mechanism.
