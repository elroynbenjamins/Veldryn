# Testing readiness — 24 September 2026

Scope selected by the user: **online solo and Q-Mode first; Live remains disabled**.
Base branch: `reconcile/class-skill-affinities-20260924`, commit `268bbb3e`, plus the uncommitted fixes described below.

**Decision: staging is available for controlled testing, but this is not a broad release sign-off.** The main mobile suite and hosted solo/Q-Mode transaction flows pass. Party shared-credit/RLS, native device validation, and migration ordering remain open.

## Environment and launch

- New project: [Veldryn Staging 20260924](https://supabase.com/dashboard/project/iqfmmpvwanvvmxcftfxw), organization DeveloperElroy, London (`eu-west-2`). Supabase quoted $0/month when created.
- Staging has 164 migration versions and freshly built `gameplay` and `coop` Edge Functions. The final migration dry run is empty.
- No production deployment or production migration was performed in this pass. The production solo test used isolated fixtures and cleaned them up.
- Start the staging app from the repository root: `node tools/start-staging-mobile.mjs --web --port 8084`. This uses the public staging settings in `apps/mobile/eas.json` and ignores local dotenv settings.
- The `staging` EAS build profile produces an internal Android APK with online solo and Q-Mode enabled and Live disabled. An APK from this pass has **not** been built or installed. The older September 12 APK does not contain these changes.
- Staging accounts are separate from production. Q-Mode requires eligible, consenting Echoes from other accounts. Automated tests created four fixtures and removed them afterward; they did not leave a permanent test roster.
- Nine active staging-only Echoes provide one level-100, opted-in profile for each launch class. Their source level meets every dungeon's eligibility requirement, while the server down-syncs their combat snapshot to each dungeon's recommended level before a run. Echo publications expire after 24 hours; run `node tools/provision-staging-echoes.mjs --refresh` before a longer test window. The non-secret account and profile registry is `online-verification/staging-echoes.json`.

## Verified results

| Area | Result and limits |
| --- | --- |
| Main mobile suite | All 171 ordered checks passed after fixes. `npm run test:core` now works within Windows command-length limits. |
| Mobile TypeScript | Full typecheck passed. |
| Android JavaScript/Hermes export | Passed after the onboarding, hunt-action and health-display fixes. This is not a native installation test. |
| Control Center | `npm run verify` passed its 16 tests, build, SQL checks and packaging. Hosted admin configuration was not certified. |
| Hosted solo | Authentication, account isolation, authoritative time/rewards, concurrent claim replay, wallet conflicts, Party contribution, persistence and cleanup passed against the existing live endpoint. Evidence: `online-verification/hosted-gameplay.json`. |
| Hosted Q-Mode | Four actual authenticated HTTP runs on staging passed: one defeat and three successful clears. The latest clear ran after the EXP_004 balance update was deployed to the staging co-op function. The first room used a real timer and scheduler; later rooms were advanced explicitly on staging to exercise settlement races. Reward claims credited once, reservations released, and no fixture accounts remained. Evidence: `hosted-qmode.json` and `hosted-qmode-defeat.json`. |
| Online server tests | Fresh-build gameplay, regional combat, co-op loadouts/entry/LFG, Q-Mode runtime, event expeditions, and Live queue/ready contracts passed. The final 9,600-run matrix used the same level-100 Echo source profiles as staging and passed across all nine classes and launch expeditions; EXP_004 ranged from 87–99%, with the pressure-sensitive Ironwarden/Stonecaller/Hexweaver/Knife Dancer roster at the requested 87% lower launch target. The co-op loadout contract explicitly verifies a level-100 Echo down-syncs to level 25 for an early dungeon. The Live contract tests verify safety boundaries only; staging client configuration still disables Live progression. |
| Guild runtime | Full backend typecheck, guild progression smoke, and production smoke passed from a fresh build after restoring the missing rank-cost tables. |
| Social Profile | Full mobile core suite passed again, including profile presentation, customization drafts, privacy/audience preview, mastery showcases, social identity, invitations and player-card contracts. Browser review confirmed the offline Social Profile state explains that publishing requires sign-in instead of exposing editable controls. A rolled-back staging SQL regression passed for Private/Guild visibility, selected-character projection, and mutual-block suppression. |
| Staging SQL | Online gameplay, published loadouts, Q-Mode runtime, Live queue and Live ready suites passed. Receipt-ledger RLS/client-denial/server-access regression passed. Older Party suites still fail; see below. |
| Baseline co-op simulation | Extended phase-12 test passed 8,000 full-engine runs. Restoration baseline cleared 94.7%; utility baseline 96.8%; solo role attempts cleared 0%. An earlier 120-second harness timeout was not a gameplay failure. |
| Rendered UI | Tested sign-in validation, character creation, sequential welcome/tutorial, World→Combat→hunt→collect, and account navigation in the browser. Checked a 390px layout and a 320px welcome/combat layout; the latter had no document-width overflow. Native font scaling, keyboard and screen-reader behavior remain unverified. |

Source/UI artwork edits from other ongoing work appeared in the shared workspace during this pass. These results describe the snapshots tested, not an assurance that every later concurrent edit passed. Preserve those edits and rerun the release checks on the final agreed commit.

## Fixes in this pass

- Replaced the enormous mobile test shell command with an ordered Node runner and manifest, preserving all 171 checks.
- Installed the locked dependencies and added Expo-compatible web preview dependencies.
- Removed the backend companion affinity validator's invalid dependency on mobile source; it now uses the shared affinity catalog.
- Corrected missing Node shim signatures and co-op entry analytics ordering, so invalid requests do not record activity.
- Updated stale test expectations for onboarding gates, stamina food, current crafting/UI behavior and save-version compatibility without changing gameplay balance.
- Prevented the welcome and first-hunt tutorial from appearing simultaneously; verified the welcome first and tutorial after dismissal.
- Moved hunt actions above optional challenge/drop details and displayed whole health values instead of long floating-point strings.
- Corrected the fresh-install Party Events membership policy to resolve ownership through characters when the later membership account column is absent.
- Fixed five guild migration return-signature changes by dropping/recreating the function within each existing transaction and restoring its explicit grants.
- Restored the missing Profession, Fellowship and Vanguard rank-cost tables, allowing the Guild model and full backend build to load again.
- Retuned the Veiled Sphinx’s focus/hex damage and attack power so EXP_004 retains an 87% lower-bound clear rate for the pressure-sensitive valid roster, without dropping any valid roster below the 85% launch floor.
- Enabled RLS and removed client access on the server-owned idle receipt ledger; preserved trusted server claim access and verified it with a dedicated SQL regression.
- Added the staging target, launcher and Android build profile; updated the Q-Mode test's strict non-production target guard.

## Remaining failures and release gates

1. **Party shared-credit SQL regressions are not green.** Valid-name fixtures get past identity validation, but `party_v16` still rejects a service-fixture contribution and `party_v16_safety` counts only 0.25 of the shared elite kill. The automatic security review rejected disabling RLS for the trusted settlement functions. Online solo/Party contribution smoke passed; that narrower result does not resolve the broader Party cases.
2. **Regional solo sustain threshold fails.** `regional-combat-preparation-matrix` reports prepared Silverbrook food use at 2.67/hour against its authored minimum 3. This requires a balance/contract decision, not a silent threshold change.
3. **Canonical migration ordering still needs reconciliation.** A standard chronological fresh push encounters v17 Party dependencies before v16. Staging was completed by applying co-op versions `20260917000001`–`20260917000007`, then Party versions `20261010000000` and `20261010000001` early, recording only successfully applied versions, replaying the idempotent Party Events additions, then continuing the normal push. This is a documented bootstrap workaround, not a clean chronological replay. Existing production history must be reconciled before any bulk push; do not rename or reset production history blindly.
4. **Security advisor review remains.** The receipt-table RLS error was fixed. Staging also reported 37 anonymous-executable security-definer functions and five mutable search paths. These are findings requiring function-by-function access review, not 37 demonstrated exploits. Authenticated RPC findings include intentionally callable APIs. [Supabase RPC advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
5. **Native testing and tester provisioning remain.** Build/install the staging APK on the Samsung S24+, verify sign-in/restoration, lost-network retry, background/foreground recovery, large text, keyboard and safe areas, then exercise Q-Mode with distinct consenting tester accounts/Echoes. Live run progression is outside this phase.

## Broad audit inventory

The first broad mobile audit ran 220 compiled files/checks: 203 passed and 17 failed. Eight failed files were corrected and individually rechecked. Remaining baseline failures: `companion-integration`, `dashboard`, `fresh-start-v33`, `herbalism-alchemy`, `novice-sets`, `playability`, `progression-balance`, `progression-v6`, and `regional-combat-preparation-matrix`. Several assert retired item IDs, old content counts, old XP rates or old offline caps; classify each before changing domain code.

The backend audit ran 97 compiled files/checks: initially 88 passed, eight failed and one timed out. The timed-out phase-12 test subsequently passed with enough runtime. Remaining failures: companion phase-2 special Codex and monthly trial expectations; phase-13 regional balance; equipment v25 and v33 recipe material checks; event service; guild progression; and production smoke. These checks used emitted JavaScript despite the separately reported full-backend compilation errors.

Detailed local logs are under `output/readiness/`; the original mobile audit is `mobile-results.json`, backend audit `backend-results.json`, final main mobile run `mobile-core-final.log`, Android export `android-export-final.log`, and staging SQL/HTTP runs use the `staging-` prefix. Counts above refer to files/check commands, not individual assertions or distinct gameplay scenarios.

## Repeatable commands

Use the repository's pnpm 10 dependency tree (`corepack pnpm@10 install --frozen-lockfile`); pnpm 11 rejected the existing store layout in this environment.

```powershell
# From apps/mobile
npm run typecheck
npm run test:core
node node_modules/expo/bin/cli export --platform android --output-dir .readiness-export

# From backend
npm run typecheck:online
npm run test:online
# The balance check currently makes test:online fail; retain that gate.

# From repository root (authenticated Supabase CLI required)
node tools/test-online-qmode.mjs --http
node tools/start-staging-mobile.mjs --web --port 8084
```

The test runner's staging-only clock advancement and fixture provisioning must never be pointed at production. Current guards pin the dedicated staging project and reject the production project.
