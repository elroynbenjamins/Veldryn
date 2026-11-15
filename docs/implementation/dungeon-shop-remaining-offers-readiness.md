# Dungeon Marks Shop — remaining 15 offers (implementation readiness)

**Status:** Development-only art and client registry pass. The two live account resources (100 Companion Essence / 400 Marks and 1 Bondstone / 750 Marks, both 1 per UTC week) remain unchanged. No additional offer is released by this document or the associated branch.

## Offer matrix

| Region / category | Offer | Cost | Reward | Readiness |
| --- | --- | ---: | --- | --- |
| Supplies | Delver Tempering Satchel | 120 | 10 bound Tempering Dust; 2/week | Art draft; bound-material grant and consumption not implemented |
| Supplies | Gem Dust Cache | 240 | 8 bound Gem Dust; 1/week | Art draft; bound-material grant and consumption not implemented |
| Supplies | Tempering Core Cache | 450 | 2 bound Tempering Cores; 1/week | Art draft; bound-material grant and consumption not implemented |
| Asterfall | Warden's Lantern | 500 | Rare profile icon | Art + account ownership registration drafted |
| Asterfall | Briarbound Frame | 950 | Epic border; +0.50% owned / +2.00% active gathering yield | Art + account ownership registration drafted |
| Asterfall | Rootbound Sanctuary | 1,500 | Epic background; +0.50% owned / +2.00% active HP | Art + account ownership registration drafted |
| Asterfall | Oathroot Seedling | 3,000 | Epic pet; +0.50% owned / +3.00% active healing effectiveness | Art + account ownership registration drafted |
| Sunscar | Solar Vault Key | 500 | Rare profile icon | Art + account ownership registration drafted |
| Sunscar | Amberglass Loop | 950 | Epic border; +0.50% owned / +2.00% active crafting speed | Art + account ownership registration drafted |
| Sunscar | Buried Observatory | 1,500 | Epic background; +0.50% owned / +2.00% active skill XP | Art + account ownership registration drafted |
| Sunscar | Vaultscarab | 3,000 | Epic pet; +0.50% owned / +3.00% active drop chance | Art + account ownership registration drafted |
| Frostmarch | Resonant Bell | 500 | Rare profile icon | Art + account ownership registration drafted |
| Frostmarch | Frostbound Chime | 950 | Epic border; +0.50% owned / +2.00% active fishing speed | Art + account ownership registration drafted |
| Frostmarch | Shiverlake Reflections | 1,500 | Epic background; +0.50% owned / +2.00% active defense | Art + account ownership registration drafted |
| Frostmarch | Choirbell Sprite | 3,000 | Epic pet; +0.50% owned / +3.00% active action speed | Art + account ownership registration drafted |

The Region first-clear lock is checked by `public.dungeon_shop_cleared_regions_server_v1` using the established expedition IDs `EXP_001`–`EXP_006`. Its current mapping corresponds to `launch-content.ts`; maintain this consistency when a regional dungeon is added or moved.

## Art integration

- 12 draft regional profile collectible PNGs and one 15-offer atlas are under `apps/mobile/assets/dungeon-shop-v1/`.
- `theme/dungeon-shop-art.ts` maps both shop item IDs and permanent account reward IDs to art sources.
- `DungeonShopOfferArtwork` replaces the old ◇ placeholder for all 17 shop offers, using approved existing icons for the two already-live resources.
- Existing Collections, Profile, Pet and frame artwork resolvers support draft regional collectibles. The 32×32 sprites are **first-pass placeholders**. Produce and review full-resolution 16:9 profile backgrounds, 16:9 frame overlays, and pet portraits before any cosmetic SKU goes live.
- Keep all 15 offers unreleased in the database until their own production-ready artwork and test gates pass.

## Server-owned material economy work still required

The current atomic purchase RPC **rejects all `grant_kind='material'`** intentionally. Do not remove that guard as a shortcut. First implement a durable account-bound material ledger with ownership/provenance, then consume from bound balances before tradeable balances in every relevant Forge, Gem and crafting flow. Bound stacks must never be transferred, gifted, marketed, salvaged or converted to tradable stacks. Introduce dedicated idempotent debit receipts, a proven transaction lock order, and overflow handling. Add tests for multiple characters, simultaneous crafts, idempotent retries, negative balances, and rollback on failed payment before enabling any of these three SKUs.

## Cosmetic release gates

1. Verify all 12 artwork sources render at 48px in the Shop, their full-size profile/collection surfaces, and on small-screen devices with reduced motion.
2. Run typechecks, mobile core and co-op contract suites.
3. On staging, temporarily enable a **single** cosmetic offer and verify: account-wide permanent grant, correct regional first-clear requirement, owner-only access, duplicate request replay, permanent ownership, insufficient Marks, balance atomicity, simultaneous request resolution, and owned/active bonuses after relog and character switches.
4. Confirm purchased icons can be equipped and their artwork is visible in both private and public profiles. Verify backgrounds and border cropping and pet collection and active selection.
5. After art acceptance and staging proof, deploy only the individual offer(s) explicitly approved; leave other catalogue rows unchanged. The global switch can remain on for the two live resource SKUs.
6. Monitor live purchase 4xx/5xx and rollback by setting the specific `dungeon_shop_catalogue_v1.enabled=false` if needed. Do not retroactively revoke legitimately earned rewards.

**Production status at drafting:** only `dshop_companion_essence` and `dshop_bondstone` have `enabled=true`.
