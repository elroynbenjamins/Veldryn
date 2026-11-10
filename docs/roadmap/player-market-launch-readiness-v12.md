# Veldryn Player Market — V12 launch-readiness gate (2026-11-10)

**Release status: BLOCKED / PRIVATE / NO PLAYER TRADES.** Do not set `PLAYER_MARKET_RELEASED`, `MARKET_EDGE_TRANSPORT_RELEASED`, `trading_enabled`, `snapshot_bridge_ready`, `equipment_transfers_enabled`, per-item `tradable`, or any price/lot `approved` flag to true merely because this backend passes synthetic tests.

## What is real and verified

- **Zero player transactions**. Staging's Market offers, purchase receipts, deliveries, escrow and Gold settlement tables remain empty.
- Full **23-migration private backend** now compiles as a chain in disposable PostgreSQL 17. That includes custody, resource and exact Forge equipment listings, cancellation/expiry, buyer purchase, return/delivery claims, Inbox projections, manual item price bands, minimum-lot policies, 5% seller Gold tax, completed-sale analytics and verified listings browse.
- Every real-sale and ownership mutation runs inside the existing server transaction with revision fences and idempotency receipts. New resource/gear lifecycle tests run with synthetic users and *ROLLBACK*, including refused below-floor prices, min-lot rejection, double-purchase safeguards, Gold conservation, preserved exact gear receipts, cancellation, expiry and Inbox claim; they leave no records and cannot loosen a deployed market gate.
- **Staging only:** all 23 private migration layers installed and queried. Both hard-false global/equipment flags remain false, approved tradability/price/lot counts remain zero, verified actual sales return `[]`, public/client EXECUTE is denied. Production receives none of this new Market schema.
- **Historical completed-sale prices:** `private.market_completed_sale_history_v13` is a durable, immutable, server-owned per-offer ledger written by a trigger on the **committed purchase receipt** within the same transaction. It records per-unit Gold, lot size, burned 5% tax, settlement time, and equipment rarity/quality/enchant rank. It never records unsold asking prices, expired/cancelled listings, synthetic client samples, or failed purchases. An idempotent retry cannot create another sale row. The only graph projection is a private, ungranted 7/30/90-day UTC daily median/min/max/volume read model; it suppresses days with fewer than three completed transactions **or** fewer than three distinct buyers and sellers. The mobile `MarketPriceHistoryChart` is authored but unmounted, and renders a genuine empty state when zero transactions exist. Staging: **0 historic sales**, no client access and disabled Chart RPC. 
- **Browser model:** `private.market_browse_verified_offers_v12` returns only current unbound, verified, escrow-held, policy-approved, within-range offers, with bounded sorting/filtering and a restricted equipment summary. It never sends raw Forge receipts or seller account identities. The function is private, ungranted and returns `market_disabled` on staging.

## Blocking launch checklist

| Gate | Requirement | Status |
| --- | --- | --- |
| Runtime safety | Keep hard-false release guards and private grants until explicit review | **PASS / remains OFF** |
| Database migrations | Dependency-ordered staging reconciliation and PG17 integration | **PASS / STAGING** |
| Synthetic economy | Buy once, tax once, cancellation/expiry, no duplicate claims or gear IDs | **PASS / disposable CI** |
| Price history | Immutable settlement ledger, 7/30/90-day median graph, suppressed thin days | **PASS / STAGING / UI UNMOUNTED** |
| Price launch | Initial manual item approvals; zero-sale data must never reprice | **BLOCKED / no initial approvals** |
| Protected gateway | Verify Supabase Auth token; bind account from Auth, not client; server-only access to private RPC; rate limits | **BLOCKED / no mounted transport** |
| Marketplace UI | Search/filter/sort, item detail, seller offer management, listing form, confirmation, buy states | **BLOCKED / not mounted** |
| Inbox equipment | Select buyer character/equipment pouch; distinguish exact gear claim from stack claim | **BLOCKED / v4 client assumes stacks** |
| Abuse controls | Per-account value limits, velocity throttles, repeated-pair monitoring, transaction receipts and traceability | **INCOMPLETE** |
| Release switch | Separate explicit reviewed migration for launch constraints, operational kill switches, rollback drill | **BLOCKED / NOT AUTHORIZED** |
| Live rollout | Private staging QA, production backup, controlled cohort, telemetry and on-call incident procedure | **BLOCKED** |

## No-data price policy

All initial 35 resource corridors and T1–T9 equipment tier anchors remain **manually curated** and unapproved. A weekly median will not be calculated from zero sale history, fake offers, test receipts or unsold asking prices. Any later range recommendation needs 30 unique *settled* trades, 10 distinct buyers **and** sellers, a six-day data span, a correct 5% Gold ledger, and wash-trading concentration checks; it must be human-reviewed.

## Release QA cases, beyond already passing tests

1. Price race: list with an approved price, change the item policy/price band, prove the buyer cannot pay stale pricing and the seller can recover the still-held item.
2. Inventory/backpack/full bank: claim into valid storage or keep a durable pending entitlement; never deliver partial items or lose a unique Forge receipt.
3. Simultaneous players and devices: duplicate BUY/CLAIM/CANCEL idempotency, buyer/rival race, purchase-first vs cancel-first, delayed response replay.
4. Exact gear: rare/epic/mythic quality, enchant rank, stat gem, effect gem, *persisted percentage roll*, owner rebound, saved loadouts and locked/favorite restrictions.
5. Seller payout: total buyer debit = seller credit + integer Gold burned; fee only once, rounded up, shown before confirmation; no fee for cancel/expiry.
6. Cross-account security: forged account IDs, forbidden RPC grants, arbitrary price/receipt injection, stale revisions, request-key reuse, malicious pagination and JSON.
7. Multiplayer economy: launch item-level restrictions, 20 active listing ceiling, volume and money limits, event-bound resources and scarce gem restrictions.
8. Observability: server logs by stable transaction ID, pending delivery queue metrics, support-safe error codes, privacy-preserving suspicious account controls.

**Important deployment note:** staging's historic market migrations were applied through named Supabase migration calls, not a fresh CLI `db push`. Before any automated production migration job, reconcile the resulting staging migration history against the timestamped SQL files in GitHub. Do not re-run all old migrations blindly or weaken the release constraints.

## Current code entrypoints

- Source price and tax models: `backend/online/market-price-bands-v10.ts`, `market-economy-policy-v11.ts`
- Unmounted Auth/request contract: `backend/online/market-auth-boundary.ts`
- Private listing browser: `backend/supabase/migrations/20261110110000_market_verified_browse_private_v12.sql`
- Synthetic CI: `backend/supabase/tests/run_market_v12_full_stack_ci.sh`
- Current mobile Market Inbox is intentionally gated: `apps/mobile/src/screens/MarketInboxPanel.tsx`

The Market roadmap entry may remain visible for voting. **No real Market navigation/action should be exposed until every blocking gate is satisfied and release is explicitly approved.**
