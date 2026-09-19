"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equipment_craft_rarity_v26_1 = require("./equipment-craft-rarity-v26");
const equipment_exact_recipes_v27_1 = require("./equipment-exact-recipes-v27");
const equipment_acquisition_balance_v28_1 = require("./equipment-acquisition-balance-v28");
const ok = (v, m = 'assert') => { if (!v)
    throw new Error(m); };
const eq = (a, b, m = 'assert') => { if (a !== b)
    throw new Error(`${m}:${String(a)}!=${String(b)}`); };
const tiers = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'];
for (const t of tiers) {
    const c = (0, equipment_craft_rarity_v26_1.rarityChancesV26)(t, 1, 1, 0);
    for (let i = 0; i < equipment_craft_rarity_v26_1.GLOBAL_CRAFT_RARITY_V28.length; i++)
        ok(Math.abs(c[i].chance - equipment_craft_rarity_v26_1.GLOBAL_CRAFT_RARITY_V28[i].chance) < 1e-12, `global_odds_${t}_${i}`);
}
eq(equipment_craft_rarity_v26_1.GLOBAL_CRAFT_RARITY_V28.find(x => x.rarity === 'Mythic')?.chance, .001);
eq((0, equipment_craft_rarity_v26_1.rollCraftedRarityV26)({ tier: 'T9', professionLevel: 70, recipeMinProfessionLevel: 70, artisanInsight: 0, randomUnit: .99975 }), 'Mythic');
const maxMastery = (0, equipment_craft_rarity_v26_1.rarityChancesV26)('T1', 55, 1, 20);
ok(Math.abs((maxMastery.find(x => x.rarity === 'Mythic')?.chance ?? 0) - .001) < 1e-12, 'mythic_never_boosted');
eq((0, equipment_craft_rarity_v26_1.nextArtisanInsightV26)(19, 'Rare'), 20);
eq((0, equipment_craft_rarity_v26_1.nextArtisanInsightV26)(20, 'Epic'), 0);
for (const r of equipment_exact_recipes_v27_1.EXACT_PIECE_RECIPES_V27) {
    eq(r.finalAssembly.craftMinutes, (0, equipment_acquisition_balance_v28_1.targetFinalCraftMinutesV28)(r.tier, r.slot), `timer_${r.pieceId}`);
    const b = (0, equipment_acquisition_balance_v28_1.targetAcquisitionHoursV28)(r.tier, r.path, r.slot);
    ok(b.total > b.finalCraft, 'total_exceeds_timer');
    ok(Math.abs((b.skilling + b.combat + b.dungeon + b.finalCraft) - b.total) < 1e-9, 'split_sums');
}
console.log('equipment-v28 global rarity and acquisition-time tests passed');
