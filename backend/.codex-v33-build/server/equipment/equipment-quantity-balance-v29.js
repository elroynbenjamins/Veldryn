"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPONENT_INPUT_SCALE_V29 = exports.DUNGEON_SEC_PER_TOKEN_V29 = exports.COMBAT_SEC_PER_COMPONENT_V29 = exports.GATHER_SEC_PER_RAW_V29 = exports.GLOBAL_CRAFT_RARITY_V29 = void 0;
exports.targetQuantityBudgetV29 = targetQuantityBudgetV29;
exports.combatComponentQtyV29 = combatComponentQtyV29;
exports.guaranteedTokenQtyV29 = guaranteedTokenQtyV29;
exports.validateGlobalRarityV29 = validateGlobalRarityV29;
const equipment_acquisition_balance_v28_1 = require("./equipment-acquisition-balance-v28");
exports.GLOBAL_CRAFT_RARITY_V29 = { Common: .888, Uncommon: .08, Rare: .025, Epic: .006, Mythic: .001 };
exports.GATHER_SEC_PER_RAW_V29 = { T1: 6, T2: 8, T3: 10, T4: 14, T5: 12, T6: 17, T7: 14, T8: 20, T9: 20 };
exports.COMBAT_SEC_PER_COMPONENT_V29 = { T1: 45, T2: 60, T3: 90, T4: 120, T5: 150, T6: 180, T7: 210, T8: 240, T9: 270 };
exports.DUNGEON_SEC_PER_TOKEN_V29 = { T1: 0, T2: 0, T3: 180, T4: 210, T5: 225, T6: 240, T7: 240, T8: 255, T9: 270 };
exports.COMPONENT_INPUT_SCALE_V29 = { T1: 1, T2: 1.5, T3: 2.5, T4: 3.5, T5: 5, T6: 6.5, T7: 8, T8: 10, T9: 12 };
function targetQuantityBudgetV29(tier, path, slot) {
    const h = (0, equipment_acquisition_balance_v28_1.targetAcquisitionHoursV28)(tier, path, slot);
    return {
        totalHours: h.total,
        skillingMinutes: h.skilling * 60,
        combatMinutes: h.combat * 60,
        dungeonMinutes: (tier === 'T1' || tier === 'T2') ? 0 : h.dungeon * 60,
        finalCraftMinutes: (0, equipment_acquisition_balance_v28_1.targetFinalCraftMinutesV28)(tier, slot),
    };
}
function combatComponentQtyV29(tier, combatMinutes) {
    if (combatMinutes <= 0)
        return 0;
    return Math.max(1, Math.round(combatMinutes / (exports.COMBAT_SEC_PER_COMPONENT_V29[tier] / 60)));
}
function guaranteedTokenQtyV29(tier, dungeonMinutes) {
    if (tier === 'T1' || tier === 'T2' || dungeonMinutes <= 0)
        return 0;
    return Math.max(1, Math.round(dungeonMinutes / (exports.DUNGEON_SEC_PER_TOKEN_V29[tier] / 60)));
}
function validateGlobalRarityV29() {
    const total = Object.values(exports.GLOBAL_CRAFT_RARITY_V29).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1) > 1e-12)
        throw new Error('v29_rarity_total_invalid');
    if (exports.GLOBAL_CRAFT_RARITY_V29.Mythic !== .001)
        throw new Error('v29_mythic_not_global_point_one_percent');
    if (exports.GLOBAL_CRAFT_RARITY_V29.Epic !== .006)
        throw new Error('v29_epic_not_global_point_six_percent');
    return true;
}
