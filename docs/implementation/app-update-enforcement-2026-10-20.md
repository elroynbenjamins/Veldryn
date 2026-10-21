# Mandatory update reliability pass — 2026-10-20

The production minimum has **not** been raised. Android and other platform rows still have latest/minimum `0.1.0`, no force date, maintenance off, and their original `updated_at` timestamp. No database migration or policy mutation was needed.

Local `main` app config is `0.9.5`; this working branch is `1.0.0`. The client changes below need a new native build. They do not alter a binary already submitted to Google Play.

## Client behavior

- Persist the last verified policy separately for each backend, platform and release channel. Reevaluate its minimum and scheduled force date on every check, including after restart.
- Remove the 2.5-second allow-on-timeout race. Network reads abort after eight seconds; a missing/unreadable cache and failed network check show a non-dismissible retry screen. A valid cache still enforces its known requirements during connection failures.
- Recheck on foreground, once per minute while active, and through the visible Retry button. A successful policy rollback can clear a cached block.
- Attach the native installed version and platform to direct online Edge requests. A server update/maintenance rejection immediately feeds the blocking UI and persists its policy. An older overlapping policy read cannot undo that rejection.
- Preserve pending gameplay/co-op command receipts on HTTP 426. Retry buttons use the existing asynchronous button spinner and duplicate-tap protection.
- Display the actual effective required version when a scheduled force date makes the latest release mandatory. New connection/retry copy is translated for all six supported languages.

## Server behavior and rollout compatibility

Both gameplay and co-op Edge entrypoints now enforce the authoritative policy before invoking their route handlers. This also covers guild-shop purchases/claims/donations and regional combat under the gameplay entrypoint. Preflight permits the two version headers. Existing Supabase Auth validation inside each route remains required before gameplay/service-role RPC access.

Below-minimum or scheduled-forced clients receive HTTP 426 with the policy; maintenance receives 503 with the policy. Unavailable/invalid policy reads fail closed with a retryable 503. The loader uses the table's existing public SELECT path and a five-second timeout; it does not use a stale allow-cache or broaden database grants.

Headerless legacy clients have compatibility baseline `0.1.0`. Missing/unknown platforms are checked against all platform rows. Thus existing binaries remain compatible now, but a future minimum above `0.1.0` rejects headerless binaries too. Do not raise that minimum until players can obtain a build containing the version headers.

This gate covers the two Edge APIs, not direct social/reward REST/RPC calls, authentication or billing. Version headers are compatibility metadata and can be forged by a modified client; they are not binary attestation or an anti-cheat mechanism.

## Validation and production receipt

- All **211** mobile core checks passed, including native version selection and account/session race suites. Full mobile and backend online TypeScript checks passed.
- Added client regressions for cache persistence across restart, failed first verification, verified rollback, overlapping reads, backend rejection persistence, force-date boundaries, native transport metadata, pending-command retention, and retry-screen loading behavior.
- Added backend regressions for legacy compatibility, minimum and scheduled versions, maintenance, missing policies, failures, preflight, and the public-key policy loader. Existing gameplay, co-op entry, guild-shop and regional-combat tests passed.
- Initial deployment exposed a production ACL difference: `service_role` lacks SELECT on this public control table. The previous handlers were restored, the loader changed to the existing public read path, and the corrected functions redeployed. No permissions or policy values changed.
- Final deployment: gameplay **32**, co-op **15**, both ACTIVE. Downloaded source confirms the corrected release gate and public-key loader. Readback differs from the subsequently changed local bundles only in two unrelated Veilbreak emote display names; no additional deployment was made for those concurrent local edits. Existing explicit Auth contracts passed their validator.
- Twelve read-only production smoke checks passed: OPTIONS, missing authentication, rejected `0.0.0`, headerless/current invalid-session handling, and rejection before shop/regional execution. These checks use deliberately invalid tokens and do not mutate player data.

Evidence: `output/release-gate-core-tests.txt`, `output/release-gate-account-tests.txt`, `output/release-gate-live-smoke.json`, `output/release-gate-policy-after.json`, `output/release-gate-functions-after.json`, and `output/release-gate-deployment-hashes.json`.

## Activation after Play approval

1. Build and submit the intended release containing these client changes. Verify its installed native version and headers on a real Android device.
2. Confirm that exact release is obtainable on the Google Play production track by every affected player, including applicable regions and rollout percentage. Approval alone is not distribution availability.
3. Set the Android latest/minimum or force date deliberately for that verified release. Keep the other platform row independent.
4. Smoke-test an older installation (blocked, correct store link), the supported installation (can sign in/play), return from store/foreground, temporary disconnection, and pending-command retry after updating. Roll back the minimum/force date if distribution problems appear; connected clients clear the cached requirement on a successful recheck.

No Play submission, signed AAB or real-device release validation was performed in this pass.
