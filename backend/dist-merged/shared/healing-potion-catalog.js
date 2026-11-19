"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEALING_POTION_MAX_HP_FRACTIONS = void 0;
exports.healingPotionFraction = healingPotionFraction;
/** Single authoritative potion-heal catalog shared by mobile Alchemy and dungeon server.
 * Keep prices, recipe timings and crafting XP in the mobile Alchemy recipe catalog.
 */
exports.HEALING_POTION_MAX_HP_FRACTIONS = {
    DEWLEAF_DRAUGHT: 0.20,
    RIVERHEART_DRAUGHT: 0.35,
    OATHBLOOM_DRAUGHT: 0.50,
};
function healingPotionFraction(itemId) {
    return Object.prototype.hasOwnProperty.call(exports.HEALING_POTION_MAX_HP_FRACTIONS, itemId)
        ? exports.HEALING_POTION_MAX_HP_FRACTIONS[itemId] : undefined;
}
