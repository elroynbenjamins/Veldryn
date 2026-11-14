# Player Market V24 — Unified browse, Inbox and safe resale expiry

**13 November 2026 | Hidden, draft PR #1055 | No live flags, UI or production deployment**

## Scope and implementation

V24 completes a **private server-side** projection for both original and resale listings and integrates V23 return/claim/payout events with Market Inbox. The underlying V23 ledger and its 5% resale tax, original V9 escrow and V18 rarity-adjusted class/level gates remain untouched.

- `backend/supabase/migrations/20261113110000_market_unified_browse_private_v24.sql`: `private.market_browse_combined_v24` accepts existing browse filters (kind, item ID, search, sort, min/max total Gold, limit and offset) and produces a **single stable, paged** list of original V12 V9 offers and verified active V23 resales. Both remain explicitly distinguished via `sourceKind` (`original` vs `resale`); a resale also has `resaleId`. Only public trade fields are projected: item kind/ID, price, quantity, expiry, rarity, quality, enhancement and socket roll summary. **No seller account ID, source hold, raw receipt, owner character, serial metadata or hidden inventory record** is returned. Filters require live escrow ownership/custody consistency, original first-sale lineage, item policy, required V18 equipment approval, V10 price corridors, V11 minimum lots, valid Forge roll percentages and still-tradable socket gems. Expired/cancelled/sold entries are not visible.
- `backend/supabase/migrations/20261113111000_market_unified_inbox_private_v24.sql`: `private.market_inbox_unified_v24` retains the V9 account-scoped resource/gear return, purchase and seller payout entries and adds V23 resale listing (`listed`), seller return (`ready`/`claimed`), buyer claim entitlement (`ready`/`claimed`) and settled seller payout (`credited`). The paging, history and pending-count semantics remain consistent. This is **not** the ordinary quest/rewards Inbox, and no Gold is credited by reading the projection.
- `backend/supabase/migrations/20261113112000_market_resale_expiry_private_v24.sql`: `private.market_due_resales_v24` returns bounded due-offer IDs for a future trusted worker. `private.market_expire_resale_v24` locks the seller account and exact offer, verifies it is actually expired and active, then calls the existing V23 atomic cancel operation. It creates one return entitlement (not an immediate bank/inventory credit), charges no Gold and is idempotent. This is a private per-offer function, **not a scheduler**; a future worker must run it once per transaction to avoid cross-account lock-order issues.
- `backend/supabase/migrations/20261113112500_market_v12_browser_reconciliation_private_v24.sql`: idempotently replaces the older staging V12 browse function with the reviewed canonical repository definition, restoring socket-gem policy checks and Forge roll-percent guard clauses without altering Market flags or granting client access.

All V24 SQL functions are `SECURITY INVOKER`, live in `private`, and have **no EXECUTE grant to public, anon, authenticated or service_role**. A separately authenticated and rate-limited backend gateway would be needed to call any of these for actual users. V24 creates no client button and does not approve prices or equipment catalogs.

## Staging discrepancy confirmed and reconciled in dry-run

A read-only check of connected staging's installed V12 function showed `has_socket_tradability_predicate=false`, `has_roll_validation=false`, while the V10 price-corridor validation was present. The migration above restores both missing guards when eventually deployed. The V24 full equipment test now runs successfully when loading that **reconciliation migration alone**, without separately injecting the old GitHub V12 source. Every test still ends in `ROLLBACK`, so the installed staging function remains unchanged for now.

## Test results

Full tests ran against staging PostgreSQL 17 with synthetic users, records, policy overrides and all new V18–V24 migrations **inside a single ROLLBACK transaction**, never persisted. Verified:

- Original Forge listing appears in combined browse with expected rarity/quality/socket metadata.
- A subsequent owned resale appears as exactly one `resale` entry with no raw receipt or seller ID; resource-only filter, total-Gold filter, search and class/item policy controls exclude it as applicable.
- A synthetic private resource escrow plus an actual owned resale in the same listing set produce correct stable price ordering, total count and two pages. The synthetic resource fixture is removed before any settlement.
- Invalid/revoked socket policy hides the resale immediately; restoring policy restores the listing.
- Active listing visible only in the seller's account Inbox, never a foreign account's Inbox; cancelled item creates one pending seller return; successful return moves to history.
- Resale purchase produces exactly one buyer claim entitlement with negative Gold change and a matching positive, 5%-taxed seller payout. Sold entries disappear from browse.
- A non-expired listing cannot be prematurely expired. A genuinely expired listing disappears from browse, appears in the bounded due queue, cannot be purchased, and transitions to one idempotent pending seller return. A claim restores exactly one item with unchanged original rarity and prior sale history; Gold is unchanged.
- Earlier V12 resource tax and full V19/V20/V21/V22/V23 equipment lifecycle tests remain passing.
- New V24 standalone ACL/disabled-gate regression verifies the function definitions, private permissions, empty records and canonical V12 socket/roll predicates.

The disposable `run_market_v12_full_stack_ci.sh` runner includes **35 ordered private migrations**, V24 security tests, all prior lifecycle tests and post-rollback hard-false gate checks.

### Concurrent buyer stress test

`backend/supabase/tests/player_market_resale_buy_race_v24_ci.sh` is a CI-only, localhost/disposable-DB guarded script scheduled **after** the normal tests. It constructs a realistic synthetic resale fixture, then queues two separate PostgreSQL buyer sessions behind the seller's advisory lock. It expects exactly one settlement, one Gold intent, one resale-chain record, one pending delivery, and correct 125 gross / 7 tax / 118 seller payout. Its committed fixture is only permitted in the CI database `veldryn_market_ci` on `localhost` and disappears when the disposable job database is destroyed.

**This CI race test has been authored but has not been observed passing in GitHub Actions yet.** The staging tests above are single-session transaction-scoped tests, not proof of cross-session race safety.

## Outstanding release gates

The Market stays **hidden and hard-disabled**; no schema, data or policies were permanently changed on staging or production. Outstanding:

1. Confirm clean GitHub PG17 CI including the two-session race script, and add cancel-versus-purchase and expiry-versus-cancel race coverage.
2. Connect a scheduler/worker for due returns and expose only authenticated server-side endpoints with account-derived identity and rate limits.
3. Integrate the V24 combined browse/Inbox into the mobile screens once the broader player-market readiness audit approves launch.
4. Review and resolve PR conflicts with current `main`, verify mobile performance, accessibility, price fairness, catalog policy approval, and transaction reconciliation before merge or deployment.
5. Apply the canonical V12 reconciliation in a controlled future release; current staging discrepancy remains installed until then.

No production-side changes or external user-facing features are included.
