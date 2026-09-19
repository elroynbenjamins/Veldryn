"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveInstanceV26 = deriveInstanceV26;
const equipment_catalog_v23_1 = require("./equipment-catalog-v23");
const equipment_stat_budget_v24_1 = require("./equipment-stat-budget-v24");
const equipment_customization_v24_1 = require("./equipment-customization-v24");
const equipment_craft_rarity_v26_1 = require("./equipment-craft-rarity-v26");
function deriveInstanceV26(v) { const piece = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.find(p => p.id === v.pieceId); if (!piece)
    throw new Error('unknown_piece'); const rm = equipment_craft_rarity_v26_1.RARITY_STAT_MULT_V26[v.rarity]; const base = (0, equipment_stat_budget_v24_1.baseStatsForPieceV24)(piece, v.upgradeRank).lines.map(l => ({ stat: l.stat, value: l.upgradedValue * rm })); const e = (0, equipment_customization_v24_1.enchantAdditionV24)(piece, v.enchantId, v.enchantRank), g = (0, equipment_customization_v24_1.statGemAdditionV24)(piece, v.statGemId, v.statGemRank); if (e)
    base.push(e); if (g)
    base.push(g); (0, equipment_customization_v24_1.validateEffectGemV24)(piece, v.effectGemId, v.effectGemRank); return { instance: v, slot: piece.slot, pieceName: piece.name, setId: piece.setId, stats: (0, equipment_stat_budget_v24_1.aggregateStatLinesV24)(base), rarityMultiplier: rm, effectGemId: v.effectGemId }; }
