# V82 — Account erasure compatibility for shared chest receipts

**19 November 2026. Review-only V70 SQL changes, not a migration.**

The earlier V70 draft had three `ON DELETE RESTRICT` foreign keys
(`auth.users → chest_account_fence_v70`, `auth.users → chest_reward_receipts_v70`,
`chest_reward_receipts_v70 → chest_reward_grant_legs_v70`) and immutable
`BEFORE DELETE` triggers. That combination blocks ordinary authenticated
account deletion after a player has opened any chest.

The new draft uses scoped `ON DELETE CASCADE` FKs and an immutable
trigger that allows child deletion **only after the owning auth.users row
has been deleted within that same transaction**. Direct DELETE while the
account exists remains blocked, UPDATE remains forbidden, and normal
clients/service_role retain zero write grants. The parent `auth.users`
deletion itself must happen only via the approved account-deletion flow.

Disposable PGlite regression:
- Direct receipt/leg DELETE and receipt UPDATE remain denied.
- Parent `auth.users` deletion purges exactly that account's V70 fence,
  receipts and append-only grant legs; unrelated users and their locks remain.
- An explicit ROLLBACK restores account identity, receipts and legs.
- No new public RPC, erasure endpoint, privilege grant or production SQL.

**Important:** This is only V70's bookkeeping. Actual secure deletion
must also erase canonical V11/V61 source rows, V80 Inbox history,
Gold/Party Sigils/physical rewards and client sessions through the
separately approved account-deletion integration. PostgreSQL 16
two-session concurrency and audit log retention are still unverified.
