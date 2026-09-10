# Co-op Roguelite V1 Phase Report

All commands were run from `backend` unless noted. The compatible compiler command was `pnpm dlx --package=typescript@5.8.3 tsc -p tsconfig.json`.

## Phase 1 — Boundary and baseline

- Changed: shared co-op types/invariants, disabled `coopRogueliteV1` config, implementation checklist, phase test/script.
- Ran: backend compile, original eight smoke scripts, `coop-phase1`, `squad-smoke`.
- Result: pass. The legacy three-character squad behavior remains unchanged.
- Remaining: none at the pure-domain boundary.

## Phase 2 — Lifecycle and authorization

- Changed: append-only lifecycle/RLS migration, access membership, reservations, ready/decision/job/outbox/idempotency schemas, errors, clocks, repository contracts, validated command DTOs, plus a service-role runtime adapter and hardening migration that separates private state from client projections, atomically commits state/projection/outbox, and leases due jobs with `SKIP LOCKED` fencing.
- Ran: compile, `coop-phase2`, `coop-phase2-runtime`, and `coop-phase2-contracts`.
- Result: pass in memory and at the RPC/HTTP contract boundaries, including Echo-owner denial, stale/idempotency errors, commit payload mapping, fencing-generation claims, and rejection of client-supplied roles/stats/readiness.
- Remaining: apply and exercise the migrations and RLS/concurrency against a configured development Supabase database; no Supabase CLI or database configuration is present in this checkout, so database execution is not claimed.

## Phase 3 — Snapshots and anti-carry

- Changed: authoritative loadout repository boundary, immutable hash, nine-class role registry/readiness, actual stat/effect normalization, and a final four-member commit boundary that rereads revisions and queue-time hashes before enforcing the derived 1/2/1 roster.
- Ran: compile, `coop-phase3`, and `coop-phase3-commit`.
- Result: pass; level 100 / 9,000 Attack became level 25 / 781.25 Attack in engine input; low stats were not boosted; queue-time revision/hash drift was rejected and post-commit edits did not mutate frozen snapshots.
- Remaining: connect the production inventory/skill/loadout repository.

## Phase 4 — Route graph

- Changed: layered versioned graph, run/version-separated RNG, structural validator and client-safe revealed-node projection.
- Ran: compile and `coop-phase4` over 10,000 seeds.
- Result: pass; every path had 4–7 pre-boss visits, three meaningful options per fork and one boss.
- Remaining: regional content beyond Rootbound.

## Phase 5 — Stateful shared engine

- Changed: persisted HP/down/cooldowns, Rootbound encounter variants, deterministic node handlers, unique node-result migration.
- Ran: compile, `coop-phase5`, existing `combat-smoke`, existing `combat-service-smoke`.
- Result: pass; a six-node-plus-boss run carried state and rejected duplicate resolution.
- Remaining: production job leasing/fencing adapter.

## Phase 6 — Q-Mode

- Changed: eligible Echo recruitment, distinct donors, immutable retry, controller-only route service, resume repository, private Echo policies.
- Ran: compile and `coop-phase6`.
- Result: pass end-to-end through seven non-boss nodes and Rootbound Heart with server rewards.
- Remaining: production Echo publication and persistence adapters.

## Phase 7 — Live matchmaking

- Changed: bounded role buckets, hard exact-role/account/readiness filters, reservation/expiry store and SQL indexes. Reserved tickets carry their server-frozen loadout ID, revision and hash into the ready roster; the follow-up hardening migration aligns PostgreSQL's status constraint with the `reserved` domain state and adds service-role atomic reservation/release RPCs with stable row locking and account reservation uniqueness.
- Ran: compile, `coop-phase7`, and `coop-phase7-runtime`.
- Result: pass, including empty bucket, four-Damage, duplicate account and two-worker reservation cases, immutable loadout evidence preserved into ready checks, typed reservation-conflict mapping, and expired-reservation release payloads.
- Remaining: execute the RPC race tests against PostgreSQL and connect the bounded selector to a deployed worker; database execution is not claimed in this checkout.

## Phase 8 — Ready/recovery

- Changed: 20-second roster-revision ready checks, refill/requeue rules, reconnect grace and Continue/End boundary. A fully accepted ready check now feeds its four queue-time loadout revisions/hashes directly into final authoritative roster freezing.
- Ran: compile and `coop-phase8`.
- Result: pass, including timeout/fourth-accept/cancel/restart cases and final 1/2/1 loadout revalidation.
- Remaining: database deadline-worker integration tests.

## Phase 9 — Voting

- Changed: eight-second mutable votes, 4/4 early resolution, plurality/tied-highest/no-vote algorithms and zero-input pause tracking.
- Ran: compile and `coop-phase9`.
- Result: all encoded acceptance vote cases pass.
- Remaining: transaction/outbox race tests on Postgres.

## Phase 10 — Mobile and chat

- Changed: feature-flagged World entry, authenticated client contract, loadout/role/route/result UI, Live-only chat/votes, epoch-authorized moderated party chat.
- Ran: backend compile/`coop-phase10`; mobile full TypeScript, `typecheck:core`, `test:pre-codex`, co-op presentation test.
- Result: pass in local builds. The typed start contract now includes the selected `characterId`; role, readiness and combat snapshots remain server-derived.
- Remaining: configured API, Realtime transport and two-device/revocation testing.

## Phase 11 — Rewards

- Changed: server-created entitlements, shared Live/Q-Mode budgets, assistance rewards, idempotent claim/ledger and personal-only purchases.
- Ran: compile and `coop-phase11`.
- Result: pass, including shared caps, post-cap 20%, wrong recipient and Echo-wallet denial.
- Remaining: database counter/claim concurrency test.

## Phase 12 — Balance/release gate

- Changed: reproducible seeded full-combat study, machine-readable summary artifact, and versioned Rootbound co-op tuning (`2.9` enemy Attack multiplier, `0.9` multiplier at depth 8+, and Stonecaller shield/heal coefficient multiplier `2.0` without changing permanent stats or readiness).
- Ran: compile and `coop-phase12` with 1,000 full runs for each of eight scenarios (8,000 total).
- Result: after versioned Rootbound tuning, restoration cleared 96.6% (95% CI 95.29–97.56%) and utility Support cleared 96.5% (95% CI 95.17–97.47%). Seven-node routes cleared 97.79% and 97.54%, respectively. No solo role cleared (upper 95% bound 0.38%); normalized overgear did not become solo carry; observed Damage share reached 41.52% without a cap.
- Remaining: exercise tiers II–V, expand/validate the other seven maps, load test workers, apply database security/race tests, and perform two-device reconnect testing. The feature flag remains off until those release gates pass.

## Changed file index by phase

- Phase 1: `backend/src/shared/coop-types.ts`, `backend/src/server/coop/config.ts`, `invariants.ts`, `__tests__/phase1-invariants.ts`, `backend/package.json`, `docs/implementation/COOP_ROGUELITE_V1_CHECKLIST.md`.
- Phase 2: `backend/src/server/coop/errors.ts`, `clock.ts`, `api-contracts.ts`, `repositories/contracts.ts`, `repositories/memory.ts`, `repositories/supabase-runtime.ts`, `__tests__/phase2-lifecycle.ts`, `__tests__/phase2-runtime-adapter.ts`, `__tests__/phase2-api-contracts.ts`, `backend/src/server/api/contracts.ts`, `backend/supabase/migrations/20260917000001_coop_roguelite_v1.sql`, `backend/supabase/migrations/20260917000007_coop_runtime_hardening.sql`.
- Phase 3: `backend/src/server/coop/loadout-snapshots.ts`, `normalization.ts`, `role-readiness.ts`, `__tests__/phase3-normalization.ts`, `__tests__/phase3-roster-commit.ts`.
- Phase 4: `backend/src/server/expeditions/route-generation.ts`, `backend/src/shared/coop-types.ts`, `backend/src/server/coop/__tests__/phase4-routes.ts`.
- Phase 5: `backend/src/server/combat/types.ts`, `engine.ts`, `expedition-combat-service.ts`, `build-effects.ts`, `content/launch-combat.ts`, `content/asterfall-encounters.ts`, `backend/src/server/expeditions/node-resolution.ts`, `backend/supabase/migrations/20260917000002_coop_node_results.sql`, `backend/src/server/coop/__tests__/phase5-stateful-run.ts`.
- Phase 6: `backend/src/server/coop/echo-recruitment.ts`, `qmode.ts`, `__tests__/phase6-qmode.ts`, `backend/supabase/migrations/20260917000003_echo_privacy.sql`.
- Phase 7: `backend/src/server/coop/queue-service.ts`, `repositories/supabase-runtime.ts`, `__tests__/phase7-matchmaking.ts`, `__tests__/phase7-runtime-adapter.ts`, `backend/supabase/migrations/20260917000004_coop_live_tickets.sql`, `backend/supabase/migrations/20260917000007_coop_runtime_hardening.sql`.
- Phase 8: `backend/src/server/coop/ready-checks.ts`, `recovery.ts`, `__tests__/phase8-ready-recovery.ts`.
- Phase 9: `backend/src/server/coop/decisions.ts`, `__tests__/phase9-voting.ts`.
- Phase 10: `backend/src/server/coop/party-chat.ts`, `__tests__/phase10-chat.ts`, `backend/supabase/migrations/20260917000005_coop_party_chat.sql`, `apps/mobile/src/core/coop-presentation.ts`, `apps/mobile/src/online/coop-client.ts`, `apps/mobile/src/screens/CoopExpeditionScreen.tsx`, `apps/mobile/tests/coop-presentation.ts`, `apps/mobile/App.tsx`, `apps/mobile/src/screens/WorldScreen.tsx`, `apps/mobile/.env.example`.
- Phase 11: `backend/src/server/coop/reward-integrity.ts`, `__tests__/phase11-rewards.ts`, `backend/supabase/migrations/20260917000006_coop_reward_integrity.sql`.
- Phase 12: `backend/src/server/coop/config.ts`, `backend/src/server/combat/expedition-combat-service.ts`, `backend/src/server/expeditions/node-resolution.ts`, `backend/src/server/coop/__tests__/phase5-stateful-run.ts`, `phase6-qmode.ts`, `phase12-balance.ts`, `backend/artifacts/coop-balance-summary.json`, this phase report.
