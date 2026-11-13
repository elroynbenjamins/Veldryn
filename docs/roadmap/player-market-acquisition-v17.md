# Player Market V17 — hidden XP-derived acquisition preview (2026-11-13)

**Status: internal TypeScript model + regression tests only; not a transactional trade guard. MARKET IS STILL DISABLED.**

This pass continues V16 without exposing the Player Market. Its purpose is to make the owner's level and rarity decisions executable, detect accidental tier drift and alt-character bypasses, and specify what the next private PostgreSQL transaction upgrade must enforce.

## Implemented on this branch

- Read-only server-side draft in backend/online/market-acquisition-policy-v17.ts.
- Uses the exact current item definition requiredLevel for each Forge copy and the XP-to-character-level formula. Never trusts saved character.level or compares rebased character levels against legacy tier floors.
- Equipment Market-only minimums: **T1 6 / T2 18 / T3 30 / T4 52**. Exact rolled rarity surcharges: **Common/Uncommon +0, Rare +2, Epic +4, Legendary +6, Mythic +8**, added to the higher of exact item's required level or Market tier floor.
- Looks up each gear tier from its real V33 output recipe, class from canonical item data, and rarity from the exact persisted crafted receipt. Unknown/non-Forge/non-released tiers and missing or malformed receipts fail closed. T5 Market purchase remains unapproved despite T5 items being in the released equipment catalog.
- For purchase the active character is mandatory. For future delivery an explicitly selected owned recipient is checked by that recipient's own XP and class, including parked alts. This does **not** yet persist Market-item provenance or prevent an actual shared-bank transfer; transaction routes must do that.
- Resources remain separate. A small provisional per-SKU source map: Copper Ore, Greenwood Log, Moss Fiber, Boar Hide, Meadow Perch at level 1; Dunewood and Sunstone Ore at 20; Frostiron at 40. These classifications are **not approved**. Even when the preview level is met the result is market_item_policy_unapproved, never permission to trade. Unknown resources, tools and gems are similarly blocked.
- Every result has canTradeNow=false. No public route, SQL RPC, migration, approved SKU, price policy, unlock or deployment is changed.
- Added tests in backend/online/tests/market-acquisition-policy-v17.ts covering threshold-1/threshold, rarity offsets, exact XP vs a stale level-99 projection, T5+ denial, unapproved resource classification, forged receipt metadata, missing account ownership, class conflict, and high-level-main/low-level-alt purchase and delivery bypass. Included in the test:market-readiness script.

## Critical remaining work (not implemented by V17)

1. Persist a private human-reviewed per-SKU catalog with source tiers and versioned requirements. This preview object map is not a tradability authority.
2. Revalidate **inside both resource and exact-equipment purchase SQL transactions after acquiring row locks** against authenticated buyer account, authoritative online game state and XP, server-owned offer, escrow, exact Forge receipt and approved item policy. Return market_level_required before any Gold, 5% tax, delivery, receipt or listing mutation.
3. Implement provenance-safe delivery and shared-storage transfer: keep pending gear if the designated recipient lacks level/class and recheck any cross-character bank/roster/equip transfer without affecting ordinary self-crafted gear.
4. Build UI from the same server-owned requirement policy (Requires Lv N; class mismatch; unapproved/unreleased) and keep Market navigation unmounted until Auth, throttling and launch approval.
5. Run rollback-only PostgreSQL 17 lifecycle races with V12 custody, lot sizes, tax, equipment identity, alt claims, policy revocation, and insufficient levels. Confirm rejected purchases never debit Gold or create settlement receipts.
6. Complete V12 launch gates: verified Auth gateway, offer-management screens, abuse controls, manual source/price approvals, operational rollback plan.

## Review caveat

The exact underlying in-game equipment requirements may change as V33 equipment recipes evolve. This helper uses the actual item requiredLevel rather than copying historical equipment level floors from V16. Only Market-only 6/18/30/52 and rarity premiums are owner approved. Revalidate this preview against any merged regional balance updates.

**No live release flags, SQL trading gates, public grants, Supabase state, Gold or player inventory are touched.**
