"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combatantFromVerifiedSnapshot = combatantFromVerifiedSnapshot;
const constants_1 = require("../expeditions/constants");
const character_assist_1 = require("../companions/character-assist");
/** Converts a server-built/snapshotted character into engine state.
 * Never call with arbitrary client JSON. The snapshot must have been verified
 * against inventory/equipment/content tables during run creation.
 */
function combatantFromVerifiedSnapshot(s, abilities) {
    if (!Number.isInteger(s.level) || s.level < 1 || s.level > 100)
        throw new Error('invalid_snapshot_level');
    if ([s.maxHp, s.attackPower, s.healingPower, s.defense, s.accuracy, s.evasion, s.critChance, s.haste, s.critMultiplier ?? constants_1.COMBAT_LIMITS.defaultCritMultiplier].some(value => !Number.isFinite(value)) || s.maxHp <= 0 || [s.attackPower, s.healingPower, s.defense, s.accuracy, s.evasion].some(value => value < 0))
        throw new Error('invalid_snapshot_stats');
    return (0, character_assist_1.applyCharacterCompanionAssist)({
        id: s.characterId, classId: s.classId, name: s.displayName || s.classId, team: 'players', role: s.role, level: s.level,
        stats: { maxHp: s.maxHp, attackPower: s.attackPower, healingPower: s.healingPower, defense: s.defense, accuracy: s.accuracy, evasion: s.evasion, critChance: Math.max(0, Math.min(constants_1.COMBAT_LIMITS.critChanceCap, s.critChance)), critMultiplier: Math.max(1, Math.min(3, s.critMultiplier ?? constants_1.COMBAT_LIMITS.defaultCritMultiplier)), haste: Math.max(-.25, Math.min(.75, s.haste)) },
        basicAttackMs: 2400, basicAttackCoeff: .70, abilities, tags: s.bodyPresentation ? [`body:${s.bodyPresentation}`] : [], effectGems: s.effectGems,
    }, s.combatCompanion);
}
