# Equipment 2.0 V6/V7 — hidden source and atomic crafting review

**22 November 2026. Stacked draft on V5. No main merge, SQL, production, mobile, UI or release.**

## 23 November 2026 — owner-approved refining input increase (review only)

The next **Equipment/Crafting 2.0** batch formulas require **2 more raw ore to make one new bar** and **1 more raw log/wood per processed wood unit**. T1/T2 Copper and Iron Bars use **5 ore → 1 bar** (previously 3); Greenwood and Ironwood use **4 logs → 1 plank** (previously 3); T3 treated Dunewood uses **5 Dunewood → 1** (previously 4); T4 reinforced Dunewood uses **6 Dunewood + 1 Glassbound Dust → 1** (previously 5 wood). Smithing/Woodcutting XP, time, other binders/drops and equipment quantities remain unchanged.

**Canonical exception:** existing T3 `SMELT_SUNSTONE_INGOT` remains **6 Sunstone Ore + 4 Dunewood → 3 ingots** in the actual 1.x recipe and the review's canonical reference. Its *2.0 target* is **8 ore per 3-ingot batch**, recorded solely as non-authoritative review metadata until a versioned, single-authority 2.0 recipe replacement is approved and implemented. Do **not** create a duplicate `SUNSTONE_INGOT` smelting route or silently change today's batches. T4 Glassbound Alloy uses **2 Sunstone Ingots + 1 Glassbound Dust → 1 alloy bar**; no raw-ore ingredient is directly added there, although the planned Sunstone upstream increase will raise its indirect ore demand.

These adjustments change **hidden 2.0 review data only**, not live UI, backend processing permissions, inventory, Gold, XP, grants, drops, markets, or deployment flags. The earlier economy-v1 draft should not override these later reviewed input quantities.

## V6 — proposed material origins and processing

- 14 pre-existing raw material proposals and 15 EXACT draft processing outputs are reconciled with the V3 746-route authoring catalogue.
- New processing drafts specify input quantity, activity, relevant skill XP and duration. All are unregistered, nonissuable and release-disabled.
- Canonical SUNSTONE_INGOT keeps its one existing SMELT_SUNSTONE_INGOT process. No duplicate smelt entitlement.
- An asserted receipt, monster ID or gathering node ID NEVER establishes source authority. The server-only diagnostic rejects every origin grant, including syntactically plausible ones.
- EQ2_SUNSCAR_HIDE requires real hide-bearing fauna, not fabricated scorpion hides. EQ2_GLASSBOUND_DUST must have a profession-accessible gathering/trading source in addition to optional monster drops. T1 Boar access and T3 early-tier bridge still require source decisions.

## V7 — noncommittable atomic crafting handoff

- Composes the V4 authenticated-account *shape* reservation preview with whole-account, cross-character source-lot coverage checks.
- Audits original receipt IDs, total issued amounts, item identity, owner character or shared Bank, unique lot IDs and Bank deposit references.
- Rejects gear copies disguised as stackable EQ2 materials, duplicate/overclaimed original receipts, mismatched quantities, other-character custody swaps, missing Bank proofs, and malformed source snapshots.
- Retains independent Smithing/Tailoring craft access, separate combat wear gate, inventory-first then Bank ingredients, original/alternate recipe parity, Gold ownership, request/revision checks and replay nonpayment.
- Applies proposed Forge restrictions: 3–7 earned active slots, 5 waiting, 20 ready and a maximum of 25 copies of the same output item.
- Returns candidate plan ONLY. Every permission to commit, debit, mint, grant XP, change Bank or queue is false. Claimed source receipt strings are never treated as authenticated server evidence.

## Tests and integration

- V6/V7 regression script checks 15 processing routes against V3, 14 raw proposals, 29 material IDs, all 746 nonissuable crafting paths and negative cases for source/lot/receipt/queue/Bank/account/character/Gold/replays.
- Dedicated hidden Equipment + Combat CI compiles both modules in strict TypeScript, runs regressions and denies their use in public online/mobile/Edge entrypoints.
- No drop rates, recipes, skill XP, Gold, items, live accounts, Market or interface layouts have changed.

## Actual release blockers

1. Authoritative monster/node processing registrations and committed mint/source receipts for all 29 materials, including scarce combat drops and independent profession-only supply. Confirm final balance and tier levels.
2. Service-authenticated locked account, character, Inventory, Bank, queue, item-copy and ledger reads. An arbitrary preview object is never trusted.
3. A SERIALIZABLE PostgreSQL account transaction integrating source grants, processing, start/claim, materials and Gold, exactly-once XP and physical instance delivery. Bank and Player Market custody must remain source-backed, with idempotent rollback.
4. Two-connection PostgreSQL contention and lost-ack replay; 746-route conservation; nine-class/18-spec counterplay balance; generated Edge, Android and visual/theme approvals.

**HOLD.** This builds verifiable design and negative security contracts, NOT the actual production transaction or material registration.
