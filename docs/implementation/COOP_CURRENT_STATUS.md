# Co-op dungeons — current implementation status

Updated: 2026-09-10

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
| Frostmarch | Shiverlake Descent; Choir Caverns | Route identities exist; start is gated pending encounters and balance |
| Ashlands | Blackglass Fen; Crucible Depths | Route identities exist; start is gated pending encounters and balance |

Suncrest Games and Starfall Convergence are presentation-only event previews. They do not provide startable content or invent schedules/rewards.

## Acceptance coverage

| Area | Coverage |
| --- | --- |
| Boundary and lifecycle | Feature gate, exact party invariants, authorization, idempotency, stale-state rejection, sanitized projections |
| Loadouts | Server role/readiness, normalized stats/effects, immutable hashes, queue-time revision revalidation |
| Routes and state | 10,000 seeded graphs, three distinct choices, five-room launch shape, persistent combat state, duplicate-node rejection |
| Q-Mode | Echo eligibility/privacy, distinct donors, retry identity, controller decisions, resume/public projection, settlement |
| Live | Bounded role buckets, reservations, ready/refill, recovery, voting, chat authorization and moderation |
| Rewards | Shared Live/Q charges, weekly limits, reduced payout, assistance rewards, entitlement and ledger idempotency |
| Regional balance | Asterfall and Sunscar valid-party simulations; invalid solo-role scenarios; uncapped observed damage share |

Latest recorded verification:

- Backend TypeScript build passed.
- Route generation passed across 10,000 seeds.
- Stateful-run, Q-Mode, combat-service, matchmaking, ready/recovery, voting, chat, and reward suites passed.
- Asterfall balance passed across 8,000 full runs. Reference clear rates were 95.3% and 96.6%; solo clears were zero; maximum observed Damage share was 41.52% without a cap.
- Sunscar balance passed across 2,000 full runs. Clear rates ranged from 94.8% to 98.8% across two valid party compositions and both dungeons.
- Mobile core tests, full TypeScript validation, and Android Expo/Hermes export passed in the latest recorded co-op refinement.
- Hosted Supabase migrations were linked, applied through the co-op cadence work, and linted without schema errors. New migrations still require a linked dry run before deployment.

Machine-readable Asterfall results are stored in `backend/artifacts/coop-balance-summary.json`.

## Release boundaries

- `coopRogueliteV1` remains off by default.
- Domain services, mobile adapters, schemas, and public projections exist; deployed authenticated HTTP handlers and Realtime transport are not yet demonstrated end to end.
- Q-Mode needs a trusted saved-loadout publication worker and a complete server-backed start/choose/resume/settlement device test.
- Live needs deployed queue/deadline workers, PostgreSQL race tests, and multi-device matchmaking/reconnect/chat/reward validation.
- Frostmarch, Ashlands, and event expeditions must remain non-startable until their content-specific gates pass.
- Native narrow-width, large-text, keyboard, and screen-reader QA remains outstanding.

## Next passes

1. Deploy and connect authenticated co-op HTTP handlers, Realtime projections, and the saved-loadout publisher.
2. Run PostgreSQL concurrency tests for reservations, compare-and-set, job fencing, decisions, counters, and claims.
3. Complete real-device Live and Q-Mode end-to-end validation.
4. Implement and balance Frostmarch, then Ashlands.
5. Add server schedules, encounters, art, eligibility, and reward budgets before enabling event expeditions.
6. Finish native UI/accessibility/localization QA and gather real duration, queue, completion, and economy telemetry.
7. Load test, audit RLS/service boundaries, produce release builds, and enable co-op gradually behind monitored configuration.

## Required phase reporting

For every future pass, report changed files, commands actually run, results, and remaining work in the commit or current status document. Do not create a new numbered report for each small iteration unless it introduces a durable contract that cannot fit here.
