# Dungeon Shop grouped collectibles — release review (21 Nov 2026)

## Scope
- The existing Supplies / Collections / Owned tabs remain. Supplies are grouped into selected-tier crafting materials, companion resources and enhancement supplies, retaining full-width rows, tier selection and authenticated purchase requests.
- Collections and Owned group items Pets → Frames → Backgrounds → Avatars; all three regional items appear adjacent in compact cards, with full-size details below the selected row. Below 360dp, the same groups form horizontal swipeable rows rather than squeezing three card names into tiny columns.
- Region locks, ownership, server prices, Mark affordability and weekly caps remain server-owned.

## Live state checked (read-only)
- Production global shop switch: ON. 24 SKUs total; 9 released (2 account resources and 7 crafting bundles).
- All 12 collectible per-SKU switches OFF. Three legacy bound-material SKUs OFF because provenance/isolation is unsupported.
- Staging global shop switch OFF. Both environments contain profile-collectible grant and crafting-bundle delivery SQL.
- No production or staging database changes were made in this review pass.

## Required release sequence — HOLD
1. Review and explicitly approve the actual 320/360/400dp screen appearance and current themes. Keep the UI change on the draft branch before approval.
2. In a reviewed mobile release commit, change DUNGEON_MARKS_SHOP_RELEASED from false to true; update related test assertions. Verify the purchased pet/border/background bonus, wardrobe, profile avatar and old saves.
3. Run shop + collectible tests, TS check and Android QA for large text, screen readers, purchase retries, owned state and interruption.
4. In staging, verify authorized and idempotent purchases for each grant kind, already-owned no debit, real region unlock, concurrent purchase behavior, balance refresh, and no receipt loss.
5. Ship and verify the approved client build BEFORE enabling the 12 SQL offers.
6. Only then, execute the guarded MANUAL script backend/supabase/ops/dungeon-shop-collectibles-manual-release-20261121.sql. It is not an auto migration.
7. Validate production snapshots, permanent grants and active bonuses. For emergency stop, disable only the twelve per-SKU flags; never remove permanent grants or receipts.

Status: DRAFT review candidate / production release HOLD.
