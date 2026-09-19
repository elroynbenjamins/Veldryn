"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMBAT_LIMITS = exports.FAILURE_REWARD = exports.EXPEDITION = void 0;
exports.EXPEDITION = {
    difficultyIndex: { 1: 1.0, 2: 1.06, 3: 1.11, 4: 1.19, 5: 1.29 },
    marksMultiplier: { 1: 1.0, 2: 1.10, 3: 1.25, 4: 1.45, 5: 1.70 },
    masteryMultiplier: { 1: 1.0, 2: 1.05, 3: 1.10, 4: 1.15, 5: 1.20 },
    postCapMarksCoefficient: 0.20,
    enhancedDaily: 3,
    enhancedWeekly: 12,
    enhancedChargeCapacity: 3,
    enhancedChargeRechargeMs: 8 * 60 * 60 * 1000,
    regionBossBonusWeekly: 3,
    echoOwnerDaily: 5,
    echoOwnerWeekly: 25,
    helperRewardWeekly: 20,
    noEntryGate: true,
    paidPower: false,
};
exports.FAILURE_REWARD = {
    early: 0.05,
    quarter: 0.15,
    half: 0.25,
    finalBoss: 0.35,
    bossLow: 0.45,
    clear: 1.0,
};
exports.COMBAT_LIMITS = {
    mitigationMin: 0.05,
    mitigationMax: 0.75,
    hitChanceMin: 0.65,
    hitChanceMax: 0.98,
    critChanceCap: 0.50,
    defaultCritMultiplier: 1.50,
    damageVarianceMin: 0.90,
    damageVarianceMax: 1.10,
    unitContributionNormalMin: 0.06,
    unitContributionNormalMax: 0.12,
    unitContributionRaidMin: 0.02,
    unitContributionRaidMax: 0.05,
};
