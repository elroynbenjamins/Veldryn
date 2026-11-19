"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crisisSucceeded = crisisSucceeded;
exports.crisisRewardIntents = crisisRewardIntents;
exports.worldBossWasDefeated = worldBossWasDefeated;
exports.worldBossRewardIntents = worldBossRewardIntents;
const world_bosses_1 = require("./world-bosses");
const world_boss_ranking_1 = require("./world-boss-ranking");
function crisisSucceeded(state, outcome) {
    return state === 'secured' || (state === 'finalized' && outcome === 'secured');
}
function crisisRewardIntents(input) {
    const grants = [];
    const claimed = new Set(input.claimedRewardKeys);
    const eligible = input.totalPersonalPoints >= input.definition.personalRewardEligibilityPoints;
    if (eligible && !claimed.has('participation'))
        grants.push({ rewardKey: 'participation', bundleId: input.definition.participationRewardBundleId, reason: 'regional_crisis_participation' });
    for (const threshold of input.definition.personalMilestones) {
        const key = `personal_${threshold}`;
        if (input.totalPersonalPoints >= threshold && !claimed.has(key))
            grants.push({ rewardKey: key, bundleId: `regional_crisis_personal_${threshold}_v1`, reason: 'regional_crisis_personal_milestone' });
    }
    if (crisisSucceeded(input.state, input.outcome) && eligible && !claimed.has('success'))
        grants.push({ rewardKey: 'success', bundleId: input.definition.successRewardBundleId, reason: 'regional_crisis_server_success' });
    return grants;
}
function worldBossWasDefeated(state, defeatedAtMs) {
    return state === 'defeated' || (state === 'finalized' && defeatedAtMs != null);
}
/**
 * Echo attempts earn participation only: they deal no shared HP damage and carry no scored victory or
 * prestige credit, matching the in-game Echo copy.
 */
function worldBossRewardIntents(input) {
    const grants = [];
    const claimed = new Set(input.claimedRewardKeys);
    const scoredParticipant = (0, world_bosses_1.eligibleForWorldBossVictoryReward)(input.validAttempts, input.definition);
    const participated = scoredParticipant || input.echoAttempts > 0;
    if (participated && !claimed.has('participation'))
        grants.push({ rewardKey: 'participation', bundleId: input.definition.participationRewardBundleId, reason: 'world_boss_participation' });
    for (const threshold of input.definition.personalImpactMilestones) {
        const key = `impact_${threshold}`;
        if (input.scoredRaidImpact >= threshold && !claimed.has(key))
            grants.push({ rewardKey: key, bundleId: `world_boss_impact_${threshold}_v1`, reason: 'world_boss_impact_milestone' });
    }
    if (scoredParticipant && worldBossWasDefeated(input.state, input.defeatedAtMs) && !claimed.has('victory'))
        grants.push({ rewardKey: 'victory', bundleId: input.definition.victoryRewardBundleId, reason: 'world_boss_server_victory' });
    if (input.validAttempts > 0 && input.finalRank && input.definition.prestigeRewardBundleId && !claimed.has('prestige')) {
        const tier = (0, world_boss_ranking_1.worldBossPrestigeTier)(input.finalRank, Math.max(1, input.qualifyingPopulation ?? input.finalRank));
        if (tier && tier !== 'qualified')
            grants.push({ rewardKey: 'prestige', bundleId: input.definition.prestigeRewardBundleId, reason: 'world_boss_prestige_rank' });
    }
    return grants;
}
