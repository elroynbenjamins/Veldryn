# Party Events V6–V31 consolidation onto current main — 17 November 2026

**Status:** PRIVATE DRAFT. No live Party Event feature flag, new Edge route, player reward, migration, shop or scheduled event is activated.

## Provenance and safe merge boundary
- Legacy prototype: [PR #1045](https://github.com/elroynbenjamins/Veldryn/pull/1045), `party-events-v6-hazard-prototype`, source commit `fe3f6754bb9b43664f0b7eb344bf74507889690c`.
- The old source diverged from `main` by **877 newer main commits** and had 110 changed paths, including app, dungeon, translations, Expo dependencies and gameplay Edge surfaces. **Do not merge that branch wholesale.**
- This integration derives from `main` at `2f3bcc7a87396c10b559874552743e5de9fca459`; only newly authored, Party Events-namespaced TS modules, tests and design docs were copied. Existing current-main Party Event v2–v5 modules and every unrelated file remain unchanged.
- **18 draft v11–v30 SQL scripts have been moved exclusively under `docs/roadmap/party-events/hidden-migrations/`**. They are **NOT** executable Supabase migrations. Related PGlite test imports were redirected to that hidden path. Unpromoted SQL must never be committed to `backend/supabase/migrations/` or run against staging/production until schema review and a separate release migration.
- The dedicated hidden CI is `.github/workflows/party-events-v6-v31-hidden-integration.yml`, running current main's legacy v2/v3 Party Event tests, V6–V31 TypeScript suites and isolated PGlite checks.

## Existing product decisions to preserve
- Four distinct events: Broken Caravan, Nightfall Hunt, Broken Wards and Lost Reliquary, with three authored story stages, family-specific preparation, routes and combat.
- 21-day cycle; 7 days of preparation/gameplay and Day 8 settlement, then downtime; stage ballots and canonical server-verifiable actions.
- Account-level, replay/idempotency-protected contribution and claim ledgers. **No predicted, duplicated, failed or client-asserted reward may enter the economy.**
- Current Veldryn party policies must not be overwritten. The legacy prototype's strict 1 Tank / 2 Damage / 1 Support composition needs explicit reconciliation with the subsequently approved **flexible** Party Event composition before release.
- Player saves, account wallets, dungeon systems and translations on current `main` are authoritative. The old UI, mobile packages, gameplay endpoints and generated files were deliberately excluded.

## Remaining gates before merge/activation
1. Confirm exact-head hidden PR tests plus unchanged core, mobile, Edge and economy checks; investigate failures rather than skipping them.
2. Audit Party Event party-size/role composition against current flexible party rules; add real 1–4-person and mixed-role fixtures where supported.
3. Adapt the hidden SQL to current staging's actual tables, locks, source receipts, game-state shape, shop economy and the existing claim/outbox integration. Run migration/test in transaction/ROLLBACK only with explicit review.
4. Validate server-trusted 7-day activity receipts, consumptive preparation, frozen ballots, canonical combat replay and exactly-once Day 8 claim, including concurrent workers, crash recovery, and duplicate requests.
5. Verify current v1.0.10 feature flags, mobile UI, art, translations and 9-class fairness; keep no public RPC/wallet until separate approved release.

**Main remains unchanged** until this draft is validated and deliberately promoted. Passing isolated tests is not evidence of production readiness.
