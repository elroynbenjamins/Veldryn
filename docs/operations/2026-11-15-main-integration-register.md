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
