# Co-op dungeons — current implementation status

Updated: 2026-09-13

## Hosted integration status

Production co-op remains disabled. QMode's authenticated entry, explicit 24-hour Echo publication, durable run/choice/resume, server-time room completion, offline database worker and entitlement claims are implemented and pass real HTTP/PostgreSQL tests on a disposable project. The actual published-equipment adapter covers all nine classes and 2,400 full runs. Mobile QMode actions, durable retry, sanitized Realtime updates and reward collection are wired but not yet validated on the physical Samsung S24+.

Personal merchant purchases are now implemented in the server expedition domain and QMode service: deterministic offers, resource debit, per-player boon/artifact persistence, salve healing, duplicate-purchase protection and public projection state are covered by regression tests. Hosted command/RPC wiring remains gated with the rest of production co-op.

Live queue admission/status/heartbeat/cancellation, automatic bounded matching, persistent ready checks/refill/acceptance and the offline ready deadline worker pass authenticated hosted tests. See [LIVE_READY_INTEGRATION.md](LIVE_READY_INTEGRATION.md) for exact files, the 58-migration/seven-SQL-suite fresh test and regression follow-ups. The internal mobile lobby is wired behind a disabled flag. This is not deployed to production. Live run creation/progression/voting/recovery/chat integration remains unfinished. This distinction applies to the acceptance tables below: domain/fixture coverage does not establish an enabled production service. Hosted personal merchant command wiring and gameplay effects for the broader recorded boon/artifact/curse catalog remain incomplete. Regional/event gates remain in force.

Exact integration files, migration deployment boundaries, native status, conflicts and test evidence are maintained in [ONLINE_GAMEPLAY_STATUS.md](ONLINE_GAMEPLAY_STATUS.md). No existing persistent Party or Social system was replaced.

This document replaces the earlier co-op phase reports, UI phase reports, checklists, cadence report, and incremental refinement-pass notes. Git history retains those implementation snapshots.

## Product contract

- Live and Q-Mode share one authoritative dungeon, route, combat, normalization, and reward engine.
- Every roster contains exactly one Tank, two Damage, and one Support.
- The server derives role and readiness, validates current loadout revisions, freezes immutable snapshots, and normalizes combat stats.
- Normalization reduces excessive stats without boosting weak builds. Observed damage contribution is never capped.
- A run contains exactly five non-boss nodes followed by one final boss.
- Every pre-boss decision presents at least three distinct reachable choices.
- Target end-to-end duration is six to eight minutes.

## Modes

### Q-Mode

One controller recruits three eligible Echoes from distinct source accounts. The controller owns personal route choices and may resume the same persisted run. Client projections hide Echo owner IDs, private loadouts, unrevealed graph state, RNG inputs, and unentitled rewards.

### Live

Role-bounded matchmaking forms a four-account party. The implementation includes frozen queue evidence, atomic reservations, a 20-second ready check, refill/requeue behavior, eight-second route voting, a 60-second reconnect grace period, and epoch-authorized moderated party chat.

## Entry and reward cadence

- Entry is unlimited; depleted reward charges do not block play.
- Dungeon Tier I uses the dungeon base level. Tiers II–V add 5, 10, 15, and 20 levels.
- Live and Q-Mode share three enhanced-reward charges per account.
- One charge returns every eight hours, up to three.
- An account may claim at most twelve enhanced rewards per authoritative week.
- Valid clears without an enhanced charge retain the reduced 20% Marks payout.
- Server-created entitlements, idempotent receipts, ledgers, recipient checks, and personal-only spending protect settlement.

## Regional content

| Region | Dungeons | Status |
| --- | --- | --- |
| Asterfall | Rootbound Vault; Lanternwatch Descent | Implemented and balance-covered |
| Sunscar | Mirage Well; Buried Observatory | Implemented and balance-covered |
| Frostmarch | Shiverlake Descent; Choir Caverns | Implemented, encounter-complete, and regional-gate balance-covered |
| Ashlands | Blackglass Fen; Crucible Depths | Implemented, encounter-complete, and regional-gate balance-covered |

Suncrest Games and Starfall Convergence now have a server-owned UTC schedule, level requirement, reward budget, event encounter catalog, and an in-memory authoritative route/settlement service covered by tests. They remain preview-only in the public handler until durable hosted run transport and entitlement settlement are deployed.

## Acceptance coverage

| Area | Coverage |
| --- | --- |
| Boundary and lifecycle | Feature gate, exact party invariants, authorization, idempotency, stale-state rejection, sanitized projections |
| Loadouts | Server role/readiness, normalized stats/effects, immutable hashes, queue-time revision revalidation |
| Routes and state | 10,000 seeded graphs, three distinct choices, five-room launch shape, persistent combat state, duplicate-node rejection |
| Q-Mode | Echo eligibility/privacy, distinct donors, retry identity, controller decisions, resume/public projection, settlement |
| Live | Bounded role buckets, reservations, ready/refill, recovery, voting, chat authorization and moderation |
| Rewards | Shared Live/Q charges, weekly limits, reduced payout, assistance rewards, entitlement and ledger idempotency |
| Regional balance | Asterfall, Sunscar, Frostmarch, and Ashlands valid-party simulations; invalid solo-role scenarios; uncapped observed damage share |

Latest recorded verification:

- Backend TypeScript build passed.
- Route generation passed across 10,000 seeds.
- Stateful-run, Q-Mode, combat-service, matchmaking, ready/recovery, voting, chat, and reward suites passed.
- Asterfall balance passed across 8,000 full runs. Reference clear rates were 95.3% and 96.6%; solo clears were zero; maximum observed Damage share was 41.52% without a cap.
- Sunscar balance passed across 2,000 full runs. Clear rates ranged from 94.8% to 98.8% across two valid party compositions and both dungeons.
- Frostmarch/Ashlands regional gate passed 400 full runs. Clear rates were 97–100% for Frostmarch and 99% for both Ashlands dungeons.
- Mobile core tests, full TypeScript validation, and Android Expo/Hermes export passed in the latest recorded co-op refinement.
- Hosted Supabase migrations were linked, applied through the co-op cadence work, and linted without schema errors. New migrations still require a linked dry run before deployment.

Machine-readable Asterfall results are stored in `backend/artifacts/coop-balance-summary.json`.

## Release boundaries

- `coopRogueliteV1` remains off by default.
- Domain services, mobile adapters, schemas, and public projections exist; deployed authenticated HTTP handlers and Realtime transport are not yet demonstrated end to end.
- Q-Mode needs a trusted saved-loadout publication worker and a complete server-backed start/choose/resume/settlement device test.
- Live needs deployed queue/deadline workers, PostgreSQL race tests, and multi-device matchmaking/reconnect/chat/reward validation.
- Event expeditions must remain non-startable until their schedules, encounters, art, eligibility, and reward budgets pass their content-specific gates.
- Native narrow-width, large-text, keyboard, and screen-reader QA remains outstanding.

## Next passes

1. Deploy and connect authenticated co-op HTTP handlers, Realtime projections, and the saved-loadout publisher.
2. Run PostgreSQL concurrency tests for reservations, compare-and-set, job fencing, decisions, counters, and claims.
3. Complete real-device Live and Q-Mode end-to-end validation.
4. Add event encounters, art, eligibility enforcement, run transport, and settlement before enabling event expeditions; the authoritative schedule and reward budget foundation is now present.
5. Finish native UI/accessibility/localization QA and gather real duration, queue, completion, and economy telemetry.
7. Load test, audit RLS/service boundaries, produce release builds, and enable co-op gradually behind monitored configuration.

## Required phase reporting

For every future pass, report changed files, commands actually run, results, and remaining work in the commit or current status document. Do not create a new numbered report for each small iteration unless it introduces a durable contract that cannot fit here.
