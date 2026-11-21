# Player Market V28 — private, single-item expiry adapter

**15 November 2026 · Draft PR #1055 · Hidden/unreleased · No scheduled job**

## Purpose

Make the future expiry worker callable through a **database-owner-only,
single-item interface**, without exposing any Market endpoint, granting
service-role EXECUTE, or opening the hard-false trading gates.

The V28 functions live in `private` and are `SECURITY INVOKER`, with
`EXECUTE` explicitly revoked from PUBLIC, anon, authenticated and
service_role. Every invocation is intentionally one database transaction.
No pg_cron scheduling, Edge mounting, financial settlement, user claim or
inventory credit is introduced.

### Resale expiry

`private.market_expire_next_resale_v28()` selects the oldest due active
resale **without first taking an offer row lock**. It then calls
`private.market_expire_resale_v24`, which takes the canonical seller
advisory lock, reloads the row, and atomically creates **one pending return
entitlement**. This preserves the same seller-first lock order used by
V23 cancel/purchase and avoids a new DB-lock inversion.

- Stable idempotency key: `autoexp_<resale UUID without hyphens>`.
- Stable request hash: PostgreSQL 17 SHA-256 of
  `market-auto-expire-resale:<resale UUID>`.
- A competing buyer, seller cancellation or worker can win; the losing
  worker returns `processed=false` only for known stale/not-open failures.
  Other errors fail loudly for monitoring; no manual Gold correction or
  duplicate entitlement is attempted.
- The main runtime/snapshot and equipment-transfer launch gates remain
  required. With no due offer, returns `processed=false`.

### Resource/gem stack expiry

`private.market_expire_next_stack_v28()` delegates exactly one due
hold to `private.market_queue_due_returns_v2(1)`. That existing
function performs seller-account serialization and closes any active
resource offer and escrow hold in the **same database transaction**, then
records one one-time pending return delivery. It does not credit inventory
or Gold. The hard-false main Market gates are required.

### Tests and validation

- `backend/supabase/tests/player_market_expiry_worker_v28.sql`
  checks existence, ACL/invoker mode, disabled gates, unchanged Gold/return
  ledgers, zero-due stack behavior with synthetic temporary flags, and
  independent equipment gate denial.
- `backend/supabase/tests/run_market_v12_full_stack_ci.sh`
  now loads **38** ordered Market migrations and executes the V28
  rollback test before synthetic race jobs.
- **Passed (rollback-only):** staging PG17 compiled the actual 14 V18–V28
  migrations and ran V28 disabled/idle path tests. Read-back showed
  `market_api_internal` schema still absent; both live Market flags
  remained false. This is not a persistent staging migration.
- **Not yet verified:** successful expiry of a seeded, due real item,
  overlapping V24 purchase-vs-expiry race, genuine asynchronous scheduler
  execution, failure retries, or green GitHub Actions CI. Do not claim
  those behaviors production-tested.

### Remaining next work

1. Add positive (due listing) fixture tests for both stacks and resales.
   Test two workers racing with a purchase/cancel; assert only one return,
   one sale maximum, no double item/Gold transfer, exact Forge identity,
   stable idempotency and no locks stuck.
2. Once all Market custody and Gold lifecycle code has passed and a
   separate launch approval occurs, schedule the owner-only functions
   through an audited `pg_cron` process with explicit owner credentials,
   interval, alerting, timeout and a monitored retry/dead-letter policy.
3. Add observability that reports due backlog, oldest due age, successful
   expiry, stale races and failures without exposing account details.
4. Wire client Market Inbox and listing statuses only after the full
   authenticated release gate is satisfied. Never auto-claim returns.
5. Keep PR #1055 in draft. No deployment/migration/feature-flag change
   is justified by this groundwork alone.

## Branch consolidation

The hidden V17–V27 branch was reconciled with current `main` before
starting V28: a **two-parent merge commit** retained all newer `main`
code plus the Market-only changes. The only overlapping changed path was
`apps/mobile/src/screens/MarketInboxPanel.tsx`. We kept `main`'s newer
localization and localized numeric formatting and did not reinstate the
outdated purchased-equipment bank restriction.

GitHub's subsequent compare showed **0 commits behind main** at that
checkpoint and PR #1055 remained draft/unmerged; all fresh CI workflow
runs were still **queued**. A merge base reconciliation is not the same
as passing the full updated runtime/mobile test matrix.
