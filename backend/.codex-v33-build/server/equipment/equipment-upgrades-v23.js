"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPGRADE_RULES_V23 = void 0;
exports.maxUpgradeRankV23 = maxUpgradeRankV23;
exports.upgradeCostUnitsV23 = upgradeCostUnitsV23;
const MAX = { T1: 3, T2: 4, T3: 5, T4: 6, T5: 7, T6: 8, T7: 9, T8: 10, T9: 10 };
const COST_BASE = { T1: 4, T2: 7, T3: 11, T4: 17, T5: 25, T6: 36, T7: 50, T8: 68, T9: 90 };
function maxUpgradeRankV23(tier) { return MAX[tier]; }
function upgradeCostUnitsV23(tier, nextRank) { if (nextRank < 1 || nextRank > MAX[tier])
    throw new Error('invalid_upgrade_rank'); return Math.round(COST_BASE[tier] * Math.pow(1.32, nextRank - 1)); }
exports.UPGRADE_RULES_V23 = { upgradeNeverChangesSetId: true, upgradeNeverChangesSkinUnlockRequirement: true, upgradeNeverChangesRarity: true, upgradeCannotBypassRequiredLevel: true };
