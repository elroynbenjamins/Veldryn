# World Boss V57 — shared account-erasure write fence

**18 November 2026 — PRIVATE TEST-ONLY DRAFT. NO STAGING/PRODUCTION MIGRATION.**

## Goal

A pending account deletion must prevent *new* World Boss attempts, replay proofs, donation receipts, wallet credits, reward ledger rows, claims, milestone attribution and retired Echo consent changes. The guard must not undo global World Boss HP, community War Camp totals or another account's receipts.

The V56 coordinator and [privacy release blocker #1348](https://github.com/elroynbenjamins/Veldryn/issues/1348) remain unmounted and unresolved.

## V57 database contract — test-only schema

`docs/roadmap/world-boss-account-write-fence-v57.sql` adds an **unexposed private** `world_boss_erasure_fences_v57` table, RLS enabled, no `anon`/`authenticated` access, and service-role **read-only** access with a scoped RLS policy. The service role is **not** granted permission to insert/update/delete a fence. Only a separately approved, privileged privacy worker could establish/finalize one.

The same nine account-linked identity columns reviewed by V36 are guarded on **INSERT and UPDATE**:

| Table | Identity column |
| --- | --- |
| `world_boss_attempts_v17` | `account_id` |
| `world_boss_milestones_v17` | `crossed_by_account` |
| `world_boss_echo_consents_v20` | `owner_account_id` |
| `world_boss_consent_commands_v21` | `owner_account_id` |
| `world_boss_war_donations_v27` | `account_id` |
| `world_boss_replay_proofs_v28` | `account_id` |
| `world_boss_wallet_v28` | `account_id` |
| `world_boss_reward_ledger_v28` | `account_id` |
| `world_boss_claim_receipts_v28` | `account_id` |

No writer may reassign an existing receipt to another account. A milestone's global crossing can be de-identified **only after** its original owner is fenced, and its request field must become `REDACTED`. This milestone treatment remains a **policy proposal**, not an approved retention rule.

### Absent-row concurrency guarantee

A plain read of the erasure table is insufficient: a writer could see no fence immediately before the privacy worker inserts it. V57 uses `pg_advisory_xact_lock(hashtextextended(account_uuid,570057))` in **both** the private row trigger and the fence-row trigger.

1. If a writer obtains the advisory lock first, the erasure fence INSERT waits until the writer transaction finishes; the earlier write is not retroactively rolled back.
2. If the fence is inserted first, the writer waits, then its read observes the committed blocked row and rejects the write.
3. Advisory locks last through transaction commit. Other accounts continue independently. A rare key collision can delay an unrelated account but cannot authorize a blocked owner.
4. The design assumes `READ COMMITTED`: V57 **refuses** account writes under `REPEATABLE READ` or `SERIALIZABLE` until safe retry/snapshot semantics are reviewed. Otherwise the writer might reuse an old snapshot after the advisory lock wait.
5. The privacy worker must **commit the short fence-insert transaction before acquiring any event-row locks**. It must NOT hold the account advisory lock while trying to lock World Boss events, because current V18/V22/V27/V28 writers already lock events before their personal receipt write and a reverse lock order would deadlock.

These constraints cover known **personal table writes**, not the full independent cancellation of an already-running combat simulator or a generic event-only admin write. A dedicated server service and staged worker monitoring remain necessary.

### Deletion and tombstone lifecycle

V57 does not provide a callable deletion or erasure endpoint. The existing V55 disposable regression deletes personal rows in child-before-parent FK order. It remains separate from actual storage replay removal, session revocation and Supabase Auth Admin deletion.

The fence table has no FK to `auth.users` because it must survive that user's Auth deletion until privacy processing finishes. The prototype refuses unfencing while an Auth record exists. **How long the account UUID may remain in the tombstone is still subject to #1348 retention approval**. V36's preflight explicitly recognizes this single new reviewed privacy column, while any other identity-column drift still fails closed.

## CI checks and release gates

1. `world-boss-account-write-fence-v57.sql` installs the test-only schema **in GitHub Actions' disposable PostgreSQL service**, not Supabase.
2. `world-boss-account-write-fence-v57-smoke.sql` is a **BEGIN/ROLLBACK-only** test with synthetic accounts, all nine receipt types, the real `world_boss_v28_claim` path, forbidden reassignment, safe milestone redaction, other-account writes and shared HP/War Camp immutability. It separately tests rejection of `REPEATABLE READ` with a rollback.
3. `world-boss-account-write-fence-v57-race-ci.sh` uses **two real PostgreSQL connections** to test writer-first vs fence-first races and cleans up its synthetic fixtures. It refuses any database host other than local disposable PostgreSQL.
4. V57 SHA/source integration, branch reconciliation and exact-head GitHub Actions success must be verified. These tests are **not assumed green** while queued.
5. Still blocked: staging migrations, approved privacy policy, account deletion coordinator's real dependencies, read-only privacy source, multi-character fixtures and end-to-end gameplay tests.

**Nothing in V57 performs account deletion, creates a World Boss event, awards currency, or enables production routes.**
