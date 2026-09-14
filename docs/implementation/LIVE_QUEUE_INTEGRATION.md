# Live queue integration — 13 September 2026

Historical queue-stage report. The subsequent [ready-check continuation](LIVE_READY_INTEGRATION.md) completes automatic matching and persisted ready/refill/acceptance; its verification report supersedes the totals below.

The authenticated Live queue boundary is implemented and tested on a disposable Supabase project. It is **not deployed to production**. Production co-op remains disabled, and the complete Live multiplayer release remains unfinished.

## Implemented

- Authenticated queue admission, own-ticket status, heartbeat and cancellation endpoints.
- Current server-owned character/equipment revision, dungeon/tier eligibility, derived role and readiness; no client stats, role, owner, region or clock accepted.
- Durable join and command receipts, including uncertain retry after gameplay advances and concurrent receipt visibility.
- Database-time 30-second queue expiry. A late heartbeat cannot revive an expired ticket; repeated heartbeat requests do not extend the recorded deadline twice.
- One account reservation from admission onward, shared with the existing QMode participation exclusion.
- Atomic handoff into the existing matcher: exactly **1 Tank / 2 Damage / 1 Support**, distinct accounts and characters, current equipment revisions, bidirectional block checks, sorted locks. Failed reservations roll back without losing admission reservations.
- Raw matchmaking table access restricted to the server. No mobile code directly accesses that legacy table.

The match handoff is a service primitive, not an automatically scheduled matcher or a completed ready-check flow. The mobile Live action remains gated. No persistent Party membership, Party Chat or recruitment system was replaced.

## Exact source files

Added:

- `backend/online/live-queue.ts`
- `backend/online/tests/live-queue.ts`
- `backend/supabase/migrations/20261015000000_online_live_queue.sql`
- `backend/supabase/tests/online_live_queue.sql`
- `tools/test-online-live-queue.mjs`
- `docs/implementation/LIVE_QUEUE_INTEGRATION.md`
- `docs/implementation/online-verification/hosted-live-queue.json`

Changed:

- `backend/online/coop.ts` — authenticated routes and conflict/access errors.
- `backend/package.json` — includes the queue regression test in `test:online`.
- `backend/supabase/functions/coop/index.ts` — generated endpoint bundle.
- `tools/check-v16.mjs` — queue test in the full check runner.
- `tools/test-fresh-migration-chain.mjs` — includes queue SQL suite and rejects deleted validation targets; allows the specifically named 12/13 September validation projects.
- `docs/implementation/ONLINE_GAMEPLAY_STATUS.md`
- `docs/implementation/COOP_CURRENT_STATUS.md`
- `docs/implementation/v16-verification/repository-checks.json`
- `docs/implementation/online-verification/fresh-migrations.json`
- `docs/implementation/online-verification/test-project-cleanup.json`

Ignored fixture helpers, credentials held in memory and compiled TypeScript outputs are not source additions. No mobile source or APK was changed during this continuation.

## Migration and conflict resolution

Only `20261015000000_online_live_queue.sql` was added; earlier migrations were not edited. It appends four service-only RPCs to the existing tables and restricts raw queue access.

The legacy matcher inserts reservations at match time. Online admission needs an earlier reservation to prevent simultaneous QMode participation. The new wrapper locks the accounts and source revisions, checks admission evidence, transfers those reservations within the same transaction, and calls the existing exact-role matcher. A failed match restores the original reservations through transaction rollback. The older matcher and unrelated systems retain their implementation.

## Checks

| Check | Result |
|---|---|
| Full repository runner: backend/mobile typechecks, builds, v15/v16 Party/recruitment/contribution/reward/idempotency tests, all co-op phases and balance suites | **PASS — 82/82** |
| Generated gameplay and co-op Edge Function bundles | **PASS** |
| Fresh migration chain on isolated Supabase | **PASS — 57 migrations** |
| SQL suites: Party v16, Party safety, authoritative gameplay, loadout publication, QMode runtime, Live queue | **PASS — 6/6** |
| Hosted HTTP: real Auth, authority rejection, four accounts, concurrent join and heartbeat replay, duplicate admission, foreign cancellation, raw table privacy, concurrent match handoff | **PASS** |
| Fixture cleanup | **PASS** |
| Disposable project deletion | **PASS** |
| Git whitespace check | **PASS** |
| Source lint | **NOT CONFIGURED** |
| New native/Expo export or physical-device run | **NOT RUN this continuation; no mobile changes** |

The disposable project was `xsztafgbtexxsfqkfgge`; it and all test accounts were removed after testing. Production `nyjwigipamnvpdvpauuv` was not modified. Existing native Android and Expo export evidence remains in the main report; Samsung S24+ testing is still outstanding.

## Remaining release work

Automatic bounded match selection, persisted ready checks/refill/acceptance, final roster freeze into a Live run, decisions/votes, server-driven combat progression, recovery and run Party Chat still need end-to-end HTTP/worker/mobile integration. The current queue handoff must be integrated with ready-check creation before enabling Live admission in the product.

Personal merchant spending, effects of the recorded boon/artifact/curse identifiers, gated regional content, successful native confirmation/reset callbacks and physical Samsung validation remain outstanding. Production co-op deployment and store release are deferred until their release gates pass.

Unrelated v8–v15 source and concurrent artwork/UI work were preserved. The passing regression suites support that statement; it is not a claim that every earlier version or every production/device behavior has been exhaustively tested.
