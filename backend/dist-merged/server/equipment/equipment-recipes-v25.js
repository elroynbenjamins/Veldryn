"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recipeForPieceV25 = recipeForPieceV25;
const equipment_balance_v24_1 = require("./equipment-balance-v24");
const equipment_resource_map_v25_1 = require("./equipment-resource-map-v25");
const equipment_recipe_sources_v25_1 = require("./equipment-recipe-sources-v25");
function recipeForPieceV25(piece) {
    const units = Math.max(1, Math.round(equipment_balance_v24_1.TIER_RECIPE_UNITS_V24[piece.tier] * equipment_balance_v24_1.SLOT_BUDGET_MULTIPLIER_V24[piece.slot]));
    const share = equipment_balance_v24_1.RECIPE_SHARE_V24[piece.tier];
    const src = (0, equipment_recipe_sources_v25_1.resolveRecipeSourcesV25)(piece.tier, piece.path, piece.requiredLevel, piece.id);
    const out = [];
    const add = (role, key, fraction, boss = false) => { if (!key || fraction <= 0)
        return; const r = (0, equipment_resource_map_v25_1.canonicalResourceV25)(key); out.push({ role, canonicalKey: key, resourceId: r.globalResourceId, regionalResourceId: r.regionalResourceId, itemId: r.itemId, quantity: Math.max(1, Math.round(units * fraction)), registrationRequired: !r.itemId, guaranteedSource: true, source: r.source, ...(boss ? { expectedYieldPerEligibleClear: (piece.tier === 'T9' ? [5, 7] : [4, 6]) } : {}) }); };
    add('regional', src.regional, share.regionalCommon * .68);
    // V25 maps the processing share to the same authoritative raw-resource family until/if a canonical processed inventory item exists.
    add('processedInput', src.regional, share.processed + share.regionalCommon * .32);
    add('monsterRare', src.rare, share.monsterSpecific);
    add('dungeonBoss', src.boss, share.dungeonBoss, true);
    return { pieceId: piece.id, tier: piece.tier, requiredLevel: piece.requiredLevel, craftMinutes: (0, equipment_balance_v24_1.finalCraftMinutesV24)(piece.tier, piece.slot), requirements: out, contentSource: src.contentSource, blockedByMissingItemRegistration: out.some(v => v.registrationRequired) };
}
