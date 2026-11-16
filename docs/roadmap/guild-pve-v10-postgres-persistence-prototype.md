# Guild Expeditions V10 — Disk PostgreSQL persistence prototype

**Date:** November 15, 2026. **Status:** hidden developer prototype only, no production or staging database changes. This is a stacked continuation of [V9 transaction-port review](./guild-pve-transaction-v9.md), [V8 shared guild run](./guild-pve-shared-run-v8.md) and the V7 source-game combat bridge.

## Purpose and boundary

V9 defined a domain-level atomic port but used volatile JavaScript state. V10 replaces the **test port** with a real SQL transaction adapter backed by **PGlite v0.5.8**, already a dev dependency in `backend/package.json` and its pnpm lockfile.

This is an important **disk persistence proof** but **not a live PostgreSQL integration**: PGlite is embedded PostgreSQL with filesystem persistence and one local connection; it does not verify a Supabase connection, separate hosts/workers, pool exhaustion, network latency, user authorization or production row-level security. [PGlite filesystem documentation](https://pglite.dev/docs/filesystems) describes Node disk storage and [PGlite API documentation](https://pglite.dev/docs/api) describes parameterized queries and transactions.

Implemented files:

- [`backend/src/server/combat/guild-pve-pg-v10.ts`](../../backend/src/server/combat/guild-pve-pg-v10.ts): generic `GuildPveV10SqlAtomicPort` implementing V9's transactional port, with SQL `BEGIN ISOLATION LEVEL SERIALIZABLE`, `SELECT ... FOR UPDATE`, `UPDATE ...`, `COMMIT`, and `ROLLBACK`.
- [`tools/guild-pve-v10-pglite-qa-schema.sql`](../../tools/guild-pve-v10-pglite-qa-schema.sql): entirely separate **local fixture schema** `guild_pve_v10_qa`, nonpublic, RLS enabled, one JSONB state row. **Not** a migration and should never be applied to staging/production.
- [`tools/guild-pve-v10-pglite-integration.mjs`](../../tools/guild-pve-v10-pglite-integration.mjs): synthetic accounts, real V7 combat, disk reopen, receipt comparison, rollback and failure-injection tests.
- [`.github/workflows/guild-pve-v10-pglite-validation.yml`](../../.github/workflows/guild-pve-v10-pglite-validation.yml): no credentials or network DB connections, installs existing locked backend dev dependencies, typechecks, compiles and runs tests.

### What the adapter guarantees **within the isolated QA database**

1. Each decision reads an exclusive locked state row and validates the frozen V9 run, guild account binding, character loadout, Seal/Order limits, shared boss HP, Pressure and phases through V9's domain service.
2. The deterministic combat result and its idempotent receipt are written in the **same SQL transaction** as the mock guild ledger. A thrown callback or commit failure before persistence rolls back the complete candidate, not just the receipt.
3. A replay reads the existing receipt **before** checking current time. If state is unchanged, the adapter commits **without rewriting the row or incrementing its SQL revision**.
4. If COMMIT succeeds but the application loses the acknowledgement, the same nonce can retrieve the already-committed result from disk. The caller must retry; the first errored response is not misreported as a failed commit.
5. Transient `40001` serialization failures and `40P01` deadlocks retry the **whole** decision using the same inputs; the retry limit is bounded. PostgreSQL's [serializable isolation guidance](https://www.postgresql.org/docs/current/transaction-iso.html) and [retry guidance](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html) emphasize complete transaction retries.
6. The test closes the embedded DB, reopens the *same filesystem data directory*, and confirms the saved receipt and phase/HP balances survive, including an exact replay without further debit.

### IMPORTANT caveats and why V10 is not production-ready

The QA adapter stores **all guild runs, bindings, quotas, nodes, receipts and replay reels in a single JSONB row**. This intentionally limits throughput, introduces global contention and is not the V9 normalized [private-schema proposal](./guild-pve-v9-private-schema-proposal.sql). It is a proof of transactional domain semantics, not an appropriate production storage model.

- A local connection queue guarantees serialization **only for the PGlite test driver**. It cannot demonstrate that two separate PostgreSQL services can safely race on different connections. Real PostgreSQL multi-worker tests and failover are still a launch gate.
- No verified authenticated server principal is wired to an API. The synthetic `GuildPveV9TrustedLoader` in the test returns authored character kits; it is **not** reading signed game-state ownership and does **not** verify real online item copies or companion state. Earlier V7 and V9 source-game fixture tests cover some related calculations only.
- There is no read API, client screen, migration, Supabase edge function, scheduler, exact-once reward payout, guild bank material charge, supply/boon integration or 36-cue executable phase machine.
- The `databasePersisted=false` field in V9 receipts means **not in a live game database**. It is retained for backwards compatibility with V9 QA, even though V10 puts QA copies on a temporary embedded Postgres filesystem. Never use this field as a general durability indicator.
- PGlite's QA schema creates no access for `anon` or `authenticated`. A genuine deployment must remain in a private unexposed schema, strictly restrict grants, enable RLS and pass Supabase security advisor review. The current [Supabase Data API security guidance](https://supabase.com/docs/guides/api/securing-your-api) treats grants and RLS as independent access controls.
- Combat HP/difficulty tuning, V8's 1–3 member completion limits and attendance assumptions are synthetic. No tuning release decision follows automatically.

**Release gate:** V10 focused GitHub Actions must pass before treating disk persistence verified. The next production-oriented engineering step is a **normalized table adapter on an ephemeral true PostgreSQL CI service**, with two independent connections/workers, row-lock contention, forced crash after COMMIT and exactly-once outbox. Even that would not authorize changing the deployed game without a separate migration and security review.
