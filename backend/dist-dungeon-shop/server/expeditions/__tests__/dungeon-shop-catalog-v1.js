"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const dungeon_shop_catalog_v1_1 = require("../dungeon-shop-catalog-v1");
(0, dungeon_shop_catalog_v1_1.validateDungeonShopCatalogV1)();
node_assert_1.strict.equal(dungeon_shop_catalog_v1_1.DUNGEON_SHOP_CATALOG_VERSION, 'dungeon-marks-shop-v3-2026-11-15');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopPurchasesEnabledV1)(), true, 'The DB global gate and per-SKU enabled flags authorize releases, not the client');
node_assert_1.strict.equal(dungeon_shop_catalog_v1_1.DUNGEON_SHOP_CATALOG_V1.length, 24);
node_assert_1.strict.equal(dungeon_shop_catalog_v1_1.DUNGEON_SHOP_CATALOG_V1.filter(row => row.permanent).length, 12);
node_assert_1.strict.equal(dungeon_shop_catalog_v1_1.DUNGEON_SHOP_CATALOG_V1.filter(row => row.perUtcWeek !== undefined).length, 12);
node_assert_1.strict.equal(new Set(dungeon_shop_catalog_v1_1.DUNGEON_SHOP_CATALOG_V1.map(row => row.id)).size, 24);
node_assert_1.strict.equal(new Set(dungeon_shop_catalog_v1_1.DUNGEON_SHOP_CATALOG_V1.filter(row => row.grant.kind === 'profile_collectible').map(row => row.grant.kind === 'profile_collectible' ? row.grant.rewardId : '')).size, 12);
for (const region of ['Asterfall', 'Sunscar', 'Frostmarch']) {
    const set = dungeon_shop_catalog_v1_1.DUNGEON_SHOP_CATALOG_V1.filter(row => row.firstClearRegion === region);
    node_assert_1.strict.deepEqual(set.map(row => row.marks), [500, 950, 1500, 3000]);
    node_assert_1.strict.equal(set.reduce((sum, row) => sum + row.marks, 0), 5950);
    node_assert_1.strict.deepEqual(set.map(row => row.category), ['icon', 'border', 'background', 'pet']);
    node_assert_1.strict.equal(set.every(row => row.permanent), true);
}
for (const offer of dungeon_shop_catalog_v1_1.DUNGEON_SHOP_CATALOG_V1) {
    if (offer.grant.kind === 'profile_collectible') {
        if (offer.category === 'icon')
            node_assert_1.strict.equal(offer.grant.bonus, undefined);
        else {
            node_assert_1.strict.equal(offer.grant.bonus?.ownedBps, 50);
            node_assert_1.strict.equal(offer.grant.bonus?.activeBps, offer.category === 'pet' ? 300 : 200);
        }
    }
    else {
        if (offer.grant.kind === 'crafting_bundle') {
            node_assert_1.strict.equal(offer.grant.quantity, 100);
            node_assert_1.strict.equal(offer.perUtcWeek, 1);
            node_assert_1.strict.equal(offer.category, 'material');
        }
        node_assert_1.strict.ok(offer.perUtcWeek !== undefined && offer.perUtcWeek <= 2, 'No uncapped consumable spam');
        if (offer.grant.kind === 'material')
            node_assert_1.strict.equal(offer.grant.accountBound, true);
    }
}
const bundles = dungeon_shop_catalog_v1_1.DUNGEON_SHOP_CATALOG_V1.filter(row => row.grant.kind === 'crafting_bundle');
node_assert_1.strict.equal(bundles.length, 7);
node_assert_1.strict.deepEqual(bundles.map(row => row.marks), [150, 150, 300, 300, 600, 600, 1000]);
node_assert_1.strict.deepEqual(bundles.map(row => row.grant.kind === 'crafting_bundle' ? row.grant.tier : null), [1, 1, 2, 2, 3, 3, 4]);
const initial = {
    marks: 4000, clearedRegions: ['Sunscar'], ownedRewardIds: [], unlockedCraftingTiers: [1, 2], purchasesThisUtcWeek: {},
};
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_sunscar_pet', initial).status, 'eligible');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_dunewood_100', initial).status, 'crafting_tier_locked');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_dunewood_100', { ...initial, unlockedCraftingTiers: [1, 2, 3] }).status, 'eligible');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_asterfall_icon', initial).status, 'region_locked');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_asterfall_pet', { ...initial, clearedRegions: ['Asterfall'], marks: 3000 }).status, 'eligible');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopOfferV1)('dshop_asterfall_pet')?.grant.kind, 'profile_collectible');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_frostmarch_pet', initial).status, 'region_locked');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_sunscar_pet', { ...initial, ownedRewardIds: ['DUNGEON_PET_SUNSCAR_001'] }).status, 'already_owned');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_sunscar_pet', { ...initial, marks: 1000 }).status, 'insufficient_marks');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_bondstone', { ...initial, marks: 500 }).status, 'insufficient_marks');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_bondstone', { ...initial, marks: 500 }, 499).status, 'eligible');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_bondstone', initial, 900).price, 900);
node_assert_1.strict.throws(() => (0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_bondstone', initial, -1), /invalid_server_shop_price/);
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_tempering_satchel', { ...initial, purchasesThisUtcWeek: { dshop_tempering_satchel: 1 } }).remaining, 1);
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('dshop_tempering_satchel', { ...initial, purchasesThisUtcWeek: { dshop_tempering_satchel: 2 } }).status, 'weekly_limit');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopQuoteV1)('not_real', initial).status, 'unknown_offer');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopOfferV1)('dshop_bondstone')?.marks, 750);
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopUtcWeekKey)(Date.UTC(2026, 10, 8, 23, 59)), '2026-11-02');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopUtcWeekKey)(Date.UTC(2026, 10, 9, 0, 0)), '2026-11-09');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopUtcWeekKey)(Date.UTC(2026, 10, 15, 23, 59)), '2026-11-09');
node_assert_1.strict.equal((0, dungeon_shop_catalog_v1_1.dungeonShopUtcWeekKey)(Date.UTC(2026, 10, 16, 0, 0)), '2026-11-16');
node_assert_1.strict.throws(() => (0, dungeon_shop_catalog_v1_1.dungeonShopUtcWeekKey)(NaN), /invalid_dungeon_shop_clock/);
console.log('Dungeon Marks Shop V1 hidden-catalogue tests passed');
