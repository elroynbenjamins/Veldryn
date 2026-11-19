"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coopTierEnemyMultipliers = coopTierEnemyMultipliers;
const constants_1 = require("./constants");
/** Tier I remains bit-for-bit at launch baseline. Higher tiers raise enemy
 * durability and pressure, rather than changing player stats or random seeds.
 * Applied ONLY to runs created with tierScalingVersion=2, protecting active
 * legacy runs from a mid-run ruleset change. */
function coopTierEnemyMultipliers(tier) {
    const index = constants_1.EXPEDITION.difficultyIndex[tier];
    if (!Number.isFinite(index))
        throw new Error('invalid_expedition_tier');
    const excess = index - 1;
    return {
        attack: 1 + excess,
        hp: 1 + excess * .85,
        defense: 1 + excess * .35,
    };
}
