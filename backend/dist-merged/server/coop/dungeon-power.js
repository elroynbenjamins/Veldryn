"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dungeonPowerIndex = dungeonPowerIndex;
exports.recommendedDungeonPower = recommendedDungeonPower;
const content_1 = require("../companions/content");
/**
 * Server-owned measure of a frozen co-op loadout.  It intentionally uses the
 * same inputs that are committed to a run, rather than a value supplied by a
 * device.  It is a matchmaking/recommendation aid, never a substitute for the
 * role-readiness and encounter checks.
 */
function dungeonPowerIndex(input) {
    const stats = input.normalized.snapshot;
    const player = Math.max(1, Math.round(stats.attackPower * 18 + stats.healingPower * 14 + stats.defense * 11 + stats.maxHp * .7 + stats.level * 12 +
        stats.critChance * 220 + stats.accuracy * 45 + stats.evasion * 50 + stats.haste * 150));
    const progress = input.companion;
    const definition = progress ? (0, content_1.companionServerDefinition)(progress.companionId) : undefined;
    if (!definition || !progress)
        return player;
    const growth = 1 + (progress.level - 1) * .025 + progress.ascensionTier * .10 + progress.bondLevel * .01;
    const companion = (definition.baseStats.power * 18 + definition.baseStats.defense * 10 + definition.baseStats.hp * .3) * growth * content_1.COMPANION_RARITY_TARGET[definition.rarity];
    // An assist is deliberately budgeted below a full party member, but it has a
    // meaningful impact on the group a player is matched with.
    return Math.round(player + companion + player * .09);
}
/** Recommended personal score for the co-op catalogue.  Falling short warns a
 * player; role readiness and legal loadout checks remain the hard admission
 * rules. */
function recommendedDungeonPower(minLevel) {
    if (!Number.isInteger(minLevel) || minLevel < 1)
        throw new Error('invalid_dungeon_level');
    return Math.round(700 + minLevel * 520);
}
