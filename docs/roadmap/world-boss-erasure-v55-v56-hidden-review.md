# World Boss V55–V56 — account-erasure dry run and retry coordinator

**18 November 2026 · Hidden, UNMOUNTED, review-only. Not approved for staging or production.**

## Why this is necessary

World Boss V17–V28 stores per-account battle attempts (including frozen gear/character snapshots), replay object locators, private replay proofs and utility ledgers, War Camp donation receipts, wallets and reward claims. Some reference `auth.users(id) ON DELETE RESTRICT`. The shared realm event's boss HP and War Camp totals are **not** the same as personal records and must never be reversed when an account is erased.

The privacy/retention decision and privileged deletion owner are still open in [#1348](https://github.com/elroynbenjamins/Veldryn/issues/1348). **Do not interpret the V55 smoke or V56 model as legal approval to keep or delete any particular category of data.**

## V55 disposable PostgreSQL regression

`docs/roadmap/world-boss-account-erasure-v55-smoke.sql` is added after the V53 guard in the hidden World Boss CI workflow. It begins a transaction and ends with `ROLLBACK`.

It creates two **synthetic** accounts, one shared historical event, committed battle/HP receipt shapes, replay proofs, War Camp donations, earned Sigil ledger and claimed wallet receipts, plus a milestone and old consent rows.

The temporary `pg_temp.wb55_fixture_purge` function is **not a deployed erasure RPC**. It demonstrates the required order and simulates external replay removal acknowledgement, but it **does not purge any real external replay**:

1. Lock related event rows in deterministic UUID order, then lock the account row. Actual workers will require a common transactional erasure fence before this is safe.
2. Verify the existing V36 metadata/record-count preflight. Refuse when a replay object exists but the fixture has not simulated an external purge acknowledgement.
3. Delete replay proofs **before** their parent battle attempts, and remove private account-specific claim receipts, reward ledgers, wallets, donations and retired Echo consent rows.
4. Clear the synthetic milestone's account/request identity while preserving the global crossing record (an **illustrative** treatment, subject to policy approval).
5. Check the V36 preflight has zero remaining account records, then exercise `auth.users` FK behavior only inside the disposable CI database. Actual Auth deletion must use an approved Supabase Admin workflow.
6. Verify that global boss HP/revision/status, War Camp progress, and all of the second account's attempt/replay/donation/claim/ledger records remain unchanged.
7. Retry the simulated cleanup; verify it cannot recreate payouts, personal rows or change global HP.

**Not yet demonstrated by this smoke:** two-session Postgres concurrency against V18/V22/V27/V28, crash recovery across separate DB and object-store transactions, actual storage deletion, Supabase Auth admin behavior, schema drift beyond V36's known columns, or production permissions. The test is registered in CI but is not claimed passing until an exact-head job reports success.

## V56 hidden, unmounted erasure coordinator

`backend/online/world-boss-account-erasure-v56.ts` exports a typed, dependency-injected coordinator with `WORLD_BOSS_V56_ERASURE_LIVE=false`. It accepts an **opaque trusted privacy-service ticket**, not a client-supplied account UUID.

| Durable stage | Expected trusted-side action |
| --- | --- |
| `fenced` | The DB has already blocked future per-account reservations, donations, claims, settlements and account status reads. Delete all private replay objects idempotently. |
| `replays_purged` | Acknowledge object deletion durably, then purge/check World Boss private account rows in one transaction. |
| `rows_purged` | Delete the Auth user through the approved Admin API; treat lost-ACK/missing-user retries as success only with authorization proof. |
| `auth_deleted` | Finalize the privacy ticket according to the approved minimal-retention policy. |
| `complete` | Repeated processing returns completion without performing another deletion. |

The **runtime** entry `runWorldBossErasureV56` throws `world_boss_v56_runtime_disabled` before reading a ticket or invoking any backend dependency while the release flag is false. All offline tests instead call a separately named `simulateWorldBossErasureV56ForTests` runner with synthetic adapters. This test runner must never be imported into a production route/worker. The coordinator never returns replay object keys, account identifiers, wallet data or Auth secrets to the caller. It releases only its per-worker lease on a failure; the persistent account write fence must remain active until the authorized workflow is resolved. A second worker that cannot acquire the lease reports `in_progress`.

`apps/mobile/tests/world-boss-account-erasure-v56.ts` uses a **purely in-memory** synthetic store to check stage ordering, object-store failures, Admin Auth failures after SQL cleanup, idempotent retries, concurrent workers and forged tickets. The file is included in the focused TypeScript config and World Boss CI workflow.

## Mandatory implementation and verification before any real account can be erased

- **Policy:** privacy/legal/product review decides which personal World Boss fields are deleted, whether any de-identified event milestones may be retained, how long audit keys survive, and the required external replay retention period. V55's anonymized milestone is only a test proposal.
- **Durable fence:** implement a private, server-owned, auditable account deletion state with strict RLS/privileges. Update **all** V18/V22 reservation, V27 donation, V28 replay/claim/settlement and other World Boss writers to check and lock the fence under a consistent global order; current functions do **not** do so.
- **External objects:** idempotent key-scoped replay purge with an internal durable outbox/ack protocol so crashes between storage and DB operations can resume without losing keys. Do not delete the SQL key manifest before object deletion is confirmed.
- **Auth:** server-only verification, session revocation, Admin user deletion, and race/lost-ACK recovery. Do not delete Auth identities directly from Veldryn production SQL. JWT expiry and refresh-token behavior need separate review.
- **Staging:** private schema/permissions and safe migrations, account-erasure lifecycle fixtures for 1–5 owned characters, two independent PG connections, interleaved checkout/claim/donation race tests, injected network failures, real object-store deletion test, and a rollback plan.
- **Mainline & gates:** reconcile both diverged PRs with current `main`, exact-head CI, Android UI QA, and independent release approval. World Boss data stays unavailable to production players.

**No real Supabase table, Auth user, wallet, replay, combat encounter or saved character is read or changed by these two hidden files.**
