# Veldryn mainline integration register — 15 November 2026

This is a **source-control checkpoint, not an Android or backend deployment**. Keep unfinished features hidden, and do not advance required/latest client version from **1.0.9** until separately approved release gates pass.

## Already integrated into main
- [#1207](https://github.com/elroynbenjamins/Veldryn/pull/1207): Forge-ready notification on Home navigation and Forge shortcut; older Skills-only alert removed.
- [#1228](https://github.com/elroynbenjamins/Veldryn/pull/1228): type-safe gathering test narrowing and Live dungeon chat-dock regression assertion. Tests-only.
- [#1231](https://github.com/elroynbenjamins/Veldryn/pull/1231): combat Marks receipts and merchant-room removal (merged independently).

## Canonical pending integrations (not live)
| Workstream | Current canonical PR | Gate |
| --- | --- | --- |
| Canonical gameplay / co-op Edge parity | [#1225](https://github.com/elroynbenjamins/Veldryn/pull/1225) | Regenerate & verify both artifacts, remove temporary CI workflow, rerun broad CI |
| In-combat weapon compare / swap | [#1229](https://github.com/elroynbenjamins/Veldryn/pull/1229) | HP preservation, old-loadout settlement, typecheck & Android smoke |
| Online player count / roster | [#1227](https://github.com/elroynbenjamins/Veldryn/pull/1227) | Auth/privacy and staging-to-production DB migration before UI activation |
| Companion Quarters tier caps and Training UI | [#1235](https://github.com/elroynbenjamins/Veldryn/pull/1235) | Legacy-save credit, server/mobile parity, companion regression matrix |
| v1.0.10 integrated Android candidate | [#1185](https://github.com/elroynbenjamins/Veldryn/pull/1185) | CI, bundle parity, staging, device/native AAB and Google Play acceptance |

Earlier weapon-swap PRs [#1209](https://github.com/elroynbenjamins/Veldryn/pull/1209) and [#1226](https://github.com/elroynbenjamins/Veldryn/pull/1226) were closed as superseded by #1229, avoiding duplicate outdated code paths.

## Keep disabled until independently release-approved
- Rankings, Arena/World Boss/Party Event/Guild PvE finalized-history readers and database release gates.
- World Boss 5-day prep / continuous 48-hour weekend account raids (hidden drafts, no production settlement or reward activation).
- Guild PvE six-week campaign, Party Events settlement, and player Market transaction flows.
- Unreleased dungeon-shop offers, unpublished event rewards and unfinished migrations.

## Consolidation checklist
1. Confirm the intended feature branch rebases/merges the **current** main without losing newer fixes; never force-push main.
2. Review overlapping game state, combat, queue, dungeon, companion, wallet, receipt and UI code paths. Preserve one server-authoritative implementation.
3. Run focused and full checks on the **final commit**; fix known baseline failures instead of suppressing jobs. Confirm generated gameplay and co-op Edge bundles match their source.
4. For SQL and Edge changes, verify account ownership, idempotency, replay handling, transaction boundaries, role grants, migrations and explicit staged deployment.
5. Verify mobile screen/accessibility behavior, small display and Android smoke; separately confirm signed AAB, versionCode and Play acceptance for releases.
6. Merge only after gates pass; publish release notes and activate feature flags only as separate approved rollout actions.

This document does not deploy Supabase, distribute an AAB, alter feature flags or modify users' data.

## Final v1.0.10 integration status — 16 November 2026

- **Candidate:** `release/1.0.10-aab-prep-20261115` at `ff628071873215781ce4508bc394b61911e9d334`, linked from [#1185](https://github.com/elroynbenjamins/Veldryn/pull/1185). This is **not** merged to main or published.
- **Approved regional artwork:** [#1287](https://github.com/elroynbenjamins/Veldryn/pull/1287), 9/9 exact-head workflows green; 12 bundled assets, portrait/gallery/shop wiring, guarded translations and regenerated authoritative Edge bundles.
- **Three-role roster:** [#1288](https://github.com/elroynbenjamins/Veldryn/pull/1288), 9/9 exact-head workflows green; new character creation capped at 3 (Tank, Damage, Support), existing 4th/5th character saves preserved, account-wide Sunscar/Frostmarch/future Ashlands AFK milestone watermark, grandfathered old Forge slot benefit. [#1286](https://github.com/elroynbenjamins/Veldryn/pull/1286) remains its original mainline source draft pending live acceptance.
- **CI Android:** release-native AAB check on artwork-inclusive `2dd88a2` passed at Actions run [43867466245](https://github.com/elroynbenjamins/Veldryn/actions/runs/43867466245). Exact combined `ff628071` has passed metadata/Edge/TypeScript/mobile-core, **native AAB packaging and SHA-256 verification** at [43869857874](https://github.com/elroynbenjamins/Veldryn/actions/runs/43869857874). Artifact ID `14227708964` is a CI-only/test-signed AAB, not a production-signed EAS or Play release. These are **CI-only bundles**, not signed EAS production artifacts.
- **Unpublished copy:** [#1289](https://github.com/elroynbenjamins/Veldryn/pull/1289) corrected 1.0.10 release wording in main. The backend release-note row for Android 1.0.10 is still unpublished.

### Three-way branch reconciliation — do not blanket-merge

Against the common main ancestor `59c4f871`, main has advanced by 60 commits. Git-tree analysis of the exact 16 November snapshot found **25 paths modified differently on both sides**, including the two generated gameplay/co-op Edge files, 11 main-only modified files, 93 release-only modified files, and independently added content. The release PR is not mergeable into main until these source overlaps are resolved and the combined result is tested. Preserve unrelated hidden Guild PvE and Market prototypes, never replace latest main with the release tree, and always regenerate canonical Edge artifacts **after** conflict resolution.

### Staging and production compatibility — read-only findings

- Supabase migration histories differ: staging has **350** recorded migrations, production **394**. These are different histories, not a safe numerical diff: staging contains private Market foundations and a Dungeon Shop 100-material bundle migration that production does not; production has distinct live security and Guild migrations. Migration names/timestamps also differ. Never replay all missing migrations or deploy generated SQL blindly.
- Staging Android release-policy latest/minimum are **0.1.0**; production latest/minimum remain **1.0.9**. Keep production minimum unchanged until the signed 1.0.10 Play release is verified.
- Dungeon Shop database setting is **disabled on staging**, **enabled on production**, despite the 1.0.10 mobile release flag remaining off. The three shop server RPCs have service-role EXECUTE only, not anonymous/authenticated. Review the **actual Edge bridge** and rollout intent before altering the production switch.
- Exceptional Forge announcement migration was deployed and function/trigger permissions checked **on staging only**. Production has not received that migration.

### Final non-code release acceptance gates

1. Complete the exact combined candidate native CI AAB and verify packaged regional WebPs on an Android device/emulator, plus **all three character-role orders**, occupied-role grey-outs, historic 4/5-character saves, and AFK progression across save/reentry.
2. Bring staging DB/schema and gameplay/co-op Edge versions to a **reviewed compatibility baseline**; perform authorized real test-account multiplayer/economy/quest/gem/run-again checks and rollback/old-client compatibility, with receipt-idempotency verification. No production deployment from this checklist.
3. Resolve the 25 source overlaps into a reviewable mainline integration PR, preserving current mainline fixes, followed by full mobile/backend/locale/regression/Edge parity CI on the final merge result.
4. Verify EAS remote `versionCode` versus the largest uploaded Google Play build, build and inspect a **properly signed** 1.0.10 AAB, test on Play internal/closed testing, and approve rollout separately.
5. Only after the release is actually available: publish release notes, review and then update the app's latest/minimum policy, and explicitly approve any new shop or hidden feature flags.

No staging Edge deployment, production DB change, Google Play upload, app-version gate or feature-flag change is authorized by this document.
