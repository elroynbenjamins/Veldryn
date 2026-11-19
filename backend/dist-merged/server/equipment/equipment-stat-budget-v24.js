"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseStatsForPieceV24 = baseStatsForPieceV24;
exports.aggregateStatLinesV24 = aggregateStatLinesV24;
const equipment_catalog_v23_1 = require("./equipment-catalog-v23");
const equipment_balance_v24_1 = require("./equipment-balance-v24");
const value = (stat, budget) => { const raw = budget * equipment_balance_v24_1.STAT_BUDGET_CONVERSION_V24[stat]; return equipment_balance_v24_1.STAT_BUDGET_CONVERSION_V24[stat] >= 1 ? Math.round(raw) : Number(raw.toFixed(5)); };
function baseStatsForPieceV24(piece, upgradeRank = 0) { const set = equipment_catalog_v23_1.EQUIPMENT_SETS_V23.find(v => v.id === piece.setId); if (!set)
    throw new Error(`unknown_set:${piece.setId}`); const stats = [piece.primaryStat, piece.secondaryStat, set.tertiaryStat], shares = [equipment_balance_v24_1.STAT_SHARE_V24.primary, equipment_balance_v24_1.STAT_SHARE_V24.secondary, equipment_balance_v24_1.STAT_SHARE_V24.tertiary]; const slotBudget = equipment_balance_v24_1.TIER_BASE_BUDGET_V24[piece.tier] * equipment_balance_v24_1.SLOT_BUDGET_MULTIPLIER_V24[piece.slot], mult = (0, equipment_balance_v24_1.exactUpgradeStatMultiplierV24)(upgradeRank); const lines = stats.map((label, i) => { const stat = equipment_balance_v24_1.STAT_LABEL_TO_KEY_V24[label]; if (!stat)
    throw new Error(`unknown_stat:${label}`); const budget = slotBudget * shares[i], base = value(stat, budget), upgraded = equipment_balance_v24_1.STAT_BUDGET_CONVERSION_V24[stat] >= 1 ? Math.round(base * mult) : Number((base * mult).toFixed(5)); return { stat, budget: Number(budget.toFixed(3)), baseValue: base, upgradedValue: upgraded }; }); return { pieceId: piece.id, upgradeRank, slotBudget: Number(slotBudget.toFixed(3)), lines }; }
function aggregateStatLinesV24(lines) { const out = { maxHp: 0, power: 0, armor: 0, ward: 0, accuracy: 0, evasion: 0, critRate: 0, critDamage: 0, haste: 0, tenacity: 0, penetration: 0, potency: 0 }; for (const l of lines)
    out[l.stat] = Number((out[l.stat] + l.value).toFixed(5)); return out; }
