"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_STAT_GEM_ADAPTER_V24 = void 0;
exports.statGemSocketUnlockedV24 = statGemSocketUnlockedV24;
exports.effectGemSocketUnlockedV24 = effectGemSocketUnlockedV24;
exports.maxGemRankV24 = maxGemRankV24;
exports.maxEnchantRankV24 = maxEnchantRankV24;
exports.statGemAdditionV24 = statGemAdditionV24;
exports.enchantAdditionV24 = enchantAdditionV24;
exports.validateEffectGemV24 = validateEffectGemV24;
const n = (t) => Number(t.slice(1));
const MAX_GEM = { T1: 0, T2: 1, T3: 2, T4: 2, T5: 3, T6: 3, T7: 4, T8: 4, T9: 5 };
const MAX_ENCHANT = { T1: 0, T2: 1, T3: 2, T4: 2, T5: 3, T6: 3, T7: 4, T8: 4, T9: 5 };
function statGemSocketUnlockedV24(tier) { return n(tier) >= 2; }
function effectGemSocketUnlockedV24(tier) { return n(tier) >= 3; }
function maxGemRankV24(tier) { return MAX_GEM[tier]; }
function maxEnchantRankV24(tier) { return MAX_ENCHANT[tier]; }
const vals = (a, rank) => { if (rank < 1 || rank > a.length)
    throw new Error('bad_rank'); return a[rank - 1]; };
exports.LEGACY_STAT_GEM_ADAPTER_V24 = {
    GSTAT_001: { stat: 'power', values: [2, 3, 4, 6, 8] }, GSTAT_002: { stat: 'ward', values: [2, 3, 5, 7, 9] }, GSTAT_003: { stat: 'armor', values: [2, 3, 5, 7, 9] }, GSTAT_004: { stat: 'maxHp', values: [5, 8, 12, 17, 23] }, GSTAT_005: { stat: 'haste', values: [.01, .015, .022, .03, .04] }, GSTAT_006: { stat: 'accuracy', values: [2, 3, 5, 7, 10] }, GSTAT_007: { stat: 'potency', values: [.02, .03, .045, .06, .08] }, GSTAT_008: { stat: 'penetration', values: [2, 3, 5, 7, 10] }
};
const ENCHANTS = {
    ENC_001: { stat: 'ward', values: [1, 2, 3, 4, 5], slots: ['Helmet', 'Chest', 'Legs'], minTier: 2 }, ENC_002: { stat: 'armor', values: [1, 2, 3, 4, 5], slots: ['Helmet', 'Chest', 'Legs', 'Off-hand'], minTier: 2 }, ENC_003: { stat: 'maxHp', values: [3, 6, 9, 12, 15], slots: ['Helmet', 'Chest', 'Gloves', 'Legs', 'Boots'], minTier: 2 }, ENC_004: { stat: 'critRate', values: [.01, .015, .02, .025, .03], slots: ['Weapon', 'Gloves'], minTier: 2 }, ENC_005: { stat: 'haste', values: [.01, .02, .03, .04, .05], slots: ['Weapon', 'Gloves', 'Boots'], minTier: 2 }, ENC_006: { slots: [], minTier: 3, dormant: true }
};
function statGemAdditionV24(piece, gemId, rank) { if (!gemId)
    return undefined; if (!statGemSocketUnlockedV24(piece.tier))
    throw new Error('stat_gem_socket_locked'); if (!rank || rank > maxGemRankV24(piece.tier))
    throw new Error('stat_gem_rank_too_high'); const d = exports.LEGACY_STAT_GEM_ADAPTER_V24[gemId]; if (!d)
    throw new Error('unknown_stat_gem'); return { stat: d.stat, value: vals(d.values, rank) }; }
function enchantAdditionV24(piece, enchantId, rank) { if (!enchantId)
    return undefined; const d = ENCHANTS[enchantId]; if (!d)
    throw new Error('unknown_enchant'); if (d.dormant)
    throw new Error('enchant_dormant_no_compatible_slot'); if (n(piece.tier) < d.minTier)
    throw new Error('enchant_tier_locked'); if (!d.slots.includes(piece.slot))
    throw new Error('enchant_slot_incompatible'); if (!rank || rank > maxEnchantRankV24(piece.tier) || !d.values || !d.stat)
    throw new Error('enchant_rank_too_high'); return { stat: d.stat, value: vals(d.values, rank) }; }
function validateEffectGemV24(piece, gemId, rank) { if (!gemId)
    return; if (!effectGemSocketUnlockedV24(piece.tier))
    throw new Error('effect_gem_socket_locked'); if (!rank || rank > maxGemRankV24(piece.tier))
    throw new Error('effect_gem_rank_too_high'); if (!/^GEFF_\d+$/.test(gemId))
    throw new Error('unknown_effect_gem'); }
