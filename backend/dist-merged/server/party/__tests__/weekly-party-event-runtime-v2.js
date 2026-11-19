"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const weekly_party_event_runtime_v2_1 = require("../weekly-party-event-runtime-v2");
const weekly_party_events_v2_1 = require("../weekly-party-events-v2");
function assert(value, message) {
    if (!value)
        throw new Error('weekly_party_runtime: ' + message);
}
function throws(fn, label) {
    try {
        fn();
        throw new Error('did not fail');
    }
    catch (error) {
        assert(!String(error).includes('did not fail'), label);
    }
}
const catalog = [
    { itemId: 'GREENWOOD_LOG', category: 'wood', tier: 'common', secondsPerUnit: 20, unlocked: true },
    { itemId: 'COPPER_ORE', category: 'ore', tier: 'common', secondsPerUnit: 25, unlocked: true },
    { itemId: 'SAMPLE_HERB', category: 'herb', tier: 'common', secondsPerUnit: 30, unlocked: true },
];
const budget = (0, weekly_party_events_v2_1.weeklyPartyBudget)(2, 'standard');
const orders = (0, weekly_party_events_v2_1.buildWeeklyPartySupplyOrders)('broken_caravan', budget, catalog, 123)
    .map(order => ({ ...order, donatedQuantity: 0 }));
const prepared = orders.map(order => ({ ...order, donatedQuantity: order.quantity }));
const stage1 = (0, weekly_party_event_runtime_v2_1.evaluateWeeklyPartyStage)({
    stage: 1, totalEventPoints: budget.stageProgressTargets[0], budget, orders,
    voteResolved: false, finaleCleared: false, completed: false,
});
assert(stage1.status === 'awaiting_supplies', 'resources must be consumed before stage advances');
assert(stage1.pendingSupplies.length > 0, 'missing supplies are visible to the party');
const stage1Complete = (0, weekly_party_event_runtime_v2_1.evaluateWeeklyPartyStage)({
    stage: 1, totalEventPoints: budget.stageProgressTargets[0], budget, orders: prepared,
    voteResolved: false, finaleCleared: false, completed: false,
});
assert(stage1Complete.canAdvance, 'completed preparation is ready to advance');
const stage2Threshold = budget.stageProgressTargets[0] + budget.stageProgressTargets[1];
assert((0, weekly_party_event_runtime_v2_1.evaluateWeeklyPartyStage)({
    stage: 2, totalEventPoints: stage2Threshold, budget, orders: prepared,
    voteResolved: false, finaleCleared: false, completed: false,
}).status === 'awaiting_vote', 'no stage 2 completion while vote is unresolved');
assert((0, weekly_party_event_runtime_v2_1.evaluateWeeklyPartyStage)({
    stage: 2, totalEventPoints: stage2Threshold, budget, orders: prepared,
    voteResolved: true, finaleCleared: false, completed: false,
}).canAdvance, 'stage 2 completes once vote and required supplies are done');
assert((0, weekly_party_event_runtime_v2_1.evaluateWeeklyPartyStage)({
    stage: 3, totalEventPoints: budget.progressTarget, budget, orders: prepared,
    voteResolved: true, finaleCleared: false, completed: false,
}).status === 'awaiting_finale', 'finale must actually resolve');
assert((0, weekly_party_event_runtime_v2_1.evaluateWeeklyPartyStage)({
    stage: 3, totalEventPoints: budget.progressTarget, budget, orders: prepared,
    voteResolved: true, finaleCleared: true, completed: false,
}).canComplete, 'finale unlocks completion');
const onlyOptionalMissing = prepared.map(o => ({ ...o, donatedQuantity: o.kind === 'optional' ? 0 : o.quantity }));
assert((0, weekly_party_event_runtime_v2_1.evaluateWeeklyPartyStage)({
    stage: 3, totalEventPoints: budget.progressTarget, budget, orders: onlyOptionalMissing,
    voteResolved: true, finaleCleared: true, completed: false,
}).canComplete, 'optional supplies must never block completion');
const started = Date.parse('2026-11-09T00:00:00Z');
const vote = {
    stage: 2, eligibleAccountIds: ['a', 'b', 'c', 'd'],
    options: ['road', 'pass', 'ruins'], defaultChoice: 'road',
    ballots: [{ accountId: 'a', choice: 'pass' }, { accountId: 'b', choice: 'pass' }],
    openedAtMs: started, nowMs: started + 1000,
};
const waiting = (0, weekly_party_event_runtime_v2_1.resolveWeeklyPartyVote)(vote);
assert(!waiting.resolved && waiting.votesRequired === 3, 'four-member vote requires three');
assert((0, weekly_party_event_runtime_v2_1.resolveWeeklyPartyVote)({
    ...vote, ballots: [...vote.ballots, { accountId: 'c', choice: 'pass' }],
}).resolved, 'strict majority resolves early');
const expired = (0, weekly_party_event_runtime_v2_1.resolveWeeklyPartyVote)({ ...vote, nowMs: started + weekly_party_event_runtime_v2_1.PARTY_EVENT_VOTE_DURATION_MS });
assert(expired.resolved && expired.choice === 'road' && expired.reason === 'timeout', 'timeout picks documented default, no mandatory same-time logins');
throws(() => (0, weekly_party_event_runtime_v2_1.resolveWeeklyPartyVote)({ ...vote, ballots: [{ accountId: 'a', choice: 'pass' }, { accountId: 'a', choice: 'pass' }] }), 'cannot double-vote');
throws(() => (0, weekly_party_event_runtime_v2_1.resolveWeeklyPartyVote)({ ...vote, ballots: [{ accountId: 'intruder', choice: 'pass' }] }), 'nonmember must not vote');
const source = {
    sourceEventId: 'authoritative-activity-123', accountId: 'a', partyIdAtSettlement: 'party-1',
    sourceCommittedAtMs: started + 3600_000, occurredAtMs: started + 3600_000,
    expectedSecondsPerUnit: 300, units: 3, activityCategory: 'skilling',
};
const member = {
    accountId: 'a', joinedAtMs: started + 1000, creditedPoints: 0, carriedSeconds: 0,
};
const accepted = (0, weekly_party_event_runtime_v2_1.planWeeklyPartyVerifiedActivity)(source, member, 'party-1', started, started + 7 * 86_400_000);
assert(accepted.ok && accepted.creditedPoints === 1, 'verified 15-minute activity earns one EP');
assert(accepted.ok && accepted.totalMemberPoints === 1, 'member receives credited EP');
assert((0, weekly_party_event_runtime_v2_1.planWeeklyPartyVerifiedActivity)({ ...source, partyIdAtSettlement: 'other' }, member, 'party-1', started, started + 7 * 86_400_000).ok === false, 'wrong party is rejected');
assert((0, weekly_party_event_runtime_v2_1.planWeeklyPartyVerifiedActivity)({ ...source, sourceCommittedAtMs: started - 1 }, member, 'party-1', started, started + 7 * 86_400_000).ok === false, 'out-of-week settlement rejected');
assert((0, weekly_party_event_runtime_v2_1.planWeeklyPartyVerifiedActivity)({ ...source, sourceCommittedAtMs: started + 100 }, member, 'party-1', started, started + 7 * 86_400_000).ok === false, 'pre-enrollment settlements rejected');
assert((0, weekly_party_event_runtime_v2_1.planWeeklyPartyVerifiedActivity)({ ...source, units: 100000 }, member, 'party-1', started, started + 7 * 86_400_000).ok === false, 'impossibly large settlements rejected');
const cap = (0, weekly_party_event_runtime_v2_1.planWeeklyPartyVerifiedActivity)(source, { ...member, creditedPoints: 40 }, 'party-1', started, started + 7 * 86_400_000);
assert(cap.ok && cap.creditedPoints === 0, 'weekly cap enforced with no daily cap');
