"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordGuildProjectContribution = recordGuildProjectContribution;
exports.claimGuildProjectCompletionReward = claimGuildProjectCompletionReward;
exports.createWeeklyGuildProjectInstanceReference = createWeeklyGuildProjectInstanceReference;
const guild_projects_1 = require("./guild-projects");
async function recordGuildProjectContribution(repo, projectInstanceId, event, snapshot) {
    if (!snapshot.guildIdAtSettlement)
        return { projectInstanceId, creditedPoints: 0, completionCreditedPoints: 0, completed: false };
    if (await repo.hasContributionReceipt(projectInstanceId, event.accountId, event.sourceEventId)) {
        const existing = await repo.loadContributionStateForUpdate(projectInstanceId, event.accountId, event.dateKey);
        return { projectInstanceId, creditedPoints: 0, completionCreditedPoints: 0, completed: existing?.instance.status === 'completed' };
    }
    const state = await repo.loadContributionStateForUpdate(projectInstanceId, event.accountId, event.dateKey);
    if (!state || state.instance.status !== 'active')
        return { projectInstanceId, creditedPoints: 0, completionCreditedPoints: 0, completed: false };
    if (state.instance.guildId !== snapshot.guildIdAtSettlement)
        return { projectInstanceId, creditedPoints: 0, completionCreditedPoints: 0, completed: false };
    if (state.instance.definition.kind !== 'weekly_campaign' && state.instance.definition.kind !== 'event')
        return { projectInstanceId, creditedPoints: 0, completionCreditedPoints: 0, completed: false };
    const cycleKey = state.instance.cycleKey;
    if (state.instance.definition.kind === 'weekly_campaign' && cycleKey) {
        const binding = await repo.getCycleBinding(cycleKey, event.accountId);
        if (binding && binding.guildId !== state.instance.guildId)
            return { projectInstanceId, creditedPoints: 0, completionCreditedPoints: 0, completed: false };
    }
    if (!(0, guild_projects_1.isContributionCategoryEligible)(state.instance.definition.focus, event.profile.category))
        return { projectInstanceId, creditedPoints: 0, completionCreditedPoints: 0, completed: false };
    const credit = (0, guild_projects_1.creditGuildProjectContribution)({
        profile: event.profile,
        units: event.units,
        pointsCreditedToday: state.pointsCreditedToday,
        completionPointsByAccount: state.accountProgress?.completionPoints ?? 0,
        balance: state.instance.balance,
    });
    const projectedRaw = (state.accountProgress?.rawPoints ?? 0) + credit.dailyCreditedPoints;
    if (state.instance.definition.kind === 'weekly_campaign' && cycleKey && projectedRaw >= state.instance.balance.meaningfulContributorThreshold) {
        const binding = await repo.bindCycle(cycleKey, event.accountId, state.instance.guildId, projectedRaw);
        if (binding.guildId !== state.instance.guildId)
            return { projectInstanceId, creditedPoints: 0, completionCreditedPoints: 0, completed: false };
    }
    await repo.applyContribution({
        projectInstanceId, accountId: event.accountId, sourceEventId: event.sourceEventId, dateKey: event.dateKey,
        category: event.profile.category, rawPoints: credit.rawPoints, creditedPoints: credit.dailyCreditedPoints,
        completionCreditedPoints: credit.completionCreditedPoints, occurredAtMs: event.occurredAtMs, activityKind: event.activityKind, contentId: event.contentId, units: event.units,
    });
    const updatedRows = state.memberProgress.map((row) => row.accountId === event.accountId ? {
        ...row,
        rawPoints: row.rawPoints + credit.dailyCreditedPoints,
        completionPoints: row.completionPoints + credit.completionCreditedPoints,
        combatPoints: row.combatPoints + (event.profile.category === 'combat' ? credit.completionCreditedPoints : 0),
        skillingPoints: row.skillingPoints + (event.profile.category === 'skilling' ? credit.completionCreditedPoints : 0),
    } : row);
    if (!state.memberProgress.some((row) => row.accountId === event.accountId))
        updatedRows.push({
            accountId: event.accountId, rawPoints: credit.dailyCreditedPoints, completionPoints: credit.completionCreditedPoints,
            combatPoints: event.profile.category === 'combat' ? credit.completionCreditedPoints : 0,
            skillingPoints: event.profile.category === 'skilling' ? credit.completionCreditedPoints : 0,
        });
    const evaluation = (0, guild_projects_1.evaluateGuildProject)(state.instance.definition, state.instance.balance, updatedRows);
    if (evaluation.complete) {
        await repo.markCompleted(projectInstanceId, event.occurredAtMs, evaluation);
    }
    return { projectInstanceId, creditedPoints: credit.dailyCreditedPoints, completionCreditedPoints: credit.completionCreditedPoints, completed: evaluation.complete };
}
async function claimGuildProjectCompletionReward(repo, input) {
    if (input.project.status !== 'completed' || !input.project.completedAtMs)
        return 'not_eligible';
    if (await repo.hasRewardClaim(input.project.id, input.accountId, input.rewardKey))
        return 'already_claimed';
    const membership = await repo.loadMembershipSnapshot(input.project.id, input.accountId, input.project.completedAtMs);
    if (!membership || !(0, guild_projects_1.memberEligibleForGuildProjectCompletionReward)(input.project.balance, input.progress, membership))
        return 'not_eligible';
    await repo.recordRewardClaim(input.project.id, input.accountId, input.rewardKey);
    return 'claimed';
}
function createWeeklyGuildProjectInstanceReference(input) {
    return {
        id: input.id, guildId: input.guildId, guildNameSnapshot: input.guildName, definition: input.definition,
        balance: (0, guild_projects_1.deriveGuildWeeklyProjectBalance)(input.activeMemberSnapshot), status: 'active', startsAtMs: input.startsAtMs, endsAtMs: input.endsAtMs,
        completionPoints: 0, combatPoints: 0, skillingPoints: 0,
    };
}
