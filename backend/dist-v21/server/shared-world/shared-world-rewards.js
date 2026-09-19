"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crisisRewardIntents = crisisRewardIntents;
exports.worldBossRewardIntents = worldBossRewardIntents;
function crisisRewardIntents(input) {
    const grants = [];
    const claimed = new Set(input.claimedRewardKeys);
    if (input.totalPersonalPoints >= input.definition.personalRewardEligibilityPoints && !claimed.has('participation'))
        grants.push({ rewardKey: 'participation', bundleId: input.definition.participationRewardBundleId, reason: 'regional_crisis_participation' });
    for (const threshold of input.definition.personalMilestones) {
        const key = `personal_${threshold}`;
        if (input.totalPersonalPoints >= threshold && !claimed.has(key))
            grants.push({ rewardKey: key, bundleId: `regional_crisis_personal_${threshold}_v1`, reason: 'regional_crisis_personal_milestone' });
    }
    if ((input.state === 'secured' || input.state === 'finalized') && input.totalPersonalPoints >= input.definition.personalRewardEligibilityPoints && !claimed.has('success'))
        grants.push({ rewardKey: 'success', bundleId: input.definition.successRewardBundleId, reason: 'regional_crisis_server_success' });
    return grants;
}
function worldBossRewardIntents(input) {
    const grants = [];
    const claimed = new Set(input.claimedRewardKeys);
    const participated = input.validAttempts >= input.definition.minimumParticipationAttemptsForVictoryReward || input.echoAttempts > 0;
    if (participated && !claimed.has('participation'))
        grants.push({ rewardKey: 'participation', bundleId: input.definition.participationRewardBundleId, reason: 'world_boss_participation' });
    for (const threshold of input.definition.personalImpactMilestones) {
        const key = `impact_${threshold}`;
        if (input.scoredRaidImpact >= threshold && !claimed.has(key))
            grants.push({ rewardKey: key, bundleId: `world_boss_impact_${threshold}_v1`, reason: 'world_boss_impact_milestone' });
    }
    const victory = (input.state === 'defeated' || input.state === 'finalized') && participated;
    if (victory && !claimed.has('victory'))
        grants.push({ rewardKey: 'victory', bundleId: input.definition.victoryRewardBundleId, reason: 'world_boss_server_victory' });
    if (input.validAttempts > 0 && input.finalRank && input.definition.prestigeRewardBundleId && !claimed.has('prestige')) {
        const pop = Math.max(1, input.qualifyingPopulation ?? 1);
        if (input.finalRank <= 10 || input.finalRank <= 100 || input.finalRank / Math.max(1, pop) <= 0.10)
            grants.push({ rewardKey: 'prestige', bundleId: input.definition.prestigeRewardBundleId, reason: 'world_boss_prestige_rank' });
    }
    return grants;
}
