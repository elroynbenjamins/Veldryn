"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_definitions_1 = require("../event-definitions");
const contribution_1 = require("../contribution");
const breakdown_1 = require("../breakdown");
const leaderboard_1 = require("../leaderboard");
const party_events_1 = require("../party-events");
const scheduler_1 = require("../scheduler");
function assert(value, message) {
    if (!value)
        throw new Error(message);
}
const rift = event_definitions_1.PARTY_EVENT_TEMPLATE_POOL.find((x) => x.id === 'party_event_rift_surge');
assert(rift, 'rift event must exist');
assert((0, event_definitions_1.validatePartyEventDefinition)(rift).length === 0, 'rift event definition should be valid');
const event = {
    sourceEventId: 'settlement-1', accountId: 'a1', occurredAtMs: Date.parse('2026-09-13T12:00:00Z'), dateKey: '2026-09-13',
    profile: { id: 'sunscar_elite', category: 'combat', expectedSecondsPerUnit: 300, challenge: 'elite' },
    units: 2, activityKind: 'combat', contentId: 'sunscar_elite', regionId: 'sunscar', tags: ['rift'],
};
const score = (0, contribution_1.scoreLiveOpsContribution)(event, rift);
assert(score.eligible && score.eventPoints > 0, 'eligible server event should score');
assert((0, contribution_1.cappedEventCredit)(5000, 0, rift.contributionRules.dailyAccountCreditCap) === rift.contributionRules.dailyAccountCreditCap, 'event daily cap should apply');
const progress = {
    partyId: 'p1', score: 6200, combatPoints: 3600, skillingPoints: 2600, lastScoreAtMs: 100,
    members: [
        { accountId: 'a1', partyId: 'p1', points: 3500, combatPoints: 2200, skillingPoints: 1300 },
        { accountId: 'a2', partyId: 'p1', points: 2700, combatPoints: 1400, skillingPoints: 1300 },
    ],
};
const evaluation = (0, party_events_1.evaluatePartyEvent)(rift, progress);
assert(evaluation.rankedEligible, 'balanced party should qualify for ranking');
assert(evaluation.reachedPartyMilestones.includes(6000), 'party milestone should be detected');
assert((0, party_events_1.reachedPersonalMilestones)(rift, 1600).join(',') === '250,750,1500', 'personal milestones should be progressive');
const combatOnly = {
    ...progress, combatPoints: 6200, skillingPoints: 0,
    members: progress.members.map((m) => ({ ...m, combatPoints: m.points, skillingPoints: 0 })),
};
assert(!(0, party_events_1.evaluatePartyEvent)(rift, combatOnly).rankedEligible, 'mixed rift event should reject one-category ranking qualification');
const entries = [
    { partyId: 'p1', score: 8000, lastScoreAtMs: 200, meaningfulContributors: 2, rankedEligible: true },
    { partyId: 'p2', score: 8000, lastScoreAtMs: 100, meaningfulContributors: 2, rankedEligible: true },
    { partyId: 'p3', score: 9999, lastScoreAtMs: 50, meaningfulContributors: 1, rankedEligible: false },
];
const board = (0, leaderboard_1.buildLeaderboardPage)(entries, 'global');
assert(board.entries[0].partyId === 'p2', 'earlier score timestamp should break equal-score tie');
assert(board.totalRankedParties === 2, 'ineligible party should not count in ranked party total');
assert((0, party_events_1.rankingRewardBand)(1, 500, true) === 'top10', 'rank one should get top10 band');
assert((0, party_events_1.rankingRewardBand)(75, 500, true) === 'top100', 'top100 should outrank percentile bands');
assert((0, party_events_1.rankingRewardBand)(120, 1000, true) === 'top25_percent', 'rank 120/1000 should be top25 but not top10 percent');
const breakdown = (0, breakdown_1.aggregateContributionBreakdown)([
    { accountId: 'a', dateKey: '2026-09-13', activityKind: 'combat', contentId: 'wyrm', creditedPoints: 125, occurredAtMs: 1 },
    { accountId: 'a', dateKey: '2026-09-13', activityKind: 'combat', contentId: 'wyrm', creditedPoints: 125, occurredAtMs: 2 },
    { accountId: 'a', dateKey: '2026-09-13', activityKind: 'crafting', contentId: 'rift_core', creditedPoints: 260, occurredAtMs: 3 },
]);
assert(breakdown.totalPoints === 510, 'breakdown total should add credited points');
assert(breakdown.topDetails[0].points === 260, 'largest detail should sort first');
const scheduled = (0, scheduler_1.createScheduledPartyEvent)({ instanceId: 'e1', definition: rift, startsAtMs: Date.parse('2026-09-13T00:00:00Z') });
assert((0, scheduler_1.eventPhase)(scheduled, Date.parse('2026-09-13T12:00:00Z')) === 'active', 'scheduled event should be active during window');
assert((0, scheduler_1.eventPhase)(scheduled, scheduled.endsAtMs + 11 * 60_000) === 'finalizable', 'event should become finalizable after grace');
let overlapRejected = false;
try {
    (0, scheduler_1.assertNoOverlappingPartyEvents)((0, scheduler_1.createScheduledPartyEvent)({ instanceId: 'e2', definition: rift, startsAtMs: scheduled.startsAtMs + 3600_000 }), [scheduled]);
}
catch {
    overlapRejected = true;
}
assert(overlapRejected, 'overlapping party events should be rejected by default scheduler policy');
console.log('party-events-v17 ok');
