# Player Market V27 — retention, real V24 integration and concurrent-read QA

**15 November 2026 | Draft PR #1055 | Hidden, unmerged, undeployed**

## Implemented

1. `backend/supabase/migrations/20261115220000_market_read_rate_retention_private_v27.sql`
   adds a chronologically indexed, 48-hour retention policy for the existing
   V26 read-rate buckets. After every successful bucket insert/update, a
   restricted trigger prunes **at most 64 expired rows belonging to the same
   authenticated account**. This never touches another account's records.
2. `market_api_internal.market_prune_old_read_buckets_v27(p_limit)` provides a
   **bounded** (1–1000 rows per call), owner-only, skip-locked sweep for
   inactive accounts. It is not callable by anon, authenticated or
   service_role. This pass **does not install cron**, extend the REST surface,
   approve assets or activate trading. A trusted `pg_cron` schedule may be
   added during reviewed release integration, with a cleanup/run-history
   policy and explicit verification.
3. `backend/supabase/tests/player_market_rate_retention_v27.sql` covers
   ACL/RLS, actor isolation, no deletion of young rows, bounded global
   cleanup, idempotency and invalid limits. Fixes found during staging:
   the trigger table alias `old` conflicted with PL/pgSQL's built-in
   `OLD` record; an initial expected row count incorrectly included
   three already-deleted synthetic records.
4. The disposable PG17 bootstrap now defines a test-only `auth.uid()`
   helper equivalent to Supabase's session-claim function. Without that,
   the previously added V26 reader would fail in clean CI despite working
   in hosted Supabase. This is a **CI bootstrap only**, not a production
   authentication migration.
5. `backend/supabase/tests/player_market_read_quota_race_v27_ci.sh`
   adds four concurrent authenticated PostgreSQL reader sessions on a
   **disposable localhost database only**, each issuing 10 Market browsing
   requests for the same account within one minute. Exactly 30 should pass,
   10 should be throttled, and the durable bucket must remain at 30.
   This test is wired **after** the existing V24 buyer-race script. It
   temporarily opens the false Market guard only in localhost disposable
   CI, then restores the guard constraints. It has not yet been observed
   passing in GitHub Actions.

## Verified with the real migrations on staging PG17

A single explicit transaction loaded **13 actual V18–V27 migration files**
(including V24's combined browse, Inbox, expiry and V12 reconciliation)
on top of the existing staging Market foundation. Separate savepoints
allowed both the V26 session/JWT/ACL/rate tests and the V27
retention/isolation tests to run against the **real V24 projections**.
All tests passed after the two V27 corrections.

The outer transaction was rolled back. Staging read-back confirmed:

- No V26/V27 `market_api_internal` schema remains installed.
- `private.market_runtime_guard_v1.trading_enabled=false`.
- `private.market_runtime_guard_v1.snapshot_bridge_ready=false`.
- Market Gold-intent count remains zero.
- No persistent migration history, user records or policy approvals changed.

This is positive evidence for **single-session SQL integration**, not for
the authored four-session CI contention script or Android behavior.

## Branch/release risk

The draft Market branch remains significantly behind `main` (at this
checkpoint, approximately 547 newer main commits and 99 commits on the
Market side). GitHub's compare endpoint caps file-change lists, so a
naive intersection of changed filenames is **not** a trustworthy
merge-conflict audit. Do not claim the branch is safely rebased or
ready to merge.

Before any Market rollout:
- Observe green GitHub PG17 V24+V27 full-stack and concurrency runs.
- Reconcile the complete hidden branch against current `main` without
  dropping newer gameplay, mobile, guild, dungeon or economy changes.
- Test current generated Edge gameplay bundle parity and normal mobile
  market screen layout/translation contracts on the integration branch.
- Do not mount the Edge route, deploy the migrations or enable Market
  flags until isolated security, complete custody/Gold economy and
  release approval gates are met.
