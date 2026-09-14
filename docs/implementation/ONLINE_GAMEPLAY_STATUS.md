# Online gameplay deployment and release status

User-selected release target: fully server-backed gameplay before release.

Latest continuation: [Live matching and ready-check integration](LIVE_READY_INTEGRATION.md) adds automatic bounded matching, persistent ready/refill/acceptance, offline deadline cleanup and an internal mobile lobby. The fresh database passed **58 migrations and seven SQL suites**; hosted concurrent matching/acceptance and real deadline tests passed. The complete regression run initially passed 85/86 checks; its failed companion integration test and subsequently observed compatibility issues were repaired and rechecked. Final combined results and export evidence are in `online-verification/live-ready-final.json`. Production co-op remains disabled.

The approved gameplay migration, authenticated endpoint and Auth configuration are live on Veldryn project `nyjwigipamnvpdvpauuv`. Hosted password sessions, persistent characters, elapsed combat, Party contributions, concurrent idempotency and wallet synchronization pass end-to-end tests. The local app is configured for server gameplay through its ignored `.env.local`; only public client configuration is stored there.

This is not a complete online-release sign-off. Production co-op integration remains unfinished. Confirmation and recovery emails both arrived at the user-authorized address, as confirmed by the recipient in this task. Android emulator password sign-in, session restoration, server character creation and real elapsed hunting/reward collection have passed. The internal Android APK built successfully, passed signature/install checks and restored the server character after sign-in, cold restart and an installed upgrade. Native expired-link routing and visible error feedback pass. The physical device is a Samsung S24+; its Android version and physical results are not yet verified. Email delivery does not establish native PKCE callback completion.

Internal device handoff: `output/android/VELDRYN-internal-20260912.apk` (206,890,619 bytes) and its `.sha256` file. This is an internal debug-signed test build with co-op disabled, not a store release. It uses the consistent isolated artwork snapshot captured for native compilation. A later concurrent ingredient-art edit temporarily blocked a fresh iOS export while its images were missing. The images subsequently arrived and the final current-source iOS export passed; the artwork edit was preserved.

## Implemented and checked

- Shared typed gameplay commands reuse the existing mobile engine for combat, gathering, crafting, quests, equipment, inventory, storage, cosmetics and event actions.
- The authenticated `gameplay` Edge Function rejects client snapshots, clocks, XP, Gold, rewards and unknown arguments. Supabase Auth verifies every token before privileged database access.
- Server-owned state, database time, account identity, version checks, wallet conflict checks and persistent idempotency receipts prevent forged progress, overwritten rewards and duplicate settlements.
- The mobile repository persists uncertain requests for retry, keeps local saves separate and waits for server confirmation. Existing screens dispatch commands in online mode. Account creation, password sign-in, confirmation resend, password recovery and PKCE callback handling are wired.
- SecureStore session chunking supports large sessions. Native sign-in callbacks are allowlisted and the hosted minimum password length is eight characters.
- Actual rollback database suites pass for the applied migration and both existing Party/v15-compatibility suites. Shared command/auth/retry tests and gameplay HTTP tests pass. The progression fixture now passes for all nine classes without changing XP rates, item stats, targets or its existing 30-hour tolerance. It models the separately budgeted regional equipment as a complete outfit; individual greedy swaps previously rejected upgrades because they removed the novice set bonus. Measured combat-only times are 252–310 hours.
- The hosted race test found an intermittent retry window between receipt lookup and state loading. The endpoint now rechecks receipts after a stale read. Local tests reproduce this interleaving; the deployed endpoint passed the real concurrent replay test afterward.
- Mobile reads never replace a newer revision with a late response, and switching accounts immediately hides the previous account's snapshot. Pending commands retain the same key across uncertain network failures.

## Approved deployment applied

The user explicitly approved the following remote changes. All three were applied successfully to `nyjwigipamnvpdvpauuv`. The Auth push reported exactly two changed properties and twelve undeclared properties left unchanged.

Applied actions:

1. Applied `backend/supabase/migrations/20261011000000_authoritative_gameplay.sql`. This appends server-owned gameplay state/RPCs, integrates verified Party/Guild progress and closes prototype client-controlled progression/economy paths. No existing migration was edited and existing local saves are preserved. At that deployment, the final dry run reported an empty pending migration list; subsequent co-op migrations remain undeployed.
2. Deployed `backend/supabase/functions/gameplay/index.ts`, generated from `backend/online/edge.ts` and the shared engine. The handler verifies every session against Supabase Auth. Gateway JWT verification is disabled only because this explicit verification runs inside the handler; unauthenticated requests receive 401. The tested retry fix was subsequently deployed to the same endpoint.
3. Added `veldryn://auth` to the Auth redirect allowlist and changed the minimum password length from six to eight characters. Existing email confirmation/MFA/provider settings were preserved. Local `config.toml` now matches these two approved values.

## Verification evidence

- `node tools/check-v16.mjs`: **81/81 PASS**. Covers both backend builds/typechecks, all configured backend suites, full mobile/core typechecks, every compiled mobile test, migration invariant audit and chat-pilot tests. Its complete current results are in [repository-checks.json](v16-verification/repository-checks.json). The final terminal-run projection adjustment is additionally checked by its focused backend regression suite.
- `node tools/test-online-hosted.mjs`: **PASS**. Uses admin-confirmed disposable accounts without sending email. Tests real password sessions, identity isolation, server character creation, repeated creation, conflicting keys, forged input/session rejection, direct database write denial, actual elapsed combat, Party Contract credit, one receipt per successful action, identical/different concurrent requests, persistence after another login and preservation of an external wallet reward. All fixture cleanup passed. [Exact results](online-verification/hosted-gameplay.json).
- `supabase db query --linked --file supabase/tests/online_gameplay.sql`: **PASS** on the applied schema. Exercises private-state/RPC restrictions, legacy mutation denial, version conflicts, reward-wallet conflicts and replay.
- Both `party_v16.sql` and `party_v16_safety.sql`: **PASS** after the gameplay migration. Recruitment, seekers, contribution/reward rules, Party Chat, existing blocks, shared combat deduplication and Live Chat epochs remain covered.
- Production schema lint at the approved gameplay deployment: **PASS**, no schema errors. Its deployment dry run was empty then; the three later co-op migrations remain deliberately undeployed.
- Android internal APK / Hermes bundle: **PASS**. Final `:app:assembleRelease`, signature verification, ARM64/x86_64 metadata, emulator install, native sign-in, session/progress restoration and expired-link feedback all pass. The final mobile TypeScript check also passes.
- iOS Hermes export: **PASS** on the final current source. An intermediate rerun failed while the concurrent ingredient-art update referenced 20 missing images. After those images arrived, all references were checked and the export passed. This late artwork change is outside the isolated Android test snapshot and was preserved. No native iOS device test was possible here.
- Source lint: **NOT CONFIGURED** in either package. `git diff --check` for the continuation source scope: **PASS**. The whole-worktree check also passes after removing whitespace from one blank line in `WorldScreen.tsx`; its functional/artwork changes were retained.
- Android emulator interaction: **PASS for the tested flows**. Expo Go and the standalone APK both restore the same server character, XP 1820 and Gold 240. The Expo Go hunt completed 130 encounters and collected once; the standalone APK restored that result. Physical interaction, successful native PKCE confirmation/recovery and accessibility remain unverified. The earlier boot failure was resolved with the isolated AVD configuration.
- Fresh migration chain: **PASS: all 56 migrations from an empty application schema**, followed by all five SQL suites (`party_v16.sql`, `party_v16_safety.sql`, `online_gameplay.sql`, `online_coop_loadouts.sql`, `online_qmode_runtime.sql`). This ran on a separate disposable Supabase project. Production was never reset. Docker remains unavailable, but is no longer a blocker for fresh-chain verification.

## Continued release implementation

### Durable QMode integration (test environment)

The authenticated co-op Edge Function was deployed and tested on disposable project `byxmmiobxaphcozutotq` only. That test project has now been deleted after all validation and fixture cleanup passed. The production co-op feature flag remains off. Migrations `20261012000000_online_coop_loadout_publication.sql`, `20261013000000_online_qmode_runtime.sql` and `20261014000000_online_qmode_worker.sql` are not yet deployed to production.

QMode now starts from real server-owned equipment and opted-in Echoes, persists its private run/seed/outcomes, exposes only sanitized snapshots, resumes after reconnect, and atomically records choices, contribution evidence, entitlements and reward claims. Battles remain hidden until the database clock reaches their simulated duration. A bounded pg_cron worker finishes pending rooms while the app is closed, using the existing due-job table and retaining run/job locks through settlement. Jobs retry up to five attempts; failed jobs remain visible for diagnosis. No scheduler service key is stored in SQL. A real-deadline integration test observed the scheduled room completion using read-only snapshots, without gameplay/load/finalize/worker requests.

`node tools/test-online-qmode.mjs --http`: **PASS** against the deployed test endpoint, including bearer verification, rejected client authority, concurrent starts, conflicting keys, active-account reservations, denied Echo-owner access, raw-route privacy, sanitized snapshot access, concurrent choices/finalization, offline worker completion, one reward ledger credit and reservation release. Disposable account cleanup succeeded. The first room completed at its real deadline through pg_cron; later room deadlines were advanced only by the guarded test harness on the disposable database. This is not a physical-device duration test. Evidence: `online-verification/hosted-qmode.json`.

The test exposed a second receipt-visibility race: a concurrent duplicate could observe the newly pending node after its first receipt lookup. The runtime now rechecks the receipt before returning `node_resolving`; a focused regression test and the deployed HTTP rerun pass. Canonical JSON hashing also prevents JSONB key ordering from invalidating eligible Echo snapshots.

The mobile QMode screen now starts, chooses actual route options, resumes, subscribes to sanitized Realtime snapshots with polling fallback, toggles explicit Echo sharing and claims its own entitlements. A durable per-account command journal preserves uncertain request keys across restart. Fixture previews remain isolated from real mutations. Failed/completed runs expose no further route choices.

Additional files added in this continuation:

```text
apps/mobile/react-native.config.js
apps/mobile/src/core/coop-command-journal.ts
apps/mobile/tests/coop-online-runtime.ts
backend/online/coop.ts
backend/online/coop-edge.ts
backend/online/qmode-runtime.ts
backend/online/tests/qmode-runtime.ts
backend/supabase/functions/coop/index.ts
backend/supabase/migrations/20261013000000_online_qmode_runtime.sql
backend/supabase/migrations/20261014000000_online_qmode_worker.sql
backend/supabase/tests/online_qmode_runtime.sql
tools/test-online-qmode.mjs
docs/implementation/online-verification/native-android.json
docs/implementation/online-verification/android-apk.json
docs/implementation/online-verification/hosted-qmode.json
docs/implementation/online-verification/continuation-checks.json
docs/implementation/online-verification/test-project-cleanup.json
docs/implementation/online-verification/native-fixture-cleanup.json
docs/implementation/NATIVE_DEVICE_VALIDATION.md
```

Additional existing files changed:

```text
apps/mobile/src/core/coop-presentation.ts
apps/mobile/src/core/coop-qmode.ts
apps/mobile/src/online/coop-client.ts
apps/mobile/src/online/coop-entry-source.ts
apps/mobile/src/online/coop-qmode-source.ts
apps/mobile/src/online/AuthSessionProvider.tsx
apps/mobile/src/components/coop/CoopRunOverview.tsx
apps/mobile/src/screens/CoopExpeditionScreen.tsx
apps/mobile/src/screens/WorldScreen.tsx
backend/src/server/coop/qmode.ts
backend/src/server/coop/qmode-public-projection.ts
backend/src/server/coop/__tests__/phase6-public-projection.ts
backend/supabase/config.toml
tools/build-online.mjs
docs/implementation/COOP_CURRENT_STATUS.md
```

Preservation/conflicts: existing Party, Chat, recruitment, matchmaking, runtime, job, entitlement and ledger systems were reused. The only raw expedition read-policy changes restrict new co-op rows to their sanitized snapshots; legacy runs retain their prior member access. The Expo autolinker generated an incorrect `expo.core.ExpoModulesPackage` import under pnpm; `react-native.config.js` supplies the installed Expo module's correct import without upgrading dependencies. Android compilation uses an isolated short path because Windows CMake failed under the longer temporary path. A native test found account-link errors invisible while already signed in; the auth provider now displays a native alert and clears stale errors on a successful sign-in/recovery event. The corrected APK passed the same test. Concurrent artwork/UI edits are preserved and are not attributed to this implementation.

Still pending: production Live queue/ready/vote/recovery/chat integration, production co-op deployment, physical Samsung testing, native PKCE email-link completion, complete co-op runtime localization, and noncombat personal merchant spending/boon effects. Frostmarch/Ashlands encounters and event expeditions remain gated. These are release limitations, not claims of completed features. Existing v8–v15 regression suites verify preservation within their coverage; that does not establish a separate end-to-end v1–v8 implementation audit.

- Added `20260906000000_hosted_social_baseline.sql` before the migrations that consume hosted-only social structures. Fresh databases lacked `guild_applications`, the two guild recruitment columns and the chat severity default. The production catalog was compared inside a rolled-back transaction before deployment; the migration is a no-op on those existing production objects and was applied successfully. No historical migration was overwritten.
- Added `20261012000000_online_coop_loadout_publication.sql` on the disposable test project only. It derives ownership from server state, checks revisions, reuses saved loadouts/Echo profiles/receipts, requires explicit Echo opt-in, expires published profiles after 24 hours and excludes blocked accounts in both directions. Its rollback database suite passes. It is not yet deployed to production.
- Added the trusted solo-to-co-op equipment adapter and authenticated entry/Echo-consent HTTP handler. Client roles, stats, account IDs and clocks are rejected. The handler is tested but not yet exposed as a production co-op endpoint.
- Fixed class-name normalization, non-finite readiness inputs, the regional readiness denominator, preservation of class IDs in frozen combatants and taunt threat normalization. Added the missing Bastion and Dreadguard combat kits. These changes affect the co-op adapter/engine; solo item stats, XP and rewards are unchanged.
- All nine classes pass the actual saved-equipment adapter tests and 2,400 full Q-Mode simulation runs across two dungeon level bands. The complete repository check run passed 81/81 before the later concurrent ingredient-art edit; targeted checks cover subsequent auth/projection fixes.
- Auth callback parsing now handles errors in both the query and fragment without accepting unrelated links. The native auth gate uses light status-bar icons and preserves button taps while the keyboard is open.

New source/test files in this continuation:

```text
backend/online/coop-loadout.ts
backend/online/coop-entry.ts
backend/online/tests/coop-loadout.ts
backend/online/tests/coop-entry.ts
backend/online/tests/coop-published-balance.ts
backend/supabase/migrations/20260906000000_hosted_social_baseline.sql
backend/supabase/migrations/20261012000000_online_coop_loadout_publication.sql
backend/supabase/tests/online_coop_loadouts.sql
tools/test-auth-email-delivery.mjs
tools/test-fresh-migration-chain.mjs
```

Existing files incrementally changed in this continuation:

```text
apps/mobile/App.tsx
apps/mobile/src/core/auth-callback.ts
apps/mobile/tests/online-gameplay.ts
backend/package.json
backend/src/server/combat/content/launch-combat.ts
backend/src/server/combat/snapshot-adapter.ts
backend/src/server/coop/role-readiness.ts
backend/src/server/coop/loadout-snapshots.ts
backend/src/server/coop/normalization.ts
backend/src/server/coop/__tests__/phase3-normalization.ts
tools/check-v16.mjs
docs/implementation/ONLINE_GAMEPLAY_STATUS.md
```

Evidence is in `online-verification/email-confirmation.json`, `email-recovery.json`, `social-baseline-noop.json` and `fresh-migrations.json`. The temporary project's schema is used for destructive fresh-chain tests; its target guard refuses production. The user's real email account and password are not changed by native test fixtures.

## Exact files added in the online work

Paths are relative to `C:\Users\elroy\OneDrive\Documents\ChatGPT\Veldryn`. Earlier v16 files are inventoried separately in [V16_IMPLEMENTATION_REPORT.md](V16_IMPLEMENTATION_REPORT.md).

```text
apps/mobile/src/core/auth-callback.ts
apps/mobile/src/core/game-commands.ts
apps/mobile/src/core/online-game-repository.ts
apps/mobile/src/online/AuthSessionProvider.tsx
apps/mobile/src/online/gameplay.ts
apps/mobile/src/online/useOnlineGame.ts
apps/mobile/tests/online-gameplay.ts
backend/online/edge.ts
backend/online/gameplay.ts
backend/online/tests/gameplay.ts
backend/tsconfig.online.json
backend/supabase/functions/gameplay/index.ts
backend/supabase/migrations/20261011000000_authoritative_gameplay.sql
backend/supabase/tests/online_gameplay.sql
docs/implementation/ONLINE_GAMEPLAY_STATUS.md
docs/implementation/online-verification/hosted-gameplay.json
docs/implementation/online-verification/deployment-checks.json
tools/build-online.mjs
tools/online-context.mjs
tools/configure-online-mobile.mjs
tools/test-online-hosted.mjs
```

## Exact files changed in the online work

```text
apps/mobile/.env.example
apps/mobile/App.tsx
apps/mobile/package.json
apps/mobile/src/components/OnlineAccountPanel.tsx
apps/mobile/src/components/OnlineGuildPve.tsx
apps/mobile/src/core/live-events.ts
apps/mobile/src/core/types.ts
apps/mobile/src/online/account.ts
apps/mobile/src/online/character-sync.ts
apps/mobile/src/online/supabase.ts
apps/mobile/src/screens/EventScreen.tsx
apps/mobile/src/screens/GuildScreen.tsx
apps/mobile/src/screens/SettingsScreen.tsx
apps/mobile/tests/progression-balance.ts
backend/package.json
backend/pnpm-lock.yaml
backend/supabase/config.toml
docs/implementation/README.md
docs/implementation/V16_IMPLEMENTATION_REPORT.md
docs/implementation/v16-verification/repository-checks.json
tools/check-v16.mjs
```

Ignored `.env.local`, compiler/export outputs, temporary test scripts/logs and emulator files are not source additions. Concurrent startup, class-icon, character-art and other `output/` work was preserved and is not claimed as this implementation.

## Existing-code conflicts and preservation

- The old snapshot-upload adapter trusted local level/XP/Gold/equipment. Its compatibility entry now refreshes server state; existing screens send validated intents through the shared game engine. Existing local saves remain readable in offline mode and are not silently imported as trusted online progress.
- The server uses the existing wallet, Party membership, Contract receipt/scoring, Guild weekly PvE and event contribution tables. No second Party, Social, Guild, Chat, Recruitment or matchmaking system was created.
- Prototype client-written Guild point totals were replaced in online UI by verified gathering/crafting/combat contributions using existing weekly caps. Two legacy RPCs that accepted caller-supplied economy/progress values are now service-only. Online-managed characters reject parallel legacy progression writes.
- Existing activity, equipment, food, quest, event and reward calculations are reused. Only online event community completion comes from the actual shared contribution ledger rather than the offline time simulation.
- The old account callback passed a full URL to a code exchange. It now validates the app route and extracts the PKCE code, with callbacks handled globally and large native sessions stored in secure chunks.
- Unrelated v8–v15 content, systems and current concurrent UI/art changes were retained. Existing Live Dungeon role validation still requires exactly **1 Tank / 2 Damage / 1 Support**; persistent Parties retain flexible roles. The co-op release flag remains off.

## Remaining work

- Queue admission, automatic matching and persistent ready checks are tested; the internal mobile lobby remains gated. Exact files, migration and results: [LIVE_READY_INTEGRATION.md](LIVE_READY_INTEGRATION.md). No production changes were made.
- Finish Live run creation/progression/voting/recovery/chat integration and the remaining gameplay/content gates; do not enable co-op before these pass. QMode integration and its offline worker are tested but not deployed to production.
- Verify the native confirmation/recovery callback and password-update flow. Actual email delivery is complete for both email types; the real user's password has not been changed.
- Run the supplied internal APK on the Samsung S24+ using `NATIVE_DEVICE_VALIDATION.md`; physical interaction/accessibility and store-release signing remain outstanding.
- Repeat the complete migration chain and database suites after any further migrations. The latest 58-migration validation project and ready/queue fixtures have been deleted. The guarded native fixture was also removed; the real email account was preserved.

The original v16 overlay is implemented and deployed. The approved online gameplay/account deployment is implemented and tested to the extent listed above. The larger fully server-backed release remains in progress, with the outstanding work explicitly listed here.
