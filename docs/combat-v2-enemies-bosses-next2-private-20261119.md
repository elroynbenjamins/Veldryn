# Enemies/Bosses 2.0 — two private passes and polish

Date: 2026-11-19. Scope: draft PR #1430 based on private Skills/Classes 2.0 #1377.
Status: DRAFT / NO PUBLIC ROUTE / NO STAGING MIGRATION / NOT ENABLED.

## Pass 1 — six-boss readiness diagnostics

Fixed the 540-case joint Skills/Equipment/Enemies synthetic matrix to use canonical regional boss names. Four regional profiles require matching the selected boss identity; generic names prevented their authored kits from being measured. The joint matrix still includes all 540 scenarios, including 108 Tier 1 authored-kit cases.

New executable test: 18 class/spec identities × six boss profiles = 108 deterministic baseline-engine scenarios. The test uses legacy class baseline factories with isolated Combat 2.0 resource identity, fully authored boss kits, in-memory persisted synthetic receipts and trusted engine authority. It runs combat twice to verify exact replay, no nonfinite state, bounded class resources and monotonic events, and rejects altered boss attack power against the issued authority. It records starts/completions of authored casts, interrupts, phase events, victories and timeouts per boss.

These are synthetic baseline-only scenarios, not approved tuning, real equipment test runs, or production-ready class specs. Warning diagnostics do not automatically approve or reject final difficulty. The 540-case equipment matrix remains independent; 108 boss cases do not replace its gear coverage. No player data, economy, drops, rewards or live boss stats changed.

## Pass 2 — five-language small-screen encounter preview

Added three unmounted mobile modules:
- boss-v2-preview-locales.ts: seven fixed-ID boss cast names and tells, class-neutral responses and fallbacks, in English, Spanish, German, Russian and Turkish, with explicit English fallback.
- boss-v2-replay-preview.ts: pure read-only server-event-cursor projection for cast start/complete, interrupt, death and phase thresholds (70% / 35%). Rejects unknown boss/cast identities, changed cast duration or interrupt status, invalid event order, oversized histories and missing/invalid cursor.
- BossV2CounterplayPreview.tsx: compact responsive accessible cast/phase presentation for small screens and large font settings. Progress is based on server replay event time; no local stopwatch, damage, combat authority or item mutations.

This mobile component remains intentionally UNMOUNTED. It is not imported into live App, CombatScreen, WorldBossPanel or dungeon flows. Actual authenticated encounter transport and Android device/screenshots are still absent.

## Refine and polish

The private Enemy/Boss composer now independently regenerates all six versioned boss profiles from the trusted original base definition before trusting a stored kit. A modified damage coefficient, shield value, phase, cast or injected ability cannot pass simply by recomputing the stored digest. As profiles are currently unreleased, these stricter versioned checks are safe; future post-release tuning will need a new ruleset or supported historical replay.

Added forged-damage tests, six-boss authority tests, five-language preview tests, and behavioral projection tests for interrupts, phases, stale/out-of-order events, unknown bosses, forged durations and forged interrupt flags. Both backend and mobile private Combat 2.0 CI jobs have corresponding test commands and mobile preview path triggers.

## Release gates not waived

1. Exact-head CI must be confirmed green on the child and reconciled parent: server/mobile TS, 540+108 simulations, PG17 race tests and Edge isolation.
2. Real approved class/skill variant/capstone and Equipment 2.0 rolls, item provenance, gems, companions, potions and rewards must be calibrated with measured survivability and performance targets.
3. Authenticated persisted-snapshot mobile replay DTO and event cursor, UI localization for remaining phase names, Android narrow-screen and screen-reader checks.
4. Legacy in-flight dungeons, Q-Mode and World Boss replays must remain exact; separate staging migration/rollback, flags and coordinated release decision.
5. Do not merge or enable the unfinished 2.0 drafts in production.

No deployment, staging mutation or player-facing change was performed.
