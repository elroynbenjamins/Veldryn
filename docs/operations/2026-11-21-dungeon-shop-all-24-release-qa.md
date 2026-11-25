# Dungeon Shop — all 24 offers: release QA and activation gate

**Status: implementation candidate, NOT production-released.**
**Production remains at 9/24 enabled SKUs.** Existing 2 companion-resource packs and 7 crafting bundles keep their current availability.

## Remaining 15 approved offer definitions
- 12 permanent region-locked collectibles: three each of pets, profile frames, backgrounds and avatars. All require a verified dungeon clear in their respective region. Each is purchased once per account and has its existing server-controlled Mark price.
- 3 bounded utility packs: 10 Tempering Dust (120 Marks, twice/week), 8 Gem Dust (240 Marks, once/week) and 2 Tempering Cores (450 Marks, once/week).
- The supplies are account-bound, stored as separate `bound:true` Bank stacks, cannot be sold or posted to the future Player Market, and may be transferred between the owner's Inventory and Bank for crafting/consumption.

## Staging evidence — 21 Nov 2026
- Applied migration `dungeon_shop_account_bound_material_grants_v4` **only to staging**.
- Verified all 3 newly bound supply SKUs by transactional SQL: exact grant quantity, distinct bound marker, exact Marks debit and idempotent request replay. Every test ended with ROLLBACK.
- Verified all 4 Asterfall collectible reward kinds by transactional SQL using a synthetic claimed Asterfall run, exact account ownership fields, Marks debit, permanent already-owned no-charge and Sunscar region lock. The synthetic run and purchases were rolled back.
- Verified the guarded final activation script enables exactly 24/24 existing SKUs in staging inside a transaction. Rolled back immediately and verified staging global switch **OFF** and still **9/24** per-offer flags enabled.
- No production SQL writes and no app release were performed.

## Release steps in order
1. Confirm the grouped-shop mobile UI has received explicit real-device approval at 320/360/400dp and supported themes, including accessibility and larger text. Parent review PR #1554 is draft.
2. Complete exact-HEAD CI: app and core typechecking, full mobile core tests including bound stack ownership, inventory/Bank moves, selling, salvage, load/save, equipment copy regression; dungeon online quote/purchase, localization, native Android smoke; **generated gameplay and co-op Edge bundle parity**. Require all release checks passing on the merged candidate.
3. Validate compatible staging Android build and account readback for each reward family (pet, frame, background, avatar and three bound material SKUs), and confirm permanent/active passive bonuses and ownership after reconnect and after saving/upgrading an old account. Verify Market forbids bound stacks.
4. Merge approved source after reconciliation with current `main` and publish a compatible Android client. The client has `DUNGEON_MARKS_SHOP_RELEASED=true`; old clients with false could charge Marks without displaying owned rewards.
5. Deploy the vetted V4 purchase RPC to production **after** a compatible client rollout check and a protected deployment window. Confirm readback and that the 3 material packs are still disabled.
6. With global shop switch ON, execute `backend/supabase/ops/dungeon-shop-all-24-manual-release-20261121.sql` once. It validates the canonical 12 collectible plus 3 material definitions, the V4 grant handler, and exactly 15 updated records, requiring total 24/24 published.
7. Verify an authenticated production snapshot, marks debit and account ownership readback for a controlled purchase of each category. Confirm legacy saves, weekly caps, region locks, shortage/duplicate rejection and refunds/ledger.
8. On any discrepancy, **disable only the 15 newly released per-SKU flags**. Do not delete permanent entitlements, receipts or legitimate earlier ledger charges.

## Scope and risks
- The starter item and prices are unchanged. Dungeon drop-only equipment remains unbuyable in the Dungeon Shop (not one of these 24 SKUs).
- A bound material cannot be minted as an unbound stack or merged with naturally obtained/marketable material of the same ID. The accounting and inventory logic must preserve provenance through every transaction and client revision.
- The PostgreSQL migration intentionally does not change any release flags. Only the separate manual release script changes the remaining 15 SKUs.
- The player-requested outcome is **prepared, not yet available to live players**. Do not claim a live 24/24 rollout before the client and server gates are safely activated.
