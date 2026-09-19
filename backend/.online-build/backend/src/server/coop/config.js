"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROOTBOUND_COOP_BALANCE_V2 = exports.COOP_CLASS_ABILITY_MULTIPLIERS = exports.COOP_ROGUELITE_CONFIG = void 0;
exports.coopRequiredLevel = coopRequiredLevel;
exports.COOP_ROGUELITE_CONFIG = Object.freeze({
    featureFlag: 'coopRogueliteV1',
    enabledByDefault: false,
    routeSchemaVersion: 1,
    routeGeneratorVersion: 'coop-route-v1',
    preBossNodeMin: 5,
    preBossNodeMax: 5,
    choicesPerDepth: 3,
    targetRunMinutesMin: 6,
    targetRunMinutesMax: 8,
    readyCheckMs: 20_000,
    liveVoteMs: 8_000,
    personalChoiceMs: 15_000,
    reconnectGraceMs: 60_000,
    echoFreshnessMs: 24 * 60 * 60 * 1_000,
    normalizedReadinessFloor: 0.8,
    enhancedRewardChargeCapacity: 3,
    enhancedRewardRechargeMs: 8 * 60 * 60 * 1_000,
    enhancedRewardWeeklyLimit: 12,
    tierMinimumLevelOffset: Object.freeze({ 1: 0, 2: 5, 3: 10, 4: 15, 5: 20 }),
});
function coopRequiredLevel(baseMinimumLevel, tier) {
    if (!Number.isInteger(baseMinimumLevel) || baseMinimumLevel < 1)
        throw new Error('invalid_expedition_minimum_level');
    return baseMinimumLevel + exports.COOP_ROGUELITE_CONFIG.tierMinimumLevelOffset[tier];
}
/** Role-kit corrections belong to the normalized co-op roster, not to one dungeon. */
exports.COOP_CLASS_ABILITY_MULTIPLIERS = Object.freeze({
    STONECALLER: Object.freeze({ SC_SHIELD: 2, SC_HEAL: 2 }),
});
exports.ROOTBOUND_COOP_BALANCE_V2 = Object.freeze({
    version: 'rootbound-coop-balance-v2',
    enemyAttackMultiplier: 2.9,
    lateDepthStart: 8,
    lateDepthAttackMultiplier: 1,
});
