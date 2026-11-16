# Veldryn Guild PvE V11 — Normalized, isolated PostgreSQL concurrency tests

**Date:** November 15, 2026. **Development-only; not deployed; no player data touched.** This pass extends [V10 filesystem-backed PGlite QA](./guild-pve-v10-postgres-persistence-prototype.md), [V9 transaction contract](./guild-pve-transaction-v9.md), [V8 shared run](./guild-pve-shared-run-v8.md), and [V7 real-combat fixture evidence](./guild-pve-real-engine-v7.md).

## Why V11

V10 proved that a SQL transaction and receipt can survive closing and reopening a local embedded PostgreSQL database. However, its entire candidate run ledger was in **one JSONB state row**, and its concurrency test driver permitted only one connection. Neither proved safe independent-worker contention or a realistic normalized ledger.

V11 adds an **ephemeral PostgreSQL 17 database service in GitHub Actions** and a **normalized private QA schema**. All data comes from fabricated guilds/accounts; no credentials or connection to Veldryn Supabase staging/production are used.

### Implemented files

- [`tools/guild-pve-v11-postgres-qa.sql`](../../tools/guild-pve-v11-postgres-qa.sql): five normalized tables with primary/foreign keys, status/currency/HP constraints, RLS enabled and no public schema or function grants. Private fixture-only SQL `qa_commit_action` function executes an entire row-locked action atomically using `SECURITY INVOKER`.
- [`tools/guild-pve-v11-postgres-seed.sql`](../../tools/guild-pve-v11-postgres-seed.sql): 5 fictional guilds with 18 V4 Broken Forge nodes each (90 graph rows), including seven mandatory fights and three named guardians.
- [`tools/guild-pve-v11-postgres-concurrency.mjs`](../../tools/guild-pve-v11-postgres-concurrency.mjs): Node 22 runner spawning actual independent `psql` processes and asserting persisted receipts, row locking, action quotas, replay, closure, rollback, and phase/Pressure progress.
- [`.github/workflows/guild-pve-v11-postgres-concurrency.yml`](../../.github/workflows/guild-pve-v11-postgres-concurrency.yml): launches a clean PostgreSQL 17 Docker service with CI-only credentials, checks script parsing and runs tests. The DB is discarded after the job.

### Proofs and test cases

| Property | Test method |
| --- | --- |
| Independent SQL sessions | Two OS `psql` processes race on an almost-dead shared node; one pays one Seal, the second receives a saved **stale/zero-cost** result |
| One account per guild/cycle | Two different guilds race to bind the same account; an advisory transaction lock and primary-key constraint allow **one** |
| Crash/rollback | An action is performed inside `BEGIN` and then rolled back; neither receipt, attempt debit, Pressure nor HP persists |
| Replay after close | Same nonce and matching fingerprint returns the original JSON receipt after day 14 with no additional run revision |
| Nonce alteration | Reusing the nonce with a changed fingerprint is rejected, not rerolled |
| Week 1/2 allowance | Four Seals initially and eight cumulative from day eight; three Orders initially and six cumulative from day eight |
| Shared phase thresholds | Only Gatekeeper/Seer/Warden have two ordered phase transitions each, including attempts that skip both thresholds |
| Pressure clamps | Ten Assaults reach the cap of 100, Guard reduces to 84 and Rally to 72 |
| Locked content | Future main-path nodes are rejected before prerequisites clear; no currency or receipt created |
| Data access protection | QA tables have RLS enabled and the private schema/function has no default PUBLIC grants |

This is stronger concurrency evidence than V10's serialized in-process test, **not a claim of live account/engine protection**. The SQL directly receives `p_account`, `p_now` and `p_trusted_damage` from a private synthetic test client. They are **not authenticated, verified or safe for a user-accessible endpoint**. No Guild PvE route should import or deploy the QA function.

### PostgreSQL transaction pattern

1. A transaction-scoped advisory lock serializes competing actions for the **same global cycle/account**, even across guilds. Independent account actions on the same guild synchronize with a `guild_runs ... FOR UPDATE` row lock.
2. The existing receipt is checked **before** the active-window check. Identical requests return stored results after the event ends; different fingerprints reject.
3. Next the server would check authenticated identity, frozen roster eligibility and immutable reference loadout. The **QA function cannot perform these production validations**.
4. Under row locks, check cleared/locked target and account-wide Seal/Order quotas. Clear targets return no-debit stale receipts; locked targets reject.
5. Clamp trusted damage to remaining shared HP; calculate ordered guardian thresholds and shared Pressure; update normalized rows, cycle binding and receipt in the **same transaction**.
6. Commit once; other workers reread the updated rows before their decisions. The real production implementation must apply bounded retry of complete transactions on `40001` and `40P01`.

### Explicitly not implemented

- Production-suitable API authentication, `online_game_states` ownership/revision validation and real game-engine damage snapshots **within the DB transaction**. V11 accepts test-authored damage to validate DB behavior only.
- Deployable migration under `supabase/migrations`, staging or production tables, Edge Function, client UI, feature flag or full six-week scheduler.
- Durable outbox settlement, Guild Tokens/XP, optional supply and vote actions, resource consumption, guild bank access or late-join roster rules.
- V5's full 36-cue cross-phase combat script, true optional elite kits, combat telegraph effects or class balance calibration.
- Real network partition/failover tests. The CI proof shows isolated PostgreSQL connections on one PostgreSQL container; it does not simulate multi-AZ failover.
- Approved HP, damage, stance or currency balance. All inputs are synthetic.

### Next engineering gates

After focused CI validates V11, carry its normalized key/locking design into a **reviewed private PostgreSQL schema migration**, but only following an explicit security review of authenticated server authority. Replace test-authored combat results with the real V7+ owned equipment/ability snapshot service. Add an authoritative, server-time admission/commit boundary for asynchronous 18-second combat and durable reservation/outbox. Then attach all authored cues, optional boons, deterministic rewards and final UI only after separate balance passes.

**Guild Hunt is unchanged. World Bosses, Party Events, player accounts, inventories and payout systems are untouched.**
