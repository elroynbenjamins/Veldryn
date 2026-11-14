# Player Market V23 — repeat-sale lifecycle for exact Forge gear

**13 November 2026 | Private server-side implementation; draft PR #1055 | Market still hidden and hard-disabled.**

## What changed

V23 implements the **second and subsequent sale** of already-purchased, individually verified Forge equipment without weakening the original V1/V8 globally unique first-escrow constraints. The original V9 first-sale path and V18 pre-Gold acquisition trigger remain unchanged.

The new protocol introduces a **separate, versioned resale escrow**. The original V22 first-sale history row remains immutable and is the root of a chain of V23 successful resales. The current V19 provenance record continues to point at the original first source hold, but its current account and recipient are revalidated and updated at each successful resale. Cancellation/return do not append fake sale history.

## State machine

- **Character-held → Active resale:** `market_reserve_equipment_resale_v23` validates the seller's same-account exact Forge copy, V19 original receipt, unique physical instance, protected loadouts/locks, item/socket policy, price corridor and shared 20-active-listing limit. It snapshots the exact source stack/receipt in private escrow, removes them from the game state, marks V19 storage `resale`, increments revision and returns an idempotent offer ID.
- **Active resale → Return pending:** `market_cancel_equipment_resale_v23` changes the private offer status without returning an item prematurely. An expired active listing cannot be purchased and can still be cancelled by its seller. Seller and buyer locks serialize cancellation against settlement.
- **Return pending → Returned:** `market_claim_resale_return_v23` validates a real same-account receiving character with the original item/class/rarity level requirements, ensures destination capacity and zero duplicate physical copies, restores exactly one full Forge receipt and stack, switches V19 storage back to character-held and increments the game revision. If capacity is full, the pending return is preserved. No Gold or tax is charged.
- **Active resale → Sold / buyer pending:** `market_purchase_equipment_resale_v23` locks both accounts in UUID order and uses private original historical lineage plus active escrow. It checks current SKU and socket policies, V10 verified prices, V18 class/T1–T4 rarity-adjusted progression and all **three** buyer/seller Gold surfaces (game snapshot, wallet and characters). It charges gross to the buyer, credits **95% minus rounding** (5% ceiling-tax calculation) to the seller, appends one immutable V23 Gold intent and resale history row, and creates one pending private delivery. It transfers V19 current provenance to the buyer in `pending` status. All actions are one database transaction.
- **Buyer pending → Claimed:** `market_claim_equipment_resale_v23` verifies current recipient class/level again and checks for collisions, source escrow, exact receipt lineage, destination capacity and idempotency. It appends the original item with every quality, rarity, enhancement and socket trait preserved, changes only the Forge receipt's character owner and sets V19 to claimed; cannot claim into a shared bank or a foreign character.

When a purchased item is in `resale` custody, the private V19 game-snapshot trigger requires the original owner to have **zero physical copies and receipts**, plus exactly one active or return-pending escrow. Ordinary game saves cannot manufacture it while escrowed. The existing V19 character-held and V21 bank-held integrity checks are preserved.

## Private schema and APIs

Files:

- `backend/supabase/migrations/20261113100000_market_resale_custody_private_v23.sql` — RLS-enabled resale offers; immutable append-only V23 sale chain and Gold-intent ledger; private pending/claimed deliveries; idempotency receipts; stricter game-state integrity trigger; reserve, cancel and return functions.
- `backend/supabase/migrations/20261113103000_market_resale_settlement_private_v23.sql` — private atomic resale settlement and buyer claim functions.
- `backend/supabase/tests/player_market_resale_lifecycle_v23.sql` — hard-off flags, schema and private/no-grant assertions, original lifetime unique-escrow indexes still intact.
- `backend/supabase/tests/player_market_v12_equipment_tax_lifecycle.sql` — synthetic end-to-end second and third sale regression.
- `backend/supabase/tests/run_market_v12_full_stack_ci.sh` — disposable PG17 runner with **31 ordered Market migrations**, V23 ACL test and post-test no-residual-transactions assertions.

All new lifecycle functions remain `SECURITY INVOKER` and are **revoked from public, anon, authenticated and service_role**. Do not call them directly from a mobile client. A future gateway must independently authenticate the actor and derive account identity server-side; request hashes cannot substitute for authentication. The V19 snapshot trigger remains a private `SECURITY DEFINER` validation routine with pinned empty search path and no callable external privileges.

## Validation conducted

On the connected Veldryn staging PostgreSQL 17 project, each validation ran entirely in one SQL **BEGIN ... ROLLBACK** transaction. No synthetic transaction, policy change, table or Gold was persisted.

- The full synthetic lifecycle passed **original first sale → character transfers → bank vault → return → successful second sale → recipient claim → successful third sale → recipient claim**.
- Tests verify the first V22 sale history row remains untouched, V23 subsequent ordinals are 2 and 3, and the third resale references the exact previous successful sale (no fork).
- Second and third sales at 125 Gold each charge **7 Gold fee**, pay **118 Gold** and preserve original exact receipt traits; wallet, relational character and game-state Gold remain in sync.
- Cancellation creates a pending return but no Gold, irreversible history or phantom purchase. Full destination storage cannot consume the return; retries cannot duplicate it.
- Under-level or wrong-class recipient, revoked socket gem, seller attempting self-purchase, stale offer price, a duplicate exact instance already owned by buyer, a cancelled listing and a replayed purchase/claim all fail safely.
- The single 20-open-offer cap applies across ordinary and resale Market offers, stopping a separate resale ledger from evading the economy limit.
- Prior V12 resource lifecycle (minimum lots, 5% tax, cancellation, 20-offer cap, idempotency) also passed with V23 applied transiently.

Important validation caveats: staging's preexisting V12 equipment-browse function still differs from the GitHub version on socket-gem tradability. The end-to-end test loaded the repository version in the **same rollback transaction**. Disposable GitHub Actions clean-PG17 workflows must be checked independently; a successful staging SQL test is not a claim those workflows passed. Concurrent two-session V23 purchase/cancel/claim race tests are still recommended before release.

## Not yet shipped

**No active Market:** global launch and equipment guards remain false by schema CHECK; approved acquisition policies remain empty; no migrations were permanently deployed to staging or production; no mobile resale button or API route exists.

**Next release-readiness passes:** private resale browse/inbox projections and expiry worker; authenticated rate-limited Edge handlers; combined purchase and resale economy history; duplicate/race stress tests; reconciliation of staging browse drift and branch conflicts with the current `main` branch. Prioritize correctness and cross-account security over launching early.
