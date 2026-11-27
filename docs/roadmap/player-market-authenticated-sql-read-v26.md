# Player Market V26 — authenticated SQL reads and persistent rate limiting

**15 November 2026 | Hidden draft PR #1055 | Unreleased / no production or persistent staging deployment**

## Summary

Completes the next internal subpass after V25's strict HTTP validation.
The V26 SQL bridge takes a verified **Supabase user JWT**, derives the
account using `auth.uid()`, and invokes only the existing private V24
browsing or account-scoped Inbox projection. There is **no API account-ID
parameter**, no privileged service-role token, and no Market mutation path.

### Files

- `backend/supabase/migrations/20261115210000_market_authenticated_read_bridge_private_v26.sql`
  adds a non-exposed `market_api_internal` schema with one tightly-scoped
  `SECURITY DEFINER` read function, a private RLS-enabled rate-bucket
  table, and a `public.market_read_gateway_v26` `SECURITY INVOKER`
  PostgREST facade. The public facade has EXECUTE **only** for
  `authenticated`; private V24 functions remain revoked to all REST roles.
- `backend/online/market-sql-reader-v26.ts` prepares an Edge read
  adapter that authenticates against Supabase Auth and forwards the **same
  user bearer token** to the dedicated read RPC using the publishable
  anon key, never the service-role key. It submits strictly typed V24
  filters, never accepts a caller-supplied owner, and maps only specific
  disabled/429 errors without leaking SQL messages.
- `backend/online/tests/market-sql-reader-v26.ts` verifies JWT forwarding,
  exact payloads, account spoofing denial, disabled gates, sanitized
  database failures, and absence of a Market write endpoint.
- `backend/supabase/tests/player_market_authenticated_read_v26.sql`
  checks role grants, RLS, false launch flags, anonymous denial,
  authenticated-only access, 30 browse and 20 Inbox queries/minute,
  separate per-account buckets, and transactionally rolled-back test
  relaxation of the two hard-false Market guards on **disposable CI PG17**.
- Both `test:market-readiness` and the 36-migration disposable PG17
  Market full-stack runner include the V26 assertions.

### Security design

1. Auth may come **only** from a verified Supabase session JWT. PostgREST
   revalidates the bearer independently; `auth.uid()` inside the private
   function is the final authoritative actor. Neither Edge nor SQL accepts
   a seller/recipient/owner account ID for Inbox reads.
2. The invoker facade in `public` contains no privileged operations.
   The definer is in a distinct **non-exposed** schema, not the existing
   `private` schema; it is callable only by `authenticated` and checks
   `request.jwt.claims.role` and `auth.uid()` before accessing any data.
   No new EXECUTE grants are given to the old V24 private projections.
3. The fixed one-minute per-account/action rate limiter uses an atomic
   `INSERT ... ON CONFLICT DO UPDATE ... WHERE hit_count < cap` to avoid
   races across multiple Edge workers. Unreleased/disabled reads do not
   create bucket records. Retention cleanup needs a future trusted worker.
4. Even if mistakenly deployed before launch, all runtime trading and
   snapshot bridge flags are constrained false and Market calls fail closed.
   The code does not enable equipment catalog approval, offer purchasing,
   custody, returns, claims, or any wallet transaction.
5. An explicit private response whitelist at the V25 Edge adapter prevents
   raw Forge receipts, seller account IDs, internal ledgers, or database
   errors from reaching the client.

### Verification completed this pass

- PostgreSQL 17 staging **transactionally compiled** the V26 schema and
  verified an authenticated call was rejected by the disabled launch flag.
- A second explicitly rolled-back staging transaction used **synthetic
  V24 read stubs** and temporarily relaxed the market guard CHECK
  constraints *inside that transaction only* to exercise 30/20 SQL
  throttles; both quota overruns were rejected.
- Post-test staging read-back: `market_api_internal` schema does not
  exist and original `trading_enabled=false` and
  `snapshot_bridge_ready=false` remain intact.
- Source, TS fakes and PG17 full-stack regression tests were committed.
  Full live-V24 end-to-end PG17 CI and current PR checks still require
  independent green verification. Do **not** claim a successful real
  player-facing Market gateway test.

### Remaining blockers

- The actual Edge route is **not mounted**. `MARKET_EDGE_TRANSPORT_RELEASED`
  and mobile Market feature gates remain false. Neither Edge source nor
  generated gameplay bundle was modified in V26.
- The new V26 migration has not been applied persistently to staging or
  production; V18–V24 are also not rolled out persistently.
- Confirm full disposable PG17 tests, including the V24 two-session
  purchase race, and verify the schema/read bridge against the **real**
  V24 projections. Review rate-limit test behavior under two simultaneous
  authenticated accounts.
- Add bounded, safe rate-bucket retention and independent 404 route
  tests, then reconcile this draft with the latest `main`. A later
  explicit release review is required before any Market UI, flag or
  write operation is enabled.
