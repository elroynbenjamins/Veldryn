"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePartyEvent = evaluatePartyEvent;
exports.reachedPersonalMilestones = reachedPersonalMilestones;
exports.rankPartyEntries = rankPartyEntries;
exports.rankingRewardBand = rankingRewardBand;
exports.rankingRewardForBand = rankingRewardForBand;
exports.memberEligibleForPartyEventReward = memberEligibleForPartyEventReward;
function evaluatePartyEvent(definition, progress) {
    const meaningfulContributors = progress.members
        .filter((member) => member.points >= definition.meaningfulContributorPoints)
        .map((member) => member.accountId);
    const missing = [];
    if (progress.score < definition.rankedMinimumPartyPoints)
        missing.push('party_points');
    if (meaningfulContributors.length < definition.rankedMinimumMeaningfulContributors)
        missing.push('meaningful_contributors');
    const categoryTotals = { combat: progress.combatPoints, skilling: progress.skillingPoints };
    for (const [category, fraction] of Object.entries(definition.contributionRules.minimumCategoryFraction ?? {})) {
        if (categoryTotals[category] < Math.ceil(definition.rankedMinimumPartyPoints * fraction))
            missing.push(`minimum_${category}_share`);
    }
    return {
        partyScore: progress.score,
        combatPoints: progress.combatPoints,
        skillingPoints: progress.skillingPoints,
        meaningfulContributors,
        rankedEligible: missing.length === 0,
        rankedEligibilityMissing: missing,
        reachedPartyMilestones: definition.partyMilestones.filter((m) => progress.score >= m.points).map((m) => m.points),
    };
}
function reachedPersonalMilestones(definition, personalPoints) {
    return definition.personalMilestones.filter((m) => personalPoints >= m.points).map((m) => m.points);
}
function rankPartyEntries(entries) {
    const eligible = entries.filter((entry) => entry.rankedEligible)
        .sort((a, b) => b.score - a.score || a.lastScoreAtMs - b.lastScoreAtMs || a.partyId.localeCompare(b.partyId));
    const total = eligible.length;
    return eligible.map((entry, index) => ({ ...entry, rank: index + 1, percentile: total === 0 ? 100 : ((index + 1) / total) * 100 }));
}
function rankingRewardBand(rank, eligiblePartyCount, rankedEligible) {
    if (!rankedEligible || !rank || eligiblePartyCount <= 0)
        return 'none';
    if (rank <= 10)
        return 'top10';
    if (rank <= 100)
        return 'top100';
    if (rank <= Math.max(1, Math.ceil(eligiblePartyCount * 0.10)))
        return 'top10_percent';
    if (rank <= Math.max(1, Math.ceil(eligiblePartyCount * 0.25)))
        return 'top25_percent';
    return 'qualified';
}
function rankingRewardForBand(definition, band) {
    switch (band) {
        case 'top10': return definition.rankingRewards.top10 ?? definition.rankingRewards.top100 ?? definition.rankingRewards.qualified;
        case 'top100': return definition.rankingRewards.top100 ?? definition.rankingRewards.top10Percent ?? definition.rankingRewards.qualified;
        case 'top10_percent': return definition.rankingRewards.top10Percent ?? definition.rankingRewards.top25Percent ?? definition.rankingRewards.qualified;
        case 'top25_percent': return definition.rankingRewards.top25Percent ?? definition.rankingRewards.qualified;
        case 'qualified': return definition.rankingRewards.qualified;
        default: return undefined;
    }
}
function memberEligibleForPartyEventReward(definition, member) {
    return Boolean(member && member.points >= definition.personalPartyRewardEligibilityPoints);
}
