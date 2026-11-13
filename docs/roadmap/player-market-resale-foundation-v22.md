# Player Market V22 — Resale chain foundation (fail-closed)

**13 November 2026 | Hidden source-only implementation | No public/production Market deployment**

V22 is the **foundation** for subsequent resale implementation. It deliberately does **not** permit previously purchased Forge gear to be re-listed or sold a second time. Doing so safely requires changes to every custody transition, not simply removing the existing V1 and V8 lifetime-unique instance indexes.

## Problem in prior code

The original custody design has **two independent global lifetime-unique indexes**:

- `private.market_custody_assets_v1(exact_instance_id)` for equipment;
- `private.market_equipment_escrows_v8(exact_instance_id)`.

These prevent re-escrowing an exact instance that was previously sold, cancelled or returned. Separately, V19's `market_equipment_provenance_v19` primary key records the **current** owner of a purchased copy. V20 direct character transfers and V21 bank withdrawals update that current owner, but neither is an immutable historical record of all buyers and sellers.

Removing the old indexes alone would permit a second escrow without a complete guarantee that earlier return entitlements, prior purchase deliveries, claim state and Gold payouts could not be replayed or collide.

## V22 changes

Migration: `backend/supabase/migrations/20261113083000_market_resale_chain_guard_private_v22.sql`.

1. **Immutable per-sale chain** — RLS-enabled, fully revoked `private.market_equipment_sale_chain_v22`, keyed by the sale's exact source hold. Contains exact instance ID, monotonically assigned sale ordinal, previous source hold link, buyer/seller account IDs, buyer character ID, exact original Forge receipt and the authoritative settled Gold intent's gross, fee and seller payout. Each history row is immutable via a BEFORE UPDATE/DELETE denial trigger, and referential uniqueness blocks reusing a prior hold as the parent of multiple resale legs.
2. **Automated first-sale recording** — A private AFTER INSERT delivery trigger named to run **after** V19's provenance-recording trigger. The initial purchase is recorded only when the Gold intent is settled, quantity is exactly one, the seller escrow exact receipt matches, and V19 current buyer provenance agrees. Any failure aborts the transaction *before* the Gold change is committed. A second sale is deliberately rejected with `market_resale_chain_settlement_not_ready` until the full transition is audited.
3. **Explicit second-reservation denial** — A BEFORE INSERT on the original V1 custody asset table rejects an equipment instance already present in the sale history (`market_resale_escrow_not_ready`). This defense is independent of V1/V8 unique indexes and prevents accidental activation if an unrelated migration relaxes those indexes prematurely.
4. **Read-only private eligibility check** — `market_resale_preflight_v22(account_id,instance_id,holder,location,index)` validates actual owned V19 provenance, last-sale buyer, current exact receipt, physical location, account protection flags, saved loadouts, and item tradability policy. It always returns `canRelistNow: false`, including when its `candidate` status is true. No price quote, Gold transfer, hold, offer, release or client RPC is granted.
5. **All gates stay shut** — No migration relaxes the Market release checks, approved catalog flags, equipment transfer check, escrow uniqueness or private SQL grants.

## Verified on staging PostgreSQL 17 — tests rolled back

- V22 creates its immutable first-sale history with exact original receipt, **125 Gold gross / 7 Gold tax / 118 Gold seller payout** in the synthetic V12 equipment lifecycle test.
- After that purchase is claimed, transferred between characters, deposited into bank and withdrawn, private resale preflight recognizes the eligible original copy **but cannot approve re-listing**.
- A new attempt to reserve the purchased instance through the old Forge V8 path fails with `market_resale_escrow_not_ready` before any storage mutation, hold creation, Gold move or new history row.
- An unrelated/foreign account cannot pass the preflight.
- Attempting to overwrite the first-sale history is rejected with `market_sale_chain_immutable`.
- Existing 5% equipment tax, V20 transfers, V21 bank custody, Inbox and return lifecycle tests continue to pass.
- Independent V22 ACL/empty-schema/disabled-gate tests and the full resource/tax suite also passed with all migrations applied **only inside a transaction that was rolled back**.
- Disposable PostgreSQL full-stack runner updated to **29 private Market migrations**, including V22 security and negative resale checks. GitHub CI results are not claimed as green until observed.
- Connected staging still has the earlier V12 equipment browsing function drift (socket-gem listing predicate). The equipment lifecycle temporarily loaded the current GitHub V12 browse function in the same rollback transaction. This is not a persistent schema repair.

## Next pass: full second-sale lifecycle

Before lifting any explicit resale denial, implement and test **all** of the following as one coordinated release of private migrations:

- Versioned custody with at most one *active* escrow per instance across accounts and sale generations, replacing each old lifetime unique index with equivalent active-custody and unique-chain guarantees. Verify a rejected concurrent second reserve cannot create two claims.
- A private **resale reserve** step that validates source recipient, unbanked exact Forge copy, current item enhancements/sockets, last-sale buyer, account level/class and no protected loadouts, then atomically removes the physical stack/receipt while transitioning V19 provenance to a resell-held state.
- Explicit relist/cancel/expiry/return delivery transitions with current owner and last-sale generation validation. A pending return must never coexist with a second active offer or successful sale, and an old claim cannot duplicate a returned copy.
- A second sale that atomically retires/replaces V19 *current* buyer provenance and appends a new sale ordinal referencing the previous source hold. Buyer progression must be validated from the fresh V18 exact item requirement and rarity at the new settlement. All 5% Gold fees and receipts must remain idempotent and single-use.
- Pending buyer claim must verify that a matching new generation is current, then rebind the original preserved rarity/rolls and update the current owner without changing the original historical chain.
- Stress-test simultaneous purchase/cancellation/claim and two independent buyers, plus account deletion/character changes and replayed stale requests.

No public Edge/API transport or mobile resale buttons should be exposed before the full settlement/return chain and auth checks pass. **Do not describe V22 as live resale:** it records first sales and establishes fail-closed resale readiness, not actual repeat trades.
