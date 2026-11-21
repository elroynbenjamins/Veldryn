# Player Market V25 — authenticated read gateway (development-only)

**15 November 2026 | Hidden draft branch | No Market activation or deployment**

## Implemented in this pass

V24 already has private unified browse and account-scoped Market Inbox projections.
V25 now prepares a strict, testable server transport **without exposing a route**:

- `backend/online/market-auth-boundary.ts` accepts a read-only `browse`
  action with exact whitelists for item kind, item ID, search, sorting,
  total-Gold bounds, page size (1–50) and offset (0–1000). Invalid/duplicate
  parameters and caller-supplied account IDs fail before any Market read.
  Existing write/claim schemas remain unchanged and unmounted.
- `backend/online/market-read-gateway-v25.ts` derives the actor solely
  through the existing verified Supabase Auth token boundary. Browsing does
  not accept an actor ID; Inbox calls always receive the authenticated actor.
  Only `browse` and `inbox` operations can reach read adapters.
- The read adapter requires a rate-limit decision from its service, returns
  uncached, authorization-varying responses, maps V24 output into explicit
  public fields, removes seller IDs/private custody receipts even if a
  downstream projection unexpectedly adds them, and never returns raw
  database exceptions.
- `backend/online/tests/market-read-gateway-v25.ts` checks session identity,
  seller/actor spoofing rejection, field projection, pagination/filter limits,
  request duplication, unsupported write rejection, rate limits and generic
  sanitized failures. The existing auth-boundary test is now part of
  `npm run test:market-readiness`.

**Important:** this is an internal authenticated transport contract, **not**
a completed server-to-Postgres integration. It has no real SQL read adapter
yet, no deployed durable rate limiter, no live API route and no player UI.
The executable integration is exercised with test fakes until the next
verified backend bridge exists. No live Market transactions are possible.

## Security controls preserved

1. `MARKET_EDGE_TRANSPORT_RELEASED=false` and the hidden handler returns
   404 before authentication or Market RPC. Neither `edge.ts` nor the
   generated Supabase gameplay function imports/mounts V25.
2. V24's `private.market_browse_combined_v24` and
   `private.market_inbox_unified_v24` stay inaccessible through REST:
   their EXECUTE privileges remain revoked, including from service_role.
3. The DB hard-false trading/snapshot readiness gates stay untouched.
   Equipment acquisition approval also remains absent. No migrations,
   migrations-history rewrites, Gold writes, purchases, claims or escrow
   grants have been added.
4. Nothing is merged or deployed to staging/production by this pass.

## Next actions within secure integration

- Build and audit a **narrow trusted SQL/Edge bridge** which can invoke the
  two V24 private read projections without arbitrary SQL/RPC names, and
  derives the account from verified session context. Do not grant direct
  client/service_role EXECUTE on existing private settlement functions.
- Add a *durable, account-scoped* rate limiter and cover multi-worker retries,
  expiration, revoked sessions, large result sets and projection drift.
- Only after the bridge passes isolated CI and staging review, connect the
  mobile Market browse and account-scoped Inbox behind the existing hidden
  flags. Do not enable mutations until V23 lifecycle, economy and concurrency
  gates are independently approved.
- Rebase/reconcile draft PR #1055 against latest main, run the full PG17
  V24 race suite and mobile/Edge parity checks, then review before merge.

## Verification

Source and tests have been committed to draft PR #1055. A **fresh, passing**
GitHub workflow and a real V24 staging integration have **not been
verified by this pass**; code review and SQL access grants remain blockers.
