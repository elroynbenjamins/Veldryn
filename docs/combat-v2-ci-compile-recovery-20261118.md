# Combat 2.0 strict compile recovery — 18 November 2026

## Verified failure on previous hidden draft

The GitHub Actions run for draft commit `b02f41d` completed with failure across the Combat 2.0 skills validation, backend typecheck, mobile preview, online build transport, Edge bundle parity and several dependent suites. This is **not release-ready**. Full validation was not previously green.

The backend compile logs reported **58 TypeScript errors**. Most came from incomplete custom `node:assert` declarations (which caused test narrowing to fail), plus genuine strict issues in the enemy kit callbacks, character class profile, storage lookup, solo persistence test fixtures and auth request parser. The mobile preview also attempted to resolve `@noble/hashes` from backend shared source without installing backend dependencies. The online service checked a mobile theme without mobile dependencies installed.

## Corrections on this branch

- Complete the `node:assert` shim with `asserts value`, async `rejects`, `notDeepEqual`, `doesNotThrow` and `fail`.
- Preserve never-returning fail-closed validators as function declarations so TS correctly narrows trusted snapshots and parsed auth data.
- Explicit typed `CombatStats` class-only projection (instead of an unsafe `Object.fromEntries` cast).
- Explicit callback parameter types for already validated skill/trait/boss evidence arrays.
- Rebuild immutable malicious-test fixtures with spreads, rather than illegally mutating readonly receipt fields.
- Check stored class identity is a string before `hasOwnProperty`.
- Preserve required rarity/affix policy caps in negative tests.
- Install both declared project dependencies in cross-root CI tasks; do not change runtime dependency versions, Expo, production artifacts or the live engine.

## Remaining risk and non-goals

This is a **compilation-recovery** PR for the unreleased Classes/Skills draft #1377 only. The checks on the fixed head have not yet finished. Do not mark CI green before job results are verified.

Separately, the **co-op Edge bundle parity** job fails because the unreleased draft edits the shared combat engine while the committed production Edge bundle has not been regenerated. We must isolate/version the V2 runtime before any production promotion; it is not appropriate to copy the experimental engine into today's deployed co-op Edge bundle merely to make this job green. Any existing dungeon/reward/Q-mode failures must be investigated against main as well. Current release and reward routes remain unchanged.

Next steps: compile/run full backend and mobile checks, resolve remaining real errors, isolate new V2 engine behavior from legacy Edge bundle parity, then wire the true source-owned snapshot compiler and perform staging Postgres concurrency/Android validation.
