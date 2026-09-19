"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clamp = void 0;
exports.effectiveContentLevel = effectiveContentLevel;
exports.syncedPrimaryStat = syncedPrimaryStat;
exports.attackPower = attackPower;
exports.defenseMitigation = defenseMitigation;
exports.hitChance = hitChance;
exports.critChance = critChance;
exports.damageAfterMitigation = damageAfterMitigation;
exports.healAmount = healAmount;
exports.shieldAmount = shieldAmount;
exports.capUnitContribution = capUnitContribution;
const constants_1 = require("../expeditions/constants");
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
exports.clamp = clamp;
function effectiveContentLevel(characterLevel, contentSyncCap) {
    return Math.min(characterLevel, contentSyncCap);
}
function syncedPrimaryStat(baseStat, syncScale, eligibleFlatStat) {
    return baseStat * syncScale + eligibleFlatStat;
}
function attackPower(classAttackBase, weaponPower, primaryStat, classPrimaryCoeff) {
    return classAttackBase + weaponPower + primaryStat * classPrimaryCoeff;
}
function defenseMitigation(defense, mitigationConstant) {
    const raw = defense / Math.max(1, defense + mitigationConstant);
    return (0, exports.clamp)(raw, constants_1.COMBAT_LIMITS.mitigationMin, constants_1.COMBAT_LIMITS.mitigationMax);
}
function hitChance(accuracy, evasion, accuracyScale) {
    return (0, exports.clamp)(0.75 + (accuracy - evasion) / accuracyScale, constants_1.COMBAT_LIMITS.hitChanceMin, constants_1.COMBAT_LIMITS.hitChanceMax);
}
function critChance(baseCrit, critRating, critScale, cap = constants_1.COMBAT_LIMITS.critChanceCap) {
    return (0, exports.clamp)(baseCrit + critRating / critScale, 0, cap);
}
function damageAfterMitigation(attackPowerValue, abilityCoeff, mitigation, variance, crit = false, critMultiplier = constants_1.COMBAT_LIMITS.defaultCritMultiplier) {
    const varianceClamped = (0, exports.clamp)(variance, constants_1.COMBAT_LIMITS.damageVarianceMin, constants_1.COMBAT_LIMITS.damageVarianceMax);
    const normal = Math.max(1, attackPowerValue * abilityCoeff * varianceClamped * (1 - mitigation));
    return crit ? normal * critMultiplier : normal;
}
function healAmount(healingPower, healCoeff, healingReceivedMult = 1) {
    return Math.max(0, healingPower * healCoeff * healingReceivedMult);
}
function shieldAmount(shieldPower, shieldCoeff, shieldReceivedMult = 1) {
    return Math.max(0, shieldPower * shieldCoeff * shieldReceivedMult);
}
function capUnitContribution(unitOutput, ownerBaselineOutput, capPct) {
    return Math.min(unitOutput, ownerBaselineOutput * capPct);
}
