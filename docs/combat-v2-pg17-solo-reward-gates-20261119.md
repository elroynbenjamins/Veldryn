# Classes/Skills 2.0 — PG17 persistence and solo reward lifecycle (19 November 2026)

**Status: private WIP only. No live route, staging migration, production deployment, or actual account rewards.**

## Pass 1 — Postgres-backed solo snapshot QA

Staging project `Veldryn Staging 20260924` was inspected using **read-only metadata queries**. PostgreSQL version 17.6, public character and online-game tables exist with the expected columns. As of this check, neither `private.combat_v2_character_builds_v1` nor `private.combat_v2_solo_snapshots_v1`, nor their RPCs, exists in staging. No player data was read or written.

An actual syntax error in the unreleased `20261118213000_combat_v2_solo_snapshot_hidden_v1.sql` fingerprint regex was fixed. Static migration audit now explicitly checks this literal. A new `backend/tests/combat-v2-pg17-disposable-concurrency.sh` runs BOTH real hidden migration files on a throwaway PostgreSQL 17 database, seeded only with synthetic fixtures, and tests:

- 16 independent SQL sessions racing for one encounter ID -> exactly one immutable receipt.
- Retries after current game/build revisions change -> original JSONB response, no reroll.
- Different digest for an existing encounter -> conflict.
- Wrong account/character -> reject, not an information-bearing readback.
- Stale new encounter -> reject (CAS).
- Uncommitted reservation rolled back -> no stored row.
- `anon` / `authenticated` denied privileged RPC/SQL table rights; `service_role` allowed function execute.

The new GitHub Actions `disposable_pg17` job uses an ephemeral Docker `postgres:17` service and explicitly requires `PGDATABASE=combat_v2_test` plus `COMBAT_V2_DISPOSABLE_DB=YES_TEST_DATABASE`. **Never point this script to staging/production**: it creates disposable `public.characters` fixtures. All real staging two-client tests remain release-blocked until the separate staging-only migrations are approved/applied and QA fixture isolation is planned.

## Pass 2 — replay-proof reward-settlement boundary

Added `backend/src/server/combat/v2/solo-reward-settlement.ts`, a **hidden, unmounted, disabled-by-default** server contract. The service:

1. Loads the immutable solo snapshot and deterministic, engine-verified replay from the private persistence service — no client supplied outcomes.
2. Verifies the actual player/enemy roster, victory result and final `combat_end` event; wipe/timeout never issues a grant.
3. Derives a stable combat outcome digest bound to the snapshot digest, enemy state, event log and battle duration.
4. Uses only an explicitly approved server reward policy, positive bounded integers and an allowed-resource table to produce a digest-bound reward plan. **No amounts are approved or hardcoded for a release here.**
5. Defines a transaction store that MUST atomically lock the snapshot, deduplicate source key, persist the original receipt, apply wallet/XP/material (and later verified equipment) custody and Inbox entries; it MUST rollback ALL writes together.
6. On retries (including lost ACKs and reward policy rotation), rereads the original receipt and verifies provenance without minting another reward.
7. Rejects forged receipts, duplicate grant lines, invalid policy grants and duplicate cross-account sources.

A new deterministic test covers disabled paths, 16 duplicate calls, first receipt, lost acknowledgment, rollback, policy rotation, false victories, foreign ownership and oversized grants. **This in-memory store test does NOT prove real wallet/inventory custody or database-level atomicity.**

The proposed ledger in `docs/operations/sql-drafts/20261119_combat_v2_solo_rewards_ledger_REVIEW_ONLY.sql` is fully commented out, never migrated and never made available via an Edge/RPC route. A real atomic transaction-local reward writer still needs design approval and connection to the existing account/currency/XP/Inbox/item ledgers.

## Release hold and next verification

- [ ] Exact-head GitHub CI: migration parsing, 16-session PG17 race and TypeScript rewards test **green**; currently unverified.
- [ ] Stage the hidden migrations on an approved, isolated QA environment only; test two-connection races and PostgreSQL grant/ownership checks.
- [ ] Adopt approved nine-class/tier reward economics and bounded source-owned grant policy.
- [ ] Implement and test transactional account wallet, combat skill XP, companion essence/material, verified item source and Inbox writes, plus reward receipt integrity and cross-character ownership.
- [ ] Validate rollback if any grant, Inbox, item issuer or database commit fails; test retries after rotation/network loss.
- [ ] Integrated equipment/class/enemy balance, dungeons/Q-Mode unchanged, migration rollback and Android QA.

**No production progression, equipment, currency, dungeon, live combat, rewards, migrations or release flags were modified by this pass.**
