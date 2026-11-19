# Player Market V17 — account-wide trading, bulk resource fills and seven-day expiry

**Status: HIDDEN BACKEND / RELEASE BLOCKED.** Implemented on a development branch; **V17 and V17b installed in staging only**, with transaction-scoped, **ROLLBACK-only** synthetic regressions passing. Neither migration is deployed to production. Not enabled for players, and not an authorization to change any runtime or item-policy gates.

## Agreed behavior

### One trading identity per account
- The existing V5 **20 active listings per `seller_account_id`** remain shared by all three character slots. Characters do not get separate listing caps or self-trading routes.
- Buyers and sellers are identified by authenticated account UUIDs. The active character only supplies the wallet and selected inventory destination; existing server snapshots, character ownership and wallet projections must agree.
- Equipment/inventory shared Bank movement between characters is an internal, account-owned storage action, not a market sale. Market fees, purchase receipts and sale history must never be generated for a same-account character transfer.
- The new V17 purchase path rejects matching buyer and seller accounts before any Gold or custody changes.

### Bulk resource listings and partial purchases
- Sellers can escrow an approved stack (e.g. 1,000 resources) once. A buyer may buy a server-approved partial quantity (e.g. 100), leaving the original offer open for the remaining 900.
- V17 uses a private `market_purchase_resource_quantity_v17` RPC. It **does not** permit partial equipment or gem trades. Only an already verified, unbound resource escrow can be split.
- A partial fill derives a child asset+hold+offer from the original while holding the seller+buyer advisory account locks and escrow row locks. The derived child is immediately sold in the same transaction using the audited V11 purchase path. If settlement fails, the split rolls back.
- The initial source offer remains in place and its quantity decreases. No new stock appears in authoritative inventory; split lineage tracks the exact source offer, asset and hold.
- Each successful fill gets its own idempotency receipt, 5% seller tax, capacity-safe buyer Inbox delivery and genuine completed-sale history entry. Replaying the same request key returns the same result; a conflicting reuse fails.
- Price band, quantity caps, listing minimum lot, Gold affordability, stale state and remaining lot are all rechecked server-side. A split that strands a remainder below the approved lot minimum is refused. Multiple buyers can race; the loser must refresh.
- Display-only client quantity controls should offer common values such as **100**, **1,000** and **All**, subject to the current server-approved minimum lot and available quantity. The UI may estimate totals but never settle Gold.

### Seven-day expiry and safe returns
- Existing V2 hold `expires_at` has a **seven-day** default. V5 publishes only unexpired holds; browse hides expired offers.
- The new private `market_queue_due_returns_v17` dispatches both resource/gem lots and exact Forge equipment to their separate safe cancellation/return paths. The older `market_queue_due_returns_v2` remains for compatibility. Both create durable, unique return entitlements. A later `market_claim_return_delivery_v3` claim checks inventory/bank capacity, supports inactive-character storage ownership, and leaves the entitlement pending if the target is full.
- After partial fills, only the unsold remainder of the original held stack is returned on cancellation or expiry. Sold child holds cannot expire back to the seller. Expiry is idempotent; returned items are not silently discarded.
- **Operational dependency:** the V17 expiry dispatcher is deliberately **not scheduled on production** while the market release gate is locked off. At actual launch the trusted server must run expiry batches periodically, monitor pending claims and alert on worker failures. The UI must not imply expired inventory was credited before the owner claims it.

## Verified synthetic scenarios
- A seller account with two characters creates one account-owned bulk listing. Self-buying with the same account fails.
- Purchase 100 / 300 / 100 from a 500-resource listing; initial offer shows 400 then 100 then closes, with three genuine completed-sale rows.
- An idempotent repeated 100-unit request returns the original receipt; a conflicting 101-unit reuse is rejected.
- After a 100/200 purchase, cancellation returns **only 100 unsold units**.
- A separate expired resource offer generates exactly one pending return; retrying the expiry worker generates none.
- An expired exact equipment offer closes once, leaves its full Forge receipt unchanged in a pending return delivery, and does not move Gold or generate a fake sale.
- Across the fixture, **800 units** are conserved: 600 purchased and 200 queued for return. Gold remains exact: 6,000 debited, 5,700 credited to seller, 300 burned in 5% tax.
- No synthetic accounts, item policies, offers, sales or releases survive the SQL test transaction.

## Remaining launch blockers
- Bind the future authenticated Edge gateway's `buy` operation to V17 partial fills (account ID must come from verified Auth, never request JSON).
- Implement and mount the market search/list/sell/buy UI and quantity selection; complete Android small-screen/accessibility QA.
- **Staging migration and rollback test: PASS.** Still run the complete disposable PG17 suite in CI and reconcile Supabase's generated migration-history versions against GitHub filenames before any eventual automated deployment.
- Add trusted V17 expiry worker scheduling, monitoring, replay/race tests and production recovery runbook as part of the explicit market launch plan.
- Complete manual tradability/price approvals, anti-abuse controls, cohort rollout and all other V12 launch-readiness gates.
- **Never** flip `PLAYER_MARKET_RELEASED`, `MARKET_EDGE_TRANSPORT_RELEASED`, `trading_enabled`, `snapshot_bridge_ready` or item `tradable` simply because V17 tests pass.
