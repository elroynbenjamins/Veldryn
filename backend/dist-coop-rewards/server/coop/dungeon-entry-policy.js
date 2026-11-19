"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DUNGEON_CHAPTER_ONE_BOSS = exports.DUNGEON_UNLOCK_LEVEL = void 0;
exports.publishedRegularDungeon = publishedRegularDungeon;
exports.listedRegularDungeon = listedRegularDungeon;
exports.regularDungeonTierRequiredLevel = regularDungeonTierRequiredLevel;
exports.regularDungeonTierRequiredPower = regularDungeonTierRequiredPower;
exports.highestEligibleRegularDungeonTier = highestEligibleRegularDungeonTier;
exports.regularDungeonReadyTier = regularDungeonReadyTier;
exports.defeatedDungeonChapterBoss = defeatedDungeonChapterBoss;
exports.regularDungeonEntryError = regularDungeonEntryError;
exports.regularDungeonLockedReason = regularDungeonLockedReason;
const config_1 = require("./config");
/** Requirements refer to the character-sheet Combat Power rating, not the
 * separate normalized Dungeon Power metric used for matchmaking similarity. */
exports.DUNGEON_UNLOCK_LEVEL = 10;
exports.DUNGEON_CHAPTER_ONE_BOSS = 'FALLEN_KNIGHT';
const DUNGEON_REQUIREMENTS = Object.freeze({
    EXP_001: { minLevel: 10, powers: [2500, 3750, 5000], requiresChapterOne: false },
    EXP_003: { minLevel: 25, powers: [6000, 7250, 8500], requiresChapterOne: true },
});
const DEVELOPMENT_DUNGEONS = new Set(['EXP_005', 'EXP_007']);
function publishedRegularDungeon(def) { return def.coopImplemented && Boolean(DUNGEON_REQUIREMENTS[def.id]); }
function listedRegularDungeon(def) { return publishedRegularDungeon(def) || DEVELOPMENT_DUNGEONS.has(def.id); }
function regularDungeonTierRequiredLevel(def, tier) {
    if (!config_1.PUBLISHED_COOP_TIERS.some(value => value === tier))
        return (0, config_1.coopRequiredLevel)(def.minLevel, tier); // legacy tier 4/5 saved-run fixtures
    return DUNGEON_REQUIREMENTS[def.id]?.minLevel ?? Math.max(exports.DUNGEON_UNLOCK_LEVEL, def.minLevel);
}
function regularDungeonTierRequiredPower(def, tier) {
    if (!config_1.PUBLISHED_COOP_TIERS.some(value => value === tier))
        return 0; // new entries reject 4/5 separately
    return DUNGEON_REQUIREMENTS[def.id]?.powers[tier - 1] ?? 0;
}
function highestEligibleRegularDungeonTier(def, level, combatPower = 0) {
    if (!publishedRegularDungeon(def) || !Number.isInteger(level))
        return undefined;
    return [...config_1.PUBLISHED_COOP_TIERS].reverse().find(tier => level >= regularDungeonTierRequiredLevel(def, tier) && combatPower >= regularDungeonTierRequiredPower(def, tier));
}
function regularDungeonReadyTier(def, level, normalizedScore, combatPower = 0) {
    if (!Number.isFinite(normalizedScore) || normalizedScore < config_1.COOP_ROGUELITE_CONFIG.normalizedReadinessFloor)
        return undefined;
    return highestEligibleRegularDungeonTier(def, level, combatPower);
}
function defeatedDungeonChapterBoss(state) {
    return Array.isArray(state?.defeatedBossIds) && state.defeatedBossIds.includes(exports.DUNGEON_CHAPTER_ONE_BOSS);
}
function regularDungeonEntryError(def, state, characterLevel, combatPower = 0, tier = 1) {
    const rule = DUNGEON_REQUIREMENTS[def.id];
    if (!publishedRegularDungeon(def) || !rule)
        return 'dungeon_unavailable';
    if (!Number.isInteger(characterLevel) || characterLevel < regularDungeonTierRequiredLevel(def, tier))
        return 'dungeon_level_requirement';
    if (rule.requiresChapterOne && !defeatedDungeonChapterBoss(state))
        return 'chapter_one_required';
    if (combatPower < regularDungeonTierRequiredPower(def, tier) || (!Number.isFinite(combatPower) && combatPower !== Number.POSITIVE_INFINITY))
        return 'dungeon_power_requirement';
    return undefined;
}
function regularDungeonLockedReason(def, state, level, combatPower = 0) {
    const error = regularDungeonEntryError(def, state, level, combatPower);
    if (!error)
        return undefined;
    if (error === 'dungeon_unavailable')
        return DEVELOPMENT_DUNGEONS.has(def.id) || def.region === 'Ashlands' ? 'In Development' : 'No longer available for new runs';
    if (error === 'dungeon_level_requirement')
        return `Requires level ${regularDungeonTierRequiredLevel(def, 1)}`;
    if (error === 'dungeon_power_requirement')
        return `Requires ${regularDungeonTierRequiredPower(def, 1).toLocaleString('en-US')} Combat Power`;
    return 'Defeat the Fallen Knight (Chapter I) to unlock Sunscar dungeons.';
}
