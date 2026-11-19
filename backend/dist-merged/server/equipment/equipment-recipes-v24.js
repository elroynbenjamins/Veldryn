"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recipeForPieceV24 = recipeForPieceV24;
exports.fullSetStorySupportGrantV24 = fullSetStorySupportGrantV24;
const equipment_catalog_v23_1 = require("./equipment-catalog-v23");
const equipment_material_profiles_v23_1 = require("./equipment-material-profiles-v23");
const equipment_balance_v24_1 = require("./equipment-balance-v24");
const normalize = (k) => ({
    'frostmarch.frozen_heart': 'frostmarch.frozen_heart_fragment', 'frostmarch.frost_wyrm_scale_cache': 'frostmarch.wyrm_scale_cache_token', 'sunscar.sand_tyrant_seal': 'sunscar.tyrant_seal_fragment'
}[k] ?? k);
function recipeForPieceV24(piece) { const units = Math.max(1, Math.round(equipment_balance_v24_1.TIER_RECIPE_UNITS_V24[piece.tier] * equipment_balance_v24_1.SLOT_BUDGET_MULTIPLIER_V24[piece.slot])), share = equipment_balance_v24_1.RECIPE_SHARE_V24[piece.tier], profile = (0, equipment_material_profiles_v23_1.materialProfileV23)(piece.tier, piece.path); const req = []; const add = (role, key, p) => { if (!key || p <= 0)
    return; const quantity = Math.max(1, Math.round(units * p)); req.push({ role, materialKey: normalize(key), quantity, guaranteedSource: true, ...(role === 'dungeonBoss' ? { expectedYieldPerEligibleClear: (piece.tier === 'T9' ? [5, 7] : [4, 6]) } : {}) }); }; add('regionalCommon', profile.regionalCommon, share.regionalCommon); add('processed', profile.processed, share.processed); add('monsterSpecific', profile.monsterSpecific, share.monsterSpecific); add('dungeonBoss', profile.dungeonBoss, share.dungeonBoss); const boss = req.find(v => v.role === 'dungeonBoss'); let estimatedBossClears; if (boss?.expectedYieldPerEligibleClear) {
    const [lo, hi] = boss.expectedYieldPerEligibleClear;
    estimatedBossClears = [Math.ceil(boss.quantity / hi), Math.ceil(boss.quantity / lo)];
} return { pieceId: piece.id, tier: piece.tier, craftMinutes: (0, equipment_balance_v24_1.finalCraftMinutesV24)(piece.tier, piece.slot), requirements: req, estimatedBossClears }; }
function fullSetStorySupportGrantV24(tier, className) { const foundation = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.filter(p => p.tier === tier && p.className === className && p.path === 'Foundation'); if (foundation.length !== 7)
    throw new Error(`foundation_set_missing:${tier}:${className}`); const totals = new Map(); for (const p of foundation) {
    for (const r of recipeForPieceV24(p).requirements.filter(v => v.role === 'regionalCommon' || v.role === 'processed'))
        totals.set(r.materialKey, (totals.get(r.materialKey) ?? 0) + r.quantity);
} return [...totals].map(([materialKey, q]) => ({ materialKey, quantity: Math.max(1, Math.round(q * .15)) })); }
