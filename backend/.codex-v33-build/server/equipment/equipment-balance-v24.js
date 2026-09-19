"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECIPE_SHARE_V24 = exports.TIER_FULL_SET_TARGET_HOURS_V24 = exports.TIER_CATCHUP_CAP_V24 = exports.TIER_RECIPE_UNITS_V24 = exports.TIER_CRAFT_TIMER_RANGE_MINUTES_V24 = exports.STAT_LABEL_TO_KEY_V24 = exports.STAT_BUDGET_CONVERSION_V24 = exports.STAT_STORAGE_UNIT_V24 = exports.STAT_SHARE_V24 = exports.SLOT_BUDGET_MULTIPLIER_V24 = exports.TIER_BASE_BUDGET_V24 = void 0;
exports.exactUpgradeStatMultiplierV24 = exactUpgradeStatMultiplierV24;
exports.finalCraftMinutesV24 = finalCraftMinutesV24;
exports.oldTierAcquisitionMultiplierV24 = oldTierAcquisitionMultiplierV24;
exports.TIER_BASE_BUDGET_V24 = { T1: 12, T2: 20, T3: 31, T4: 44, T5: 62, T6: 83, T7: 108, T8: 138, T9: 172 };
exports.SLOT_BUDGET_MULTIPLIER_V24 = { Gloves: .70, Boots: .75, Helmet: .85, Legs: 1, Chest: 1.20, 'Off-hand': 1.15, Weapon: 1.35 };
exports.STAT_SHARE_V24 = { primary: .55, secondary: .30, tertiary: .15 };
exports.STAT_STORAGE_UNIT_V24 = { maxHp: 'flat', power: 'flat', armor: 'flat', ward: 'flat', accuracy: 'flat', evasion: 'decimal', critRate: 'decimal', critDamage: 'decimal', haste: 'decimal', tenacity: 'decimal', penetration: 'flat', potency: 'decimal' };
exports.STAT_BUDGET_CONVERSION_V24 = { maxHp: 10, power: 1, armor: 1, ward: 1, accuracy: 1, evasion: .00025, critRate: .00025, critDamage: .00070, haste: .00030, tenacity: .00030, penetration: 1, potency: .00035 };
exports.STAT_LABEL_TO_KEY_V24 = { 'Max HP': 'maxHp', 'Power': 'power', 'Armor': 'armor', 'Ward': 'ward', 'Accuracy': 'accuracy', 'Evasion': 'evasion', 'Crit Rate': 'critRate', 'Crit Damage': 'critDamage', 'Haste': 'haste', 'Tenacity': 'tenacity', 'Penetration': 'penetration', 'Potency': 'potency' };
exports.TIER_CRAFT_TIMER_RANGE_MINUTES_V24 = { T1: [1, 3], T2: [3, 6], T3: [5, 10], T4: [8, 15], T5: [12, 20], T6: [15, 25], T7: [20, 30], T8: [25, 40], T9: [30, 45] };
exports.TIER_RECIPE_UNITS_V24 = { T1: 8, T2: 13, T3: 20, T4: 29, T5: 41, T6: 55, T7: 72, T8: 92, T9: 116 };
exports.TIER_CATCHUP_CAP_V24 = { T1: 4, T2: 4, T3: 4, T4: 4, T5: 3.5, T6: 3, T7: 2.5, T8: 2.25, T9: 2 };
exports.TIER_FULL_SET_TARGET_HOURS_V24 = { T1: [1.5, 2], T2: [3, 4], T3: [6, 8], T4: [9, 12], T5: [13, 16], T6: [18, 22], T7: [22, 28], T8: [27, 34], T9: [32, 42] };
exports.RECIPE_SHARE_V24 = {
    T1: { regionalCommon: .72, processed: .20, monsterSpecific: .08, dungeonBoss: 0 }, T2: { regionalCommon: .68, processed: .20, monsterSpecific: .12, dungeonBoss: 0 }, T3: { regionalCommon: .63, processed: .20, monsterSpecific: .12, dungeonBoss: .05 },
    T4: { regionalCommon: .60, processed: .20, monsterSpecific: .12, dungeonBoss: .08 }, T5: { regionalCommon: .60, processed: .20, monsterSpecific: .12, dungeonBoss: .08 }, T6: { regionalCommon: .60, processed: .20, monsterSpecific: .12, dungeonBoss: .08 },
    T7: { regionalCommon: .60, processed: .20, monsterSpecific: .12, dungeonBoss: .08 }, T8: { regionalCommon: .60, processed: .20, monsterSpecific: .12, dungeonBoss: .08 }, T9: { regionalCommon: .60, processed: .20, monsterSpecific: .12, dungeonBoss: .08 }
};
function exactUpgradeStatMultiplierV24(rank) { if (!Number.isInteger(rank) || rank < 0 || rank > 10)
    throw new Error('bad_upgrade_rank'); return Number((1 + rank * .035).toFixed(3)); }
function finalCraftMinutesV24(tier, slot) { const [lo, hi] = exports.TIER_CRAFT_TIMER_RANGE_MINUTES_V24[tier], m = exports.SLOT_BUDGET_MULTIPLIER_V24[slot], minM = .70, maxM = 1.35; return Math.round(lo + ((m - minM) / (maxM - minM)) * (hi - lo)); }
function oldTierAcquisitionMultiplierV24(currentTier, craftTier) { const n = (t) => Number(t.slice(1)); const gap = Math.max(0, n(currentTier) - n(craftTier)); return Math.min(exports.TIER_CATCHUP_CAP_V24[craftTier], Number((1 + gap * .45).toFixed(2))); }
