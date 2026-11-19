"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dungeonBossVariantsFor = exports.DUNGEON_BOSS_VARIANTS = exports.DUNGEON_BOSS_REWARD_RATES = void 0;
exports.publishedDungeonBossVariants = publishedDungeonBossVariants;
exports.DUNGEON_BOSS_REWARD_RATES = Object.freeze({ rawGemPercent: 18, recipePercent: 8, catalystPercent: 15, gemPityClears: 8 });
exports.DUNGEON_BOSS_VARIANTS = Object.freeze({
    EXP_001: [
        { bossId: 'BOSS_EXP_ROOT', name: 'Rootbound Heart', gemFamilies: ['effect_bulwark', 'effect_renewal', 'effect_unyielding', 'stat_vitality'] },
        { bossId: 'BOSS_EXP_BELL', name: 'Bell-Warden', gemFamilies: ['effect_bulwark', 'effect_ruin', 'effect_execution', 'stat_vitality'] },
    ],
    EXP_003: [
        { bossId: 'BOSS_EXP_SOLAR', name: 'The Buried Heliarch', gemFamilies: ['effect_momentum', 'effect_critical_surge', 'effect_retaliation', 'stat_precision'] },
        { bossId: 'BOSS_EXP_SPHINX', name: 'The Veiled Sphinx', gemFamilies: ['effect_momentum', 'effect_flow', 'effect_benediction', 'stat_precision'] },
    ],
    EXP_005: [
        { bossId: 'BOSS_EXP_BELLBEAST', name: 'The Bellbeast of Shiverlake', gemFamilies: ['effect_aegis', 'effect_unyielding', 'effect_guardians_gift', 'stat_resolute'] },
        { bossId: 'BOSS_EXP_CANTOR', name: 'The Frozen Cantor', gemFamilies: ['effect_shared_resolve', 'effect_battle_rhythm', 'effect_renewal', 'stat_ward'] },
    ],
    EXP_007: [
        { bossId: 'BOSS_EXP_FEN', name: 'The Blackglass Fen Prime', gemFamilies: ['effect_predator', 'effect_execution', 'effect_ruin', 'stat_savage'] },
        { bossId: 'BOSS_EXP_PRIME', name: 'The Crucible Prime', gemFamilies: ['effect_bulwark', 'effect_aegis', 'effect_retaliation', 'stat_iron'] },
    ],
});
const dungeonBossVariantsFor = (expeditionId) => exports.DUNGEON_BOSS_VARIANTS[expeditionId] ?? [];
exports.dungeonBossVariantsFor = dungeonBossVariantsFor;
function publishedDungeonBossVariants(expeditionId) {
    const bosses = (0, exports.dungeonBossVariantsFor)(expeditionId);
    return bosses.map(boss => ({ ...boss, chancePercent: 100 / bosses.length, ...exports.DUNGEON_BOSS_REWARD_RATES }));
}
