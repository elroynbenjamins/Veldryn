"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyTargetTierV24 = legacyTargetTierV24;
exports.legacyConversionOptionsV24 = legacyConversionOptionsV24;
exports.buildLegacyConversionV24 = buildLegacyConversionV24;
const equipment_catalog_v23_1 = require("./equipment-catalog-v23");
const equipment_customization_v24_1 = require("./equipment-customization-v24");
const equipment_upgrades_v24_1 = require("./equipment-upgrades-v24");
function legacyTargetTierV24(level) { if (level <= 12)
    return 'T2'; if (level <= 18)
    return 'T3'; return 'T4'; }
function legacyConversionOptionsV24(v) { const tier = legacyTargetTierV24(v.requiredLevel); return ['Foundation', 'Specialist', 'Alternate'].map(path => { const set = equipment_catalog_v23_1.EQUIPMENT_SETS_V23.find(s => s.tier === tier && s.className === v.className && s.path === path); if (!set)
    throw new Error(`missing_target_set:${tier}:${v.className}:${path}`); const piece = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.find(p => p.setId === set.id && p.slot === v.slot); if (!piece)
    throw new Error(`missing_target_piece:${set.id}:${v.slot}`); return { path, setId: set.id, pieceId: piece.id, pieceName: piece.name }; }); }
function buildLegacyConversionV24(v, path) { const target = legacyConversionOptionsV24(v).find(x => x.path === path); const tier = legacyTargetTierV24(v.requiredLevel); return { legacyInstanceId: v.legacyInstanceId, targetPieceId: target.pieceId, preservedUpgradeRank: Math.min(v.upgradeRank, (0, equipment_upgrades_v24_1.maxUpgradeRankV24)(tier)), preserveStatGem: !!v.statGemId && (0, equipment_customization_v24_1.statGemSocketUnlockedV24)(tier) && !!v.statGemRank && v.statGemRank <= (0, equipment_customization_v24_1.maxGemRankV24)(tier), preserveEffectGem: !!v.effectGemId && (0, equipment_customization_v24_1.effectGemSocketUnlockedV24)(tier) && !!v.effectGemRank && v.effectGemRank <= (0, equipment_customization_v24_1.maxGemRankV24)(tier), preserveEnchant: !!v.enchantId && !!v.enchantRank && v.enchantRank <= (0, equipment_customization_v24_1.maxEnchantRankV24)(tier), grantsFirstCraftCredit: true, characterBound: true, ignoreLegacyTradableOrMarketFields: true }; }
