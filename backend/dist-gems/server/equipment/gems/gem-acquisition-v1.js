"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESONANCE_CACHE_V1 = exports.GEM_RECIPE_DUPLICATE_CONVERSION_DUST_V1 = exports.GEM_SOURCE_POOLS_V1 = void 0;
exports.gemPoolForSourceV1 = gemPoolForSourceV1;
exports.buildGemDropsForSourceV1 = buildGemDropsForSourceV1;
exports.gemRecipeKnowledgeIdV1 = gemRecipeKnowledgeIdV1;
exports.settleGemSourceV1 = settleGemSourceV1;
exports.validateGemAcquisitionV1 = validateGemAcquisitionV1;
const deterministic_rng_1 = require("../../combat/deterministic-rng");
const gem_catalog_v1_1 = require("./gem-catalog-v1");
exports.GEM_SOURCE_POOLS_V1 = [
    { id: 'ZONE_006', kind: 'enemy', regionId: 'REG_002', families: ['stat_might', 'stat_vitality', 'effect_opening_strike', 'effect_sustenance'], grade: 1, chance: .0075 },
    { id: 'ZONE_007', kind: 'elite', regionId: 'REG_002', families: ['stat_iron', 'stat_piercing', 'effect_predator', 'effect_retaliation'], grade: 2, chance: .015, pityAt: 60 },
    { id: 'ZONE_008', kind: 'elite', regionId: 'REG_002', families: ['stat_precision', 'stat_potent', 'effect_ruin', 'effect_mercy', 'effect_opportunist'], grade: 2, chance: .015, pityAt: 60 },
    { id: 'ZONE_009', kind: 'elite', regionId: 'REG_002', families: ['stat_swift', 'stat_ward', 'effect_flow', 'effect_benediction', 'effect_aegis'], grade: 2, chance: .015, pityAt: 60 },
    { id: 'ZONE_010', kind: 'regional_boss', regionId: 'REG_002', families: ['effect_execution', 'effect_last_stand', 'effect_unyielding'], grade: 3, chance: .03, pityAt: 25, recipeChance: .02, catalystChance: .05 },
    { id: 'COP_004', kind: 'dungeon_boss', regionId: 'REG_002', families: ['effect_bulwark', 'effect_retaliation', 'effect_predator', 'stat_iron'], grade: 3, chance: .18, pityAt: 8, recipeChance: .08, catalystChance: .15 },
    { id: 'COP_005', kind: 'dungeon_boss', regionId: 'REG_002', families: ['effect_mercy', 'effect_ruin', 'effect_opportunist', 'stat_precision', 'stat_potent'], grade: 3, chance: .18, pityAt: 8, recipeChance: .08, catalystChance: .15 },
    { id: 'COP_006', kind: 'dungeon_boss', regionId: 'REG_002', families: ['effect_flow', 'effect_benediction', 'effect_critical_surge', 'stat_swift', 'stat_ward'], grade: 3, chance: .18, pityAt: 8, recipeChance: .08, catalystChance: .15 },
    { id: 'COP_007', kind: 'dungeon_boss', regionId: 'REG_003', families: ['effect_momentum', 'effect_predator', 'effect_sustenance', 'stat_keen'], grade: 3, chance: .18, pityAt: 8, recipeChance: .08, catalystChance: .15 },
    { id: 'COP_008', kind: 'dungeon_boss', regionId: 'REG_003', families: ['effect_aegis', 'effect_guardians_gift', 'effect_unyielding', 'stat_vitality', 'stat_resolute'], grade: 3, chance: .18, pityAt: 8, recipeChance: .08, catalystChance: .15 },
    { id: 'COP_009', kind: 'dungeon_boss', regionId: 'REG_003', families: ['effect_execution', 'effect_shared_resolve', 'effect_battle_rhythm', 'effect_renewal', 'stat_savage'], grade: 3, chance: .18, pityAt: 8, recipeChance: .08, catalystChance: .15 },
    { id: 'PARTY_CONTRACT_WEEKLY', kind: 'party_contract', families: ['effect_momentum', 'effect_execution', 'effect_bulwark', 'effect_mercy', 'effect_flow', 'effect_opportunist'], grade: 3, chance: .25, pityAt: 4, catalystChance: .20 },
    { id: 'LIVE_COOP_RESONANCE_CACHE', kind: 'live_coop_weekly', families: ['effect_momentum', 'effect_execution', 'effect_opening_strike', 'effect_predator', 'effect_critical_surge', 'effect_ruin', 'effect_bulwark', 'effect_aegis', 'effect_last_stand', 'effect_retaliation', 'effect_unyielding', 'effect_mercy', 'effect_benediction', 'effect_guardians_gift', 'effect_renewal', 'effect_shared_resolve', 'effect_sustenance', 'effect_battle_rhythm', 'effect_flow', 'effect_opportunist'], grade: 3, chance: 1 },
];
exports.GEM_RECIPE_DUPLICATE_CONVERSION_DUST_V1 = 25;
exports.RESONANCE_CACHE_V1 = { requiredLiveClears: 3, dustMin: 25, dustMax: 40, regionalCatalystGuaranteed: 1, effectChoices: 3, radiantCatalystLateGameChance: .05 };
function gemPoolForSourceV1(sourceId) { return exports.GEM_SOURCE_POOLS_V1.find(v => v.id === sourceId); }
function buildGemDropsForSourceV1(sourceId) {
    const p = gemPoolForSourceV1(sourceId);
    if (!p)
        return [];
    const perFamily = p.chance / p.families.length;
    // Preview rows only. Production pity is source-level so a pity hit awards exactly one family.
    return p.families.map(f => ({ itemId: (0, gem_catalog_v1_1.rawGemItemId)(f, p.grade), chance: perFamily, min: 1, max: 1 }));
}
function gemRecipeKnowledgeIdV1(familyId) { return 'recipe_gem_' + familyId.replace(/^effect_|^stat_/, ''); }
/** Canonical production roll: one source pity counter, one family on a hit, deterministic retry-safe rolls. */
function settleGemSourceV1(sourceId, seed, progress) {
    const pool = gemPoolForSourceV1(sourceId);
    if (!pool)
        throw new Error('unknown_gem_source');
    const rng = new deterministic_rng_1.CombatRng(seed), before = Math.max(0, Math.floor(progress.pityBySource[sourceId] ?? 0));
    const pityTriggered = Boolean(pool.pityAt && before + 1 >= pool.pityAt);
    const hit = pityTriggered || rng.next('gem:' + sourceId + ':drop') < pool.chance;
    const pityBySource = { ...progress.pityBySource };
    if (pool.pityAt)
        pityBySource[sourceId] = hit ? 0 : before + 1;
    const familyId = hit ? rng.pick([...pool.families], 'gem:' + sourceId + ':family') : undefined;
    const effectFamilies = pool.families.filter(family => family.startsWith('effect_'));
    let recipeUnlockedId, duplicateRecipeDust = 0;
    if (pool.recipeChance && effectFamilies.length && rng.next('gem:' + sourceId + ':recipe') < pool.recipeChance) {
        const recipeFamily = rng.pick([...effectFamilies], 'gem:' + sourceId + ':recipe-family'), recipeId = gemRecipeKnowledgeIdV1(recipeFamily);
        if (progress.unlockedRecipeIds.includes(recipeId))
            duplicateRecipeDust = exports.GEM_RECIPE_DUPLICATE_CONVERSION_DUST_V1;
        else
            recipeUnlockedId = recipeId;
    }
    const regionalCatalysts = pool.catalystChance && rng.next('gem:' + sourceId + ':catalyst') < pool.catalystChance ? 1 : 0;
    return { sourceId, gem: familyId ? { familyId, grade: pool.grade, itemId: (0, gem_catalog_v1_1.rawGemItemId)(familyId, pool.grade), pityTriggered } : undefined, pityBySource, recipeUnlockedId, duplicateRecipeDust, regionalCatalysts };
}
function validateGemAcquisitionV1() { const errors = []; for (const p of exports.GEM_SOURCE_POOLS_V1) {
    if (!p.families.length)
        errors.push(`${p.id}:empty`);
    if (p.chance < 0 || p.chance > 1)
        errors.push(`${p.id}:chance`);
} return errors; }
