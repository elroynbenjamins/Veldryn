# Veldryn Guild PvE — V9 Atomic Port & Private Schema Plan

**November 15, 2026 · Hidden/test-only engineering candidate · Not deployed.**

Depends on [V8 shared in-memory guild emulator](./guild-pve-shared-run-v8.md) and [V7 source-derived real-engine simulation](./guild-pve-real-engine-v7.md). The V8 PR remains separate; V9 is proposed as a **stacked PR based on its review branch**, not a standalone live implementation.

## Verified current staging DB shape (metadata only)

Read-only information_schema inspection of **Veldryn Staging 20260924** showed existing tables, without reading personal account rows:

- `public.guilds(id uuid)`, `public.guild_members(guild_id uuid, account_id uuid, joined_at timestamptz)`.
- `public.online_game_states(account_id uuid, character_id uuid nullable, state jsonb nullable, revision bigint)`.
- `public.guild_pve_encounters_v1`, `guild_pve_members_v1`, `guild_pve_roster_v2`, `guild_pve_treasury_v1` — **existing Guild PvE systems, not Broken Forge**.
- `public.request_idempotency(account_id uuid, action text, idempotency_key text, request_hash text, response_json jsonb)`.

The V9 expedition schema intentionally **does not alter or reuse any of these existing Guild Hunt tables**. No Supabase migration was run, and the staging and production account/game rows were not read or modified.

Supabase's current API guidance requires considering **SQL grants and RLS together**, keeping sensitive tables out of exposed schemas, and denying direct `anon`/`authenticated` access to server-owned transaction stores. Refer to [Securing Your API](https://supabase.com/docs/guides/api/securing-your-api).

## What V9 actually implements

The hidden [transaction port](../../backend/src/server/combat/guild-pve-transaction-v9.ts) implements a real domain-level atomic submission algorithm over an injected `GuildPveV9AtomicPort.transaction()` interface:

- **Server principal only**: `principalAccountId` comes from an authenticated server-owned context (the test explicitly injects one); request actions cannot supply their own account ID or power stats.
- **Replay first**: before checking close time, read the saved per-account/cycle/request receipt; matching commands return the immutable previous result; changed content fails.
- **Immutable V8 run configuration**: 14-day active window, frozen roster/gear-reference digest, difficulty, node HP and guild Pressure.
- **Real game-engine combat delta**: `GuildPveV9TrustedLoader.resolveOwnedActor` must return verified account-owned character/equipment/abilities and GameState revision, then V7 runs deterministic attack simulation. Synthetic fixtures exercise the real Veldryn equipment/skill calculations, not live player data.
- **Shared ledger**: clamp actual HP removal by remaining node HP, cross guardian-only thresholds once in sequence, apply Pressure changes, consume **4+4 Seals** / **3+3 Orders** across an account's characters, update the run revision and save the exact combat preview and receipt in the **same abstract transaction**.
- **One guild per cycle**: cross-guild cycle-account binding is stored under a single global key, not just per guild. A different guild cannot double-spend the same account's allowance.
- **No-op stale action**: a second attack that reaches a previously cleared node creates an immutable zero-debit, zero-damage receipt. Previously committed requests remain replayable after cycle close.
- **No reward or resource debit**: every result explicitly records `rewardMinted=false`, `inventorySpent=false` and `databasePersisted=false`.

**Scope and guarantees:** `InMemoryGuildPveV9Store` serializes operations in one JS process, atomically promotes a cloned state on success and discards it on error. Its cached data remains entirely volatile. Recreating the service object against the *same mock store* demonstrates loss of service-local cache, **not recovery after restarting the database or killing the store process**. No production adapter exists, no DB writes occur, and no cross-worker guarantee is claimed.

## SQL proposal is not a migration

[Private PostgreSQL schema draft](./guild-pve-v9-private-schema-proposal.sql) proposes separate `guild_expedition_private_v9` tables:

| Proposed table | Why |
| --- | --- |
| guild_runs | One frozen six-week cycle/guild run; Pressure and revision |
| guild_nodes | 18 shared targets, HP, phase, crossed thresholds |
| roster | Frozen accounts, contribution eligibility, Seal/Order usage |
| cycle_account_bindings | Unique cycle/account to one guild; blocks guild switching |
| action_receipts | Unique cycle/account/request nonce and exact immutable result |
| entitlement_outbox | Future exactly-once reward rights; **no grant implementation yet** |

All proposals use **private schema, RLS enabled, explicit denial to `anon` and `authenticated`**, and no publicly callable privileged functions. The file is deliberately under `docs/roadmap/`, **not** under `supabase/migrations/`. Applying it would require a reviewed deployment migration, staging advisory checks and real PostgreSQL concurrency tests. A hash is integrity evidence, not authorization.

## Focused test coverage

[Test suite](../../apps/mobile/tests/guild-pve-transaction-v9.ts) reuses T2 valid game-equipment loadouts and tests:

- An accepted action and exact receipt replay through **two distinct service objects** over one in-memory mock.
- An injected commit-time failure after V7 combat completely rolls back the candidate HP, Pressure, Seal and receipt; retry then succeeds.
- Concurrent different-account attacks against an almost-defeated node: one committed, another saved as no-cost stale.
- Altered request on the same nonce rejected; actions after T+14 rejected unless they are exact receipt replays.
- Cross-guild account binding across two runs of the **same global cycle**.
- Two characters on one account share **4+4 Seal** quota; supported optional explorations share **3+3 Orders**.
- Seven mandatory nodes, three guardian-only phase progressions (six threshold crossings) and pressure bounded 0–100.
- **21 scenario runs:** roster sizes 1, 2, 3, 4, 8, 12, 20 × Scout/Veteran/Mythic with 75% ceiling attendance and six Seals per attending account, unless full clear occurs earlier. Results are **synthetic, not population win probabilities**.

The read-only [GitHub Actions workflow](../../.github/workflows/guild-pve-v9-validation.yml) compiles and runs this suite. Do not claim a passing test or completed dataset before the CI run concludes successfully.

## Still needed before a real server integration

1. Review the authoritative online GameState revision/ownership API and build an authenticated DB loader. Do **not** take account ID, Combat Power, gems or companion kit from a client request.
2. Implement one durable serializable database transaction or a DB-backed reservation/settlement worker model; test multi-worker cross-guild races and `40001` retries, crashed workers, restart recovery, incompatible receipt payloads and stale target refunds.
3. Add account-level guild tenure/late-join contract and bind guild membership when the first action is actually committed; handle Guild Hunt separately.
4. Make all 36 V5 phase cues executable, including warning/resolve ordering across one attack and real shared afflictions. The current V7/V8/V9 attack is **phase-local** and only the *following* attack sees the new phase.
5. Implement actual skirmisher/elite variations and optional supply/voting/combat boons (Armoury, Watchtower, Shrine, stabilizer, protection charges).
6. Audit source materials and Gold scarcity before accepting real supply debits. No guild bank automatic usage.
7. Add real Guild Token/XP/cosmetic milestone entitlements and an audited outbox/grant service, with unique source keys, participant eligibility and account/guild cycle caps.
8. Test real 14-day attendance and typical gear/companion distributions, roster mix, difficulty, class role fairness, mobile UX and localizations. The earlier model's HP/difficulty scalars are unapproved.

**V9 is a safe, test-only engineering step. The weekly Guild Hunt, World Boss, Party Events, staging data and production data remain unchanged.**
