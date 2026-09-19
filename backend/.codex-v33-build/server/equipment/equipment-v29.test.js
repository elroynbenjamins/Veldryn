"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equipment_quantity_balance_v29_1 = require("./equipment-quantity-balance-v29");
const equipment_craft_rarity_v26_1 = require("./equipment-craft-rarity-v26");
function assert(cond, msg) { if (!cond)
    throw new Error(msg); }
assert((0, equipment_quantity_balance_v29_1.validateGlobalRarityV29)(), 'global rarity validation');
assert(equipment_quantity_balance_v29_1.GLOBAL_CRAFT_RARITY_V29.Epic === .006, 'epic chance');
assert(equipment_quantity_balance_v29_1.GLOBAL_CRAFT_RARITY_V29.Mythic === .001, 'mythic chance');
for (const tier of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9']) {
    const chances = (0, equipment_craft_rarity_v26_1.rarityChancesV26)(tier, 0, 0, 0);
    assert(chances.find(x => x.rarity === 'Epic')?.chance === .006, `${tier} epic`);
    assert(chances.find(x => x.rarity === 'Mythic')?.chance === .001, `${tier} mythic`);
}
assert((0, equipment_quantity_balance_v29_1.guaranteedTokenQtyV29)('T1', 30) === 0, 'T1 token guard');
assert((0, equipment_quantity_balance_v29_1.guaranteedTokenQtyV29)('T2', 30) === 0, 'T2 token guard');
assert((0, equipment_quantity_balance_v29_1.guaranteedTokenQtyV29)('T9', 135) > 0, 'T9 token grind');
const t9 = (0, equipment_quantity_balance_v29_1.targetQuantityBudgetV29)('T9', 'Alternate', 'Weapon');
assert(t9.totalHours > 7, 'T9 weapon target');
assert(t9.dungeonMinutes > 0, 'T9 dungeon budget');
