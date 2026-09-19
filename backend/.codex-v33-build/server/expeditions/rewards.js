"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.failureRewardFraction = failureRewardFraction;
exports.baseMarks = baseMarks;
exports.marksForRun = marksForRun;
exports.enhancedRewardEligible = enhancedRewardEligible;
exports.echoOwnerFullRewardEligible = echoOwnerFullRewardEligible;
const constants_1 = require("./constants");
function failureRewardFraction(state) {
    if (state.cleared)
        return constants_1.FAILURE_REWARD.clear;
    if (state.reachedFinalBoss && (state.finalBossHpFraction ?? 1) <= 0.25)
        return constants_1.FAILURE_REWARD.bossLow;
    if (state.reachedFinalBoss)
        return constants_1.FAILURE_REWARD.finalBoss;
    if (state.routeProgress >= 0.50)
        return constants_1.FAILURE_REWARD.half;
    if (state.routeProgress >= 0.25)
        return constants_1.FAILURE_REWARD.quarter;
    return constants_1.FAILURE_REWARD.early;
}
function baseMarks(mapBaseMarks, tier, objectiveMultiplier = 1) {
    return Math.round(mapBaseMarks * constants_1.EXPEDITION.marksMultiplier[tier] * objectiveMultiplier);
}
function marksForRun(mapBaseMarks, tier, state, objectiveMultiplier = 1, enhancedEligible = true) {
    const full = baseMarks(mapBaseMarks, tier, objectiveMultiplier);
    const frac = failureRewardFraction(state);
    const preCap = Math.round(full * frac);
    return enhancedEligible ? preCap : Math.round(preCap * constants_1.EXPEDITION.postCapMarksCoefficient);
}
function enhancedRewardEligible(dailyUsed, weeklyUsed) {
    return dailyUsed < constants_1.EXPEDITION.enhancedDaily && weeklyUsed < constants_1.EXPEDITION.enhancedWeekly;
}
function echoOwnerFullRewardEligible(dailyUsed, weeklyUsed) {
    return dailyUsed < constants_1.EXPEDITION.echoOwnerDaily && weeklyUsed < constants_1.EXPEDITION.echoOwnerWeekly;
}
