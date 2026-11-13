# Player Market V18 — SQL acquisition guard before Gold settlement

**Status: draft source only; NOT DEPLOYED. The global trading and equipment-transfer release gates remain CHECK-constrained FALSE.**

## Purpose

V17 defined market-only character requirements in an isolated read-only TypeScript model. V18 puts a second, independently verified enforcement boundary in the **private PostgreSQL transaction**, common to both stack-resource/gem and exact Forge equipment purchases.

### Transaction boundary

The existing purchase functions enter the same Gold ledger through a settled insertion into `private.market_gold_intents_v2`. V18 registers a **BEFORE INSERT OR UPDATE** trigger on that ledger. Both purchase functions currently reach this insertion after their locked offer/custody/revision checks but **before** buyer debit, seller payout, fee burn, purchase receipts, deliveries, or offer closure. Any exception aborts the transaction and leaves the item listed and Gold untouched.

The trigger verifies:

- Buyer account and active account-owned character against locked server `online_game_states` and the relational character ownership record; no client-supplied recipient, character level, class, item tier, rarity or Gold authority.
- Combat level derived from exact numeric character XP using the same level-1-to-100 curve as the current mobile progression source. Persisted displayed `character.level` does **not** grant acquisition rights.
- Active offer, held verified escrow, current item tradability and **separate approved** per-item acquisition policy; unknown/unreviewed items fail closed.
- Equipment tier T1/T2/T3/T4 at Market-only floors **6/18/30/52**, plus exact per-item rebased requirement and original persisted Forge rarity premium (0/0/2/4/6/8). Equipment class must agree with active buyer class. T5–T9 market purchase is always blocked in V18.
- Non-equipment resources and gems use a reviewed **source SKU level** rather than their highest downstream crafting use. No item map is auto-seeded or approved. No item can trade on the strength of a default policy.

The new private policy table has a **CHECK(approved=false)** constraint requiring a separate, explicitly reviewed future migration to allow any item approval. There are **zero approved Market acquisition policies**. No service-role or client grants are created.

### Code and tests

- SQL: `backend/supabase/migrations/20261113043000_market_purchase_acquisition_guard_private_v18.sql`
- Private XP/ACL/parity test: `backend/supabase/tests/player_market_acquisition_v18.sql`
- Both V12 lifecycle tests updated to temporarily install synthetic approval and XP attributes inside `BEGIN ... ROLLBACK` only. They additionally verify below-level purchases raise `market_level_required` without debiting Gold, creating purchase receipts, or closing listings.
- The disposable PG17 full-stack script applies V18 after the existing 24 dependencies and runs XP and both lifecycle suites; its post-rollback check asserts no live policies, offers, Gold intents or receipts.
- V17 TypeScript eligibility tests remain in `pnpm --dir backend test:market-readiness` and should be kept in parity with the SQL guard after catalog changes.

## Verification completed on 13 Nov 2026

In the **Veldryn Staging** PostgreSQL 17 database, V18 and its tests were run inside an explicit outer transaction ending in **ROLLBACK**. The XP threshold and ACL/approval checks passed. Resource purchase lifecycle passed, including 5% tax, cancellation, minimum lots, 20-offer ceiling, retry and under-level rollback. Equipment purchase lifecycle also passed with the current repository's V12 browser definition temporarily loaded inside that same rolled-back transaction; the exact Mythic purchase used an XP-based low-level rejection before a successful higher-level buy. No permanent migration was applied.

Post-test staging read-back confirmed:

- V18 policy table **not installed** (rolled back).
- Market Gold intents, sale offers, purchase receipts and historical sales: **0**.
- Global `trading_enabled`: **FALSE**.

**Known staging drift:** staging's earlier `market_browse_verified_offers_v12` definition lacks the socket-gem tradability check present in the GitHub migration. Therefore an equipment lifecycle test using staging's unmodified browser failed its socket revocation visibility assertion. When the current GitHub browser definition was loaded for the rollback-only test, the equipment lifecycle passed. Reconcile the staging migration/function history and rerun the full suite before any deployment. Do **not** conclude staging is release-ready.

GitHub Actions full-stack CI has been queued; do not treat it as green until the run reports success.

## Still required before a trading launch

1. Approved canonical server SKU catalog, including exact Forge item requirements, source tiers and versioning; no guessing from asking prices or client data.
2. Authenticate the buyer through a protected Edge transport; rate limits, account Gold turnover caps and fraud monitoring.
3. **Market-provenance-safe claim and transfer enforcement:** pending purchased gear must not be claimable into a lower-level alt, moved through a shared bank, or equipped without satisfying the same requirement. Ensure self-crafted legacy gear remains unaffected. V18 only guards initial **purchase**.
4. Server-owned locked eligibility preview for the future Market UI, with explicit `Requires Lv N`, incompatible class and unapproved/unreleased states.
5. Dedicated multiple-session SQL concurrency tests for policy edits vs purchase, buyer/seller/revision races, exact receipts, and refund/cancel collisions.
6. Explicit deployment plan with staged migration reconciliation, updated sale telemetry, admin kill switch and production rollback procedure.

**Nothing in V18 makes a live market available to players.**
