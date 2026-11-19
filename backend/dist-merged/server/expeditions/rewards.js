"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V48_DUNGEON_REWARD_TUNING = void 0;
exports.failureRewardFraction = failureRewardFraction;
exports.baseMarks = baseMarks;
exports.clearRewardMultiplier = clearRewardMultiplier;
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
exports.V48_DUNGEON_REWARD_TUNING = {
    firstClearMultiplier: 1.25,
    cleanClearMultiplier: 1.10,
    maxCombinedClearMultiplier: 1.35,
    nearBossFailureFraction: 0.50,
};
function clearRewardMultiplier(input = {}) {
    let multiplier = 1;
    if (input.firstClear)
        multiplier *= exports.V48_DUNGEON_REWARD_TUNING.firstClearMultiplier;
    if (input.cleanClear)
        multiplier *= exports.V48_DUNGEON_REWARD_TUNING.cleanClearMultiplier;
    return Math.min(exports.V48_DUNGEON_REWARD_TUNING.maxCombinedClearMultiplier, multiplier);
}
function marksForRun(mapBaseMarks, tier, state, objectiveMultiplier = 1, enhancedEligible = true, clearBonus = {}) {
    const full = baseMarks(mapBaseMarks, tier, objectiveMultiplier);
    const frac = failureRewardFraction(state);
    const mastery = state.cleared ? clearRewardMultiplier(clearBonus) : 1;
    const preCap = Math.round(full * frac * mastery);
    return enhancedEligible ? preCap : Math.round(preCap * constants_1.EXPEDITION.postCapMarksCoefficient);
}
function enhancedRewardEligible(dailyUsed, weeklyUsed) {
    return dailyUsed < constants_1.EXPEDITION.enhancedDaily && weeklyUsed < constants_1.EXPEDITION.enhancedWeekly;
}
function echoOwnerFullRewardEligible(dailyUsed, weeklyUsed) {
    return dailyUsed < constants_1.EXPEDITION.echoOwnerDaily && weeklyUsed < constants_1.EXPEDITION.echoOwnerWeekly;
}
