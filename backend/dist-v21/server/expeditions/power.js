"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleQualityMultiplier = roleQualityMultiplier;
exports.partyPowerIndex = partyPowerIndex;
exports.expeditionDifficultyIndex = expeditionDifficultyIndex;
exports.encounterWinScore = encounterWinScore;
const constants_1 = require("./constants");
function roleQualityMultiplier(roles) {
    const tanks = roles.filter(r => r === 'tank').length;
    const damage = roles.filter(r => r === 'damage').length;
    const support = roles.filter(r => r === 'support').length;
    if (tanks >= 1 && damage >= 2 && support >= 1)
        return 1.00;
    if (tanks >= 1 && damage >= 1 && support >= 2)
        return 0.95;
    if (tanks >= 2 && damage >= 1 && support >= 1)
        return 0.92;
    if (tanks >= 1 && damage >= 3 && support === 0)
        return 0.91;
    if (tanks === 0 && damage >= 2 && support >= 2)
        return 0.86;
    if (tanks === 0 && damage === 4)
        return 0.76;
    return 0.82;
}
function partyPowerIndex(syncedPlayerPower, roles, mechanicReadinessMultiplier = 1) {
    const avg = syncedPlayerPower.reduce((a, b) => a + b, 0) / Math.max(1, syncedPlayerPower.length);
    return avg * roleQualityMultiplier(roles) * mechanicReadinessMultiplier;
}
function expeditionDifficultyIndex(tier, mutatorMultiplier = 1, regionalMechanicMultiplier = 1, routeRiskMultiplier = 1) {
    return constants_1.EXPEDITION.difficultyIndex[tier] * mutatorMultiplier * regionalMechanicMultiplier * routeRiskMultiplier;
}
function encounterWinScore(partyPower, difficulty, executionScore, boonSynergyMultiplier) {
    return (partyPower / Math.max(0.001, difficulty)) * executionScore * boonSynergyMultiplier;
}
