"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_VOTE_DURATION_MS = exports.PARTY_EVENT_MINIMUM_CHEST_POINTS = exports.PARTY_EVENT_SPECIAL_ACTION_LIMIT = exports.PARTY_EVENT_VERIFIED_ACTIVITY_LIMIT = void 0;
exports.evaluateWeeklyPartyStage = evaluateWeeklyPartyStage;
exports.resolveWeeklyPartyVote = resolveWeeklyPartyVote;
exports.planWeeklyPartyVerifiedActivity = planWeeklyPartyVerifiedActivity;
exports.PARTY_EVENT_VERIFIED_ACTIVITY_LIMIT = 40;
exports.PARTY_EVENT_SPECIAL_ACTION_LIMIT = 20;
exports.PARTY_EVENT_MINIMUM_CHEST_POINTS = 15;
exports.PARTY_EVENT_VOTE_DURATION_MS = 6 * 60 * 60 * 1000;
function evaluateWeeklyPartyStage(snapshot) {
    const { stage, budget, orders } = snapshot;
    if (![1, 2, 3].includes(stage))
        throw new Error('invalid_weekly_event_stage');
    if (!Number.isInteger(snapshot.totalEventPoints) || snapshot.totalEventPoints < 0
        || snapshot.totalEventPoints > budget.progressTarget)
        throw new Error('invalid_weekly_event_points');
    const cumulativeTarget = budget.stageProgressTargets.slice(0, stage).reduce((total, value) => total + value, 0);
    const pendingSupplies = orders.filter(order => order.stage === stage && order.kind === 'required')
        .map(order => {
        if (!Number.isSafeInteger(order.quantity) || !Number.isSafeInteger(order.donatedQuantity)
            || order.donatedQuantity < 0 || order.donatedQuantity > order.quantity) {
            throw new Error('invalid_weekly_event_supply');
        }
        return { itemId: order.itemId, missingQuantity: order.quantity - order.donatedQuantity };
    }).filter(item => item.missingQuantity > 0);
    const missingPoints = Math.max(0, cumulativeTarget - snapshot.totalEventPoints);
    let status;
    if (snapshot.completed)
        status = 'completed';
    else if (missingPoints > 0)
        status = 'awaiting_progress';
    else if (pendingSupplies.length > 0)
        status = 'awaiting_supplies';
    else if (stage > 1 && !snapshot.voteResolved)
        status = 'awaiting_vote';
    else if (stage === 3 && !snapshot.finaleCleared)
        status = 'awaiting_finale';
    else
        status = stage === 3 ? 'ready_to_complete' : 'ready_to_advance';
    return {
        stage, status, cumulativeTarget, earnedPoints: snapshot.totalEventPoints,
        missingPoints, pendingSupplies,
        canAdvance: status === 'ready_to_advance',
        canComplete: status === 'ready_to_complete',
    };
}
function resolveWeeklyPartyVote(input) {
    const { eligibleAccountIds, options, defaultChoice, ballots } = input;
    if (input.stage !== 2 && input.stage !== 3)
        throw new Error('invalid_weekly_event_vote_stage');
    if (!Number.isFinite(input.openedAtMs) || !Number.isFinite(input.nowMs))
        throw new Error('invalid_weekly_event_vote_time');
    if (eligibleAccountIds.length < 2 || eligibleAccountIds.length > 4
        || new Set(eligibleAccountIds).size !== eligibleAccountIds.length)
        throw new Error('invalid_weekly_event_voters');
    if (options.length < 2 || options.length > 4 || new Set(options).size !== options.length
        || !options.includes(defaultChoice))
        throw new Error('invalid_weekly_event_options');
    const eligible = new Set(eligibleAccountIds);
    const counted = new Set();
    const counts = new Map(options.map(option => [option, 0]));
    for (const ballot of ballots) {
        if (!eligible.has(ballot.accountId) || counted.has(ballot.accountId) || !counts.has(ballot.choice)) {
            throw new Error('invalid_weekly_event_ballot');
        }
        counted.add(ballot.accountId);
        counts.set(ballot.choice, (counts.get(ballot.choice) ?? 0) + 1);
    }
    const needed = Math.floor(eligibleAccountIds.length / 2) + 1;
    for (const [choice, votes] of counts) {
        if (votes >= needed)
            return { resolved: true, choice, reason: 'majority' };
    }
    const closesAtMs = input.openedAtMs + exports.PARTY_EVENT_VOTE_DURATION_MS;
    if (input.nowMs >= closesAtMs)
        return { resolved: true, choice: defaultChoice, reason: 'timeout' };
    return { resolved: false, closesAtMs, votesCast: counted.size, votesRequired: needed };
}
function planWeeklyPartyVerifiedActivity(source, member, partyId, startsAtMs, endsAtMs) {
    if (!member || member.accountId !== source.accountId)
        return { ok: false, code: 'not_enrolled' };
    if (partyId !== source.partyIdAtSettlement)
        return { ok: false, code: 'wrong_party' };
    if (!Number.isFinite(source.occurredAtMs) || !Number.isFinite(source.sourceCommittedAtMs)
        || source.sourceCommittedAtMs < startsAtMs || source.sourceCommittedAtMs >= endsAtMs
        || source.occurredAtMs < startsAtMs || source.occurredAtMs >= endsAtMs)
        return { ok: false, code: 'outside_event' };
    if (source.sourceCommittedAtMs < member.joinedAtMs || source.occurredAtMs < member.joinedAtMs) {
        return { ok: false, code: 'before_enrollment' };
    }
    if (!source.sourceEventId || source.sourceEventId.length < 8 ||
        !Number.isSafeInteger(source.units) || source.units < 1 || source.units > 100_000
        || !Number.isFinite(source.expectedSecondsPerUnit) || source.expectedSecondsPerUnit <= 0
        || source.expectedSecondsPerUnit > 3600 || !['combat', 'skilling'].includes(source.activityCategory)
        || !Number.isSafeInteger(member.creditedPoints) || member.creditedPoints < 0
        || member.creditedPoints > exports.PARTY_EVENT_VERIFIED_ACTIVITY_LIMIT
        || !Number.isFinite(member.carriedSeconds) || member.carriedSeconds < 0 || member.carriedSeconds >= 900
        || source.units * source.expectedSecondsPerUnit > 30 * 3600) {
        return { ok: false, code: 'invalid_source' };
    }
    const available = exports.PARTY_EVENT_VERIFIED_ACTIVITY_LIMIT - member.creditedPoints;
    const seconds = source.units * source.expectedSecondsPerUnit + member.carriedSeconds;
    const creditedPoints = Math.min(available, Math.floor(seconds / 900));
    return {
        ok: true, creditedPoints,
        totalMemberPoints: member.creditedPoints + creditedPoints,
        carriedSeconds: creditedPoints >= available ? 0 : seconds - creditedPoints * 900,
    };
}
