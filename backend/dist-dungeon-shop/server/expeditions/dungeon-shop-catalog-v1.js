"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DUNGEON_SHOP_CATALOG_V1 = exports.DUNGEON_SHOP_CATALOG_VERSION = exports.DUNGEON_SHOP_LIVE_V1 = void 0;
exports.dungeonShopOfferV1 = dungeonShopOfferV1;
exports.dungeonShopUtcWeekKey = dungeonShopUtcWeekKey;
exports.dungeonShopQuoteV1 = dungeonShopQuoteV1;
exports.dungeonShopPurchasesEnabledV1 = dungeonShopPurchasesEnabledV1;
exports.validateDungeonShopCatalogV1 = validateDungeonShopCatalogV1;
/**
 * Dungeon Marks Shop catalogue. Server validates IDs, while PostgreSQL owns
 * live prices, weekly caps, entitlements and the global release switch.
 * The database gates each SKU. Reviewed crafting bundles are delivered directly
 * to the shared Bank; legacy bound-material offers remain preview-only.
 */
exports.DUNGEON_SHOP_LIVE_V1 = true;
exports.DUNGEON_SHOP_CATALOG_VERSION = 'dungeon-marks-shop-v3-2026-11-15';
/** Utility SKUs are intentionally capped and lower than real dungeon drops.
 * No finished equipment, high-grade gems, boss-unique materials or Gold. */
exports.DUNGEON_SHOP_CATALOG_V1 = Object.freeze([
    { id: 'dshop_tempering_satchel', name: 'Delver Tempering Satchel', category: 'supply', marks: 120, perUtcWeek: 2, grant: { kind: 'material', itemId: 'TEMPERING_DUST', quantity: 10, accountBound: true } },
    { id: 'dshop_gem_dust_cache', name: 'Gem Dust Cache', category: 'supply', marks: 240, perUtcWeek: 1, grant: { kind: 'material', itemId: 'GEM_DUST', quantity: 8, accountBound: true } },
    { id: 'dshop_tempering_core_cache', name: 'Tempering Core Cache', category: 'supply', marks: 450, perUtcWeek: 1, grant: { kind: 'material', itemId: 'TEMPERING_CORE', quantity: 2, accountBound: true } },
    { id: 'dshop_moss_fiber_100', name: 'Moss Fiber ×100', category: 'material', marks: 150, perUtcWeek: 1, grant: { kind: 'crafting_bundle', itemId: 'MOSS_FIBER', quantity: 100, tier: 1 } },
    { id: 'dshop_greenwood_log_100', name: 'Greenwood Log ×100', category: 'material', marks: 150, perUtcWeek: 1, grant: { kind: 'crafting_bundle', itemId: 'GREENWOOD_LOG', quantity: 100, tier: 1 } },
    { id: 'dshop_wolf_pelt_100', name: 'Wolf Pelt ×100', category: 'material', marks: 300, perUtcWeek: 1, grant: { kind: 'crafting_bundle', itemId: 'WOLF_PELT', quantity: 100, tier: 2 } },
    { id: 'dshop_ironwood_log_100', name: 'Ironwood Log ×100', category: 'material', marks: 300, perUtcWeek: 1, grant: { kind: 'crafting_bundle', itemId: 'IRONWOOD_LOG', quantity: 100, tier: 2 } },
    { id: 'dshop_dunewood_100', name: 'Dunewood ×100', category: 'material', marks: 600, perUtcWeek: 1, grant: { kind: 'crafting_bundle', itemId: 'DUNEWOOD', quantity: 100, tier: 3 } },
    { id: 'dshop_sunscale_100', name: 'Sunscale ×100', category: 'material', marks: 600, perUtcWeek: 1, grant: { kind: 'crafting_bundle', itemId: 'SUNSCALE', quantity: 100, tier: 3 } },
    { id: 'dshop_sunstone_ingot_100', name: 'Sunstone Ingot ×100', category: 'material', marks: 1000, perUtcWeek: 1, grant: { kind: 'crafting_bundle', itemId: 'SUNSTONE_INGOT', quantity: 100, tier: 4 } },
    { id: 'dshop_companion_essence', name: 'Companion Essence Cache', category: 'companion', marks: 400, perUtcWeek: 1, grant: { kind: 'account_resource', field: 'companionEssence', quantity: 100 } },
    { id: 'dshop_bondstone', name: 'Bondstone', category: 'companion', marks: 750, perUtcWeek: 1, grant: { kind: 'account_resource', field: 'bondstones', quantity: 1 } },
    { id: 'dshop_asterfall_icon', name: "Warden's Lantern", category: 'icon', marks: 500, firstClearRegion: 'Asterfall', permanent: true, grant: { kind: 'profile_collectible', accountField: 'unlockedProfileIconIds', rewardId: 'dungeon:asterfall:wardens-lantern', rarity: 'Rare' } },
    { id: 'dshop_asterfall_border', name: 'Briarbound Frame', category: 'border', marks: 950, firstClearRegion: 'Asterfall', permanent: true, grant: { kind: 'profile_collectible', accountField: 'unlockedProfileBorderIds', rewardId: 'dungeon:asterfall:briarbound-frame', rarity: 'Epic', bonus: { target: 'gatheringYield', ownedBps: 50, activeBps: 200 } } },
    { id: 'dshop_asterfall_background', name: 'Rootbound Sanctuary', category: 'background', marks: 1500, firstClearRegion: 'Asterfall', permanent: true, grant: { kind: 'profile_collectible', accountField: 'unlockedProfileBackgroundIds', rewardId: 'dungeon:asterfall:rootbound-sanctuary', rarity: 'Epic', bonus: { target: 'hp', ownedBps: 50, activeBps: 200 } } },
    { id: 'dshop_asterfall_pet', name: 'Oathroot Seedling', category: 'pet', marks: 3000, firstClearRegion: 'Asterfall', permanent: true, grant: { kind: 'profile_collectible', accountField: 'unlockedCosmeticPetIds', rewardId: 'DUNGEON_PET_ASTERFALL_001', rarity: 'Epic', bonus: { target: 'healingEffectiveness', ownedBps: 50, activeBps: 300 } } },
    { id: 'dshop_sunscar_icon', name: 'Solar Vault Key', category: 'icon', marks: 500, firstClearRegion: 'Sunscar', permanent: true, grant: { kind: 'profile_collectible', accountField: 'unlockedProfileIconIds', rewardId: 'dungeon:sunscar:solar-vault-key', rarity: 'Rare' } },
    { id: 'dshop_sunscar_border', name: 'Amberglass Loop', category: 'border', marks: 950, firstClearRegion: 'Sunscar', permanent: true, grant: { kind: 'profile_collectible', accountField: 'unlockedProfileBorderIds', rewardId: 'dungeon:sunscar:amberglass-loop', rarity: 'Epic', bonus: { target: 'craftingSpeed', ownedBps: 50, activeBps: 200 } } },
    { id: 'dshop_sunscar_background', name: 'Buried Observatory', category: 'background', marks: 1500, firstClearRegion: 'Sunscar', permanent: true, grant: { kind: 'profile_collectible', accountField: 'unlockedProfileBackgroundIds', rewardId: 'dungeon:sunscar:buried-observatory', rarity: 'Epic', bonus: { target: 'skillXp', ownedBps: 50, activeBps: 200 } } },
    { id: 'dshop_sunscar_pet', name: 'Vaultscarab', category: 'pet', marks: 3000, firstClearRegion: 'Sunscar', permanent: true, grant: { kind: 'profile_collectible', accountField: 'unlockedCosmeticPetIds', rewardId: 'DUNGEON_PET_SUNSCAR_001', rarity: 'Epic', bonus: { target: 'dropChance', ownedBps: 50, activeBps: 300 } } },
    { id: 'dshop_frostmarch_icon', name: 'Resonant Bell', category: 'icon', marks: 500, firstClearRegion: 'Frostmarch', permanent: true, grant: { kind: 'profile_collectible', accountField: 'unlockedProfileIconIds', rewardId: 'dungeon:frostmarch:resonant-bell', rarity: 'Rare' } },
    { id: 'dshop_frostmarch_border', name: 'Frostbound Chime', category: 'border', marks: 950, firstClearRegion: 'Frostmarch', permanent: true, grant: { kind: 'profile_collectible', accountField: 'unlockedProfileBorderIds', rewardId: 'dungeon:frostmarch:frostbound-chime', rarity: 'Epic', bonus: { target: 'fishingSpeed', ownedBps: 50, activeBps: 200 } } },
    { id: 'dshop_frostmarch_background', name: 'Shiverlake Reflections', category: 'background', marks: 1500, firstClearRegion: 'Frostmarch', permanent: true, grant: { kind: 'profile_collectible', accountField: 'unlockedProfileBackgroundIds', rewardId: 'dungeon:frostmarch:shiverlake-reflections', rarity: 'Epic', bonus: { target: 'defense', ownedBps: 50, activeBps: 200 } } },
    { id: 'dshop_frostmarch_pet', name: 'Choirbell Sprite', category: 'pet', marks: 3000, firstClearRegion: 'Frostmarch', permanent: true, grant: { kind: 'profile_collectible', accountField: 'unlockedCosmeticPetIds', rewardId: 'DUNGEON_PET_FROSTMARCH_001', rarity: 'Epic', bonus: { target: 'actionSpeed', ownedBps: 50, activeBps: 300 } } },
]);
function dungeonShopOfferV1(itemId) {
    return exports.DUNGEON_SHOP_CATALOG_V1.find(offer => offer.id === itemId);
}
/** ISO date of UTC Monday for a clock instant, independent of client timezone. */
function dungeonShopUtcWeekKey(nowMs) {
    if (!Number.isSafeInteger(nowMs) || nowMs < 0)
        throw new Error('invalid_dungeon_shop_clock');
    const date = new Date(nowMs);
    date.setUTCHours(0, 0, 0, 0);
    const day = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
    return date.toISOString().slice(0, 10);
}
function dungeonShopQuoteV1(itemId, account, serverPrice) {
    const offer = dungeonShopOfferV1(itemId);
    if (!offer)
        return { status: 'unknown_offer', marks: account.marks, price: 0, remaining: null };
    const price = serverPrice ?? offer.marks;
    if (!Number.isSafeInteger(price) || price < 1 || price >= 1000000)
        throw new Error('invalid_server_shop_price');
    const purchased = account.purchasesThisUtcWeek[itemId] ?? 0;
    const remaining = offer.perUtcWeek === undefined ? null : Math.max(0, offer.perUtcWeek - purchased);
    const ownedId = offer.grant.kind === 'profile_collectible' ? offer.grant.rewardId : null;
    const status = offer.firstClearRegion && !account.clearedRegions.includes(offer.firstClearRegion) ? 'region_locked' :
        offer.grant.kind === 'crafting_bundle' && !account.unlockedCraftingTiers.includes(offer.grant.tier) ? 'crafting_tier_locked' :
            ownedId && account.ownedRewardIds.includes(ownedId) ? 'already_owned' :
                remaining !== null && remaining === 0 ? 'weekly_limit' :
                    account.marks < price ? 'insufficient_marks' : 'eligible';
    return { status, marks: account.marks, price, remaining };
}
/** Database release settings and per-offer switches still gate all spending. */
function dungeonShopPurchasesEnabledV1() { return exports.DUNGEON_SHOP_LIVE_V1; }
function validateDungeonShopCatalogV1() {
    const ids = new Set(), rewardIds = new Set();
    for (const offer of exports.DUNGEON_SHOP_CATALOG_V1) {
        if (ids.has(offer.id) || !Number.isSafeInteger(offer.marks) || offer.marks <= 0)
            throw new Error('invalid_dungeon_shop_catalogue');
        ids.add(offer.id);
        if (offer.permanent === true && offer.grant.kind !== 'profile_collectible')
            throw new Error('permanent_offer_without_entitlement');
        if (offer.permanent === true && offer.perUtcWeek !== undefined)
            throw new Error('permanent_offer_weekly_limit');
        if (offer.perUtcWeek !== undefined && (!Number.isSafeInteger(offer.perUtcWeek) || offer.perUtcWeek < 1))
            throw new Error('invalid_dungeon_shop_limit');
        if (offer.grant.kind === 'crafting_bundle' && (offer.category !== 'material' || offer.grant.quantity !== 100 || ![1, 2, 3, 4].includes(offer.grant.tier) || offer.perUtcWeek !== 1 || offer.permanent))
            throw new Error('invalid_crafting_bundle');
        if (offer.grant.kind === 'profile_collectible') {
            if (!offer.permanent || rewardIds.has(offer.grant.rewardId))
                throw new Error('duplicate_or_unbounded_dungeon_collectible');
            rewardIds.add(offer.grant.rewardId);
            if (offer.category === 'icon' && offer.grant.bonus)
                throw new Error('profile_icon_must_be_cosmetic');
            if (offer.grant.bonus?.ownedBps !== undefined && offer.grant.bonus.ownedBps !== 50)
                throw new Error('invalid_owned_bonus');
        }
    }
}
validateDungeonShopCatalogV1();
