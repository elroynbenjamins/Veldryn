# Skills & Classes 2.0 — Edge isolation and regression passes (19 Nov 2026)

## Release rule

**PRIVATE WIP — keep #1377 draft, do not merge or deploy this 2.0 integration.**
Classes/Skills 2.0, Equipment 2.0 and Enemies/Bosses 2.0 still require one
coordinated major release. No rollout flags, public API routes, DB deployments,
native UI menu mounts, or 1.0.x live combat parameters are changed by this pass.

## Pass 1 — isolate the private simulator from shipped Edge functions

The original `backend/src/server/combat/engine.ts` is imported transitively by
existing live PvE/co-op code. On the draft branch it also statically imports
experimental enemy authority, resource, capstone, reactive passive and status
modules. An otherwise ordinary `build:online` would bundle those modules into
the current gameplay/coop Edge artifacts even if all runtime routes stayed off.

- `tools/combat-v2-live-edge-isolation.mjs` is an esbuild-only boundary for
  the two existing production Edge entrypoints. It redirects **exactly five**
  known experimental imports from the shared combat engine to tiny, guarded
  live-only shims. Every unexpected V2 import from that file fails the build.
- Both the ordinary engine's default Enemy V2 authority path and its legacy
  non-V2 resource path remain neutral. Any attempt to pass Combat 2.0 actor
  definitions, a purported authority token, or invoke an active V2 hook from
  a live Edge bundle throws `combat_v2_not_available_in_live_edge_bundle`.
- The source-level private backend simulator still uses the unmodified, full
  V2 implementations, including nine class resources and authoritative enemy
  status rules. No source file is rewritten or stubs imported by private tests.
- Bundles are compiled in memory first and checked against an esbuild
  dependency graph denylist and generated-output secret/token denylist.
  **Neither function is written if either build or isolation audit fails.**

These assertions intentionally fail closed if another private V2 import becomes
reachable from a production route in future code changes. They do not certify
that all major-release balance work is complete.

## Pass 2 — deterministic regression and encounter reservation safeguards

- `tools/tests/combat-v2-edge-isolation.test.mjs` exercises all five shims,
  non-engine import handling, unknown V2 hook denial, V2 actor/token rejection
  and dependency graph leakage detection without a live backend.
- The dedicated `legacy_edge_isolation` workflow compiles both live bundles
  under the isolation plugin, then compiles the real backend engine. It runs
  the established legacy combat smoke and four-player matrix, Q-Mode phase 6
  fixture, and private 2.0 enemy engine/no-authority parity test.
- The existing private solo snapshot test now simulates **16 concurrent
  reservations** and asserts exactly one stored row and the same replayed
  enemy/skill result for all callers. This models service-port first-write-wins;
  it is **not** a Postgres staging concurrency test.
- Existing private SQL checks still cover service-role-only RPC grants,
  revision CAS, immutable snapshots and owner matching; no SQL applied here.

## Verification commands (on the isolated branch)

```sh
pnpm --dir backend install --frozen-lockfile
pnpm --dir apps/mobile install --frozen-lockfile
node tools/tests/combat-v2-edge-isolation.test.mjs
node tools/build-online.mjs
pnpm --dir backend build
node backend/dist/server/combat/__tests__/combat-smoke.js
node backend/dist/server/combat/__tests__/party-matrix.js
node backend/dist/server/coop/__tests__/phase6-qmode.js
node backend/dist/server/combat/v2/__tests__/enemy-engine-coexistence.js
node backend/dist/server/combat/v2/__tests__/solo-encounter-persistence.js
```

## Remaining hold — not verified by this pass

1. Green **exact-head CI** for both generated bundles and private Class 2.0
   tests, with artifact diffs reviewed. Local plugin parsing/contract
   evaluation alone is not proof of a successful full esbuild run.
2. Real staging PostgreSQL races for first-write-wins CAS, stale build/game
   revisions, ownership, and simulated network interruptions.
3. Complete trusted source compiler wiring, exactly-once rewards and combat
   outcome settlement, with no replay-triggered loot or currency.
4. Legacy Dungeon Live/Q-Mode regression, regional and party balance with
   equipment set/affix/gem/tonic interactions, and Android device UI testing.
5. Full 2.0 staged migrations, rollback, feature gates and coordinated
   Equipment/Classes/Enemies final go/no-go review.

**Safe failure:** if an isolation audit fails, do not build or ship the affected
Edge function. Update the explicitly approved source boundary only after
reviewing the reachable dependency chain; never globally turn off the check
or copy an unvalidated V2 module into production.
