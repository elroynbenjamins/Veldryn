# Player Market V19 — Purchased Forge provenance and claim/transfer fences

**2026-11-13 | Private source only | Draft PR #1055 | Market RELEASED = FALSE**

V18 rejects ineligible *purchases* at Gold settlement. V19 closes the next loophole: after buying a genuine Forge copy on a qualifying character, the buyer must not be able to claim it to an under-level character, move it through the shared bank, spoof a different rarity, or change its owner using an ordinary online-game save.

## Private implementation

- New private `market_equipment_provenance_v19` ledger records **exact_instance_id**, settled source hold, buyer account, purchasing character, rolled rarity, immutable original Forge receipt, reviewed class and calculated market character-level requirement. An AFTER INSERT on the exact-gear delivery creates the provenance entry atomically with purchase; no client-supplied tier/rarity/requirement is used.
- A BEFORE UPDATE on the purchased-equipment delivery validates that the delivery remains pending until a character with enough **XP-derived combat level**, the right class and matching server-owned relational character record receives the exact instance. It verifies the final saved receipt and physical equipment after the V9 claim function's state update but before marking the delivery claimed. Any failure **rolls the entire claim back**, with durable pending entitlement retained.
- Claim to the **shared Bank is deliberately refused** for purchased gear. An eligible inactive character can still receive equipment directly in their own inventory/equipment pouch.
- A separate BEFORE UPDATE OF state on online_game_states compares only accounts with claimed Market provenance and ensures the original immutable Forge identity still exists exactly once and remains physically held by the exact validated recipient. **Normal same-character inventory/pouch/equip moves and XP updates are permitted.** Bank transfers, changes of character ownership, duplicate copies, forged rarity, and disappearing market-purchased receipts are blocked pending a separately reviewed transfer/disposal mechanism. Self-crafted gear that was not purchased through Market is unaffected.
- Hard-false Market runtime guards, hard-false acquisition-policy approvals, all private/RLS/EXECUTE revocations and settlement fees remain unchanged. No claims or real transactions are publicly callable.

**Design trade-off:** a claimed market-purchased copy remains pinned to its receiving character until a later audited character-transfer and disposal/relist flow exists. This is stricter than the final desired market rules (which may allow transfers to another *eligible* character). Keep it restrictive while the market is not released; do not silently enable bank transfers or resales. A future transfer flow must validate the destination before removing an existing physical copy and must maintain provenance across resale atomically.

## Covered rollback-only staging QA

- Existing V12 exact equipment lifecycle still passes: 5% seller tax, cancellation, full storage, exact enhancement/socket rolls, Inbox and idempotency.
- New V19 cases: acquisition provenance is created pending at purchase; T1 Mythic requires level 14; level-1 alt claim rejected without consuming delivery; forged alternate class rejected; shared-bank claim rejected; eligible alternate directly claims; unique copy is pinned to that recipient; subsequent shared-bank and cross-character snapshot moves rejected; rarity tampering rejected; legitimate same-owner inventory/pouch moves and normal account XP updates succeed.
- V12 resource lifecycle still passes with V18/V19 migration installed transiently, including Gold conservation, 20-offer limit, 5% seller fee, cancellation and lot size checks.
- SQL security test verifies no seeded provenance, no public grants, no released flags, and all three private triggers.
- All staging test migrations and synthetic data ran inside `BEGIN ... ROLLBACK`; read-back confirms **V18/V19 tables absent, zero sale offers / Gold intents / receipts / history, trading_enabled=FALSE**.

**Staging drift remains:** existing staging V12 browse function predates the GitHub socket-gem policy check. The equipment test is green only with the current GitHub version of that private browse function temporarily installed in the same rollback transaction. Reconcile that migration before any permanent staging/prod change. GitHub full CI results are separate and must be inspected before merging.

## Files and next gates

- SQL: `backend/supabase/migrations/20261113050000_market_equipment_provenance_private_v19.sql`
- SQL regression: `backend/supabase/tests/player_market_provenance_v19.sql`
- Updated lifecycle: `backend/supabase/tests/player_market_v12_equipment_tax_lifecycle.sql`
- Disposable CI: `backend/supabase/tests/run_market_v12_full_stack_ci.sh`
- Gated UX: `apps/mobile/src/screens/MarketInboxPanel.tsx` and `apps/mobile/src/online/market-inbox.ts`

**Next release blockers:** reconcile staging browser/migration history, add a fully audited market copy transfer/relisting/disposal path, bind the customer-facing claim and purchase UI to server-owned recipient eligibility, add Auth-bound Edge transport and rate limits, manually review/approve SKU policies, perform a production backup and staged rollout review. Do not enable Market until those gates pass.
