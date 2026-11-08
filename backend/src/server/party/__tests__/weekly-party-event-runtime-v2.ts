import {
  evaluateWeeklyPartyStage,
  planWeeklyPartyVerifiedActivity,
  resolveWeeklyPartyVote,
  PARTY_EVENT_VOTE_DURATION_MS,
  type VerifiedPartyEventSource,
  type WeeklyPartyMemberSettlement,
} from '../weekly-party-event-runtime-v2';
import { buildWeeklyPartySupplyOrders, weeklyPartyBudget, type VerifiedSupplyItem } from '../weekly-party-events-v2';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error('weekly_party_runtime: ' + message);
}
function throws(fn: () => unknown, label: string) {
  try { fn(); throw new Error('did not fail'); }
  catch (error) { assert(!String(error).includes('did not fail'), label); }
}
const catalog: VerifiedSupplyItem[] = [
  { itemId: 'GREENWOOD_LOG', category: 'wood', tier: 'common', secondsPerUnit: 20, unlocked: true },
  { itemId: 'COPPER_ORE', category: 'ore', tier: 'common', secondsPerUnit: 25, unlocked: true },
  { itemId: 'SAMPLE_HERB', category: 'herb', tier: 'common', secondsPerUnit: 30, unlocked: true },
];
const budget = weeklyPartyBudget(2, 'standard');
const orders = buildWeeklyPartySupplyOrders('broken_caravan', budget, catalog, 123)
  .map(order => ({...order, donatedQuantity: 0 }));
const prepared = orders.map(order => ({...order, donatedQuantity: order.quantity}));
const stage1 = evaluateWeeklyPartyStage({
  stage: 1, totalEventPoints: budget.stageProgressTargets[0], budget, orders,
  voteResolved: false, finaleCleared: false, completed: false,
});
assert(stage1.status === 'awaiting_supplies', 'resources must be consumed before stage advances');
assert(stage1.pendingSupplies.length > 0, 'missing supplies are visible to the party');
const stage1Complete = evaluateWeeklyPartyStage({
  stage: 1, totalEventPoints: budget.stageProgressTargets[0], budget, orders: prepared,
  voteResolved: false, finaleCleared: false, completed: false,
});
assert(stage1Complete.canAdvance, 'completed preparation is ready to advance');
const stage2Threshold = budget.stageProgressTargets[0] + budget.stageProgressTargets[1];
assert(evaluateWeeklyPartyStage({
  stage: 2, totalEventPoints: stage2Threshold, budget, orders: prepared,
  voteResolved: false, finaleCleared: false, completed: false,
}).status === 'awaiting_vote', 'no stage 2 completion while vote is unresolved');
assert(evaluateWeeklyPartyStage({
  stage: 2, totalEventPoints: stage2Threshold, budget, orders: prepared,
  voteResolved: true, finaleCleared: false, completed: false,
}).canAdvance, 'stage 2 completes once vote and required supplies are done');
assert(evaluateWeeklyPartyStage({
  stage: 3, totalEventPoints: budget.progressTarget, budget, orders: prepared,
  voteResolved: true, finaleCleared: false, completed: false,
}).status === 'awaiting_finale', 'finale must actually resolve');
assert(evaluateWeeklyPartyStage({
  stage: 3, totalEventPoints: budget.progressTarget, budget, orders: prepared,
  voteResolved: true, finaleCleared: true, completed: false,
}).canComplete, 'finale unlocks completion');
const onlyOptionalMissing = prepared.map(o=>({ ...o, donatedQuantity: o.kind==='optional' ? 0 : o.quantity }));
assert(evaluateWeeklyPartyStage({
  stage: 3, totalEventPoints: budget.progressTarget, budget, orders: onlyOptionalMissing,
  voteResolved: true, finaleCleared: true, completed: false,
}).canComplete, 'optional supplies must never block completion');

const started = Date.parse('2026-11-09T00:00:00Z');
const vote = {
  stage: 2 as const, eligibleAccountIds: ['a','b','c','d'],
  options: ['road','pass','ruins'], defaultChoice: 'road',
  ballots: [{accountId:'a',choice:'pass'},{accountId:'b',choice:'pass'}],
  openedAtMs: started, nowMs: started + 1000,
};
const waiting = resolveWeeklyPartyVote(vote);
assert(!waiting.resolved && waiting.votesRequired===3, 'four-member vote requires three');
assert(resolveWeeklyPartyVote({
  ...vote, ballots: [...vote.ballots,{accountId:'c',choice:'pass'}],
}).resolved, 'strict majority resolves early');
const expired = resolveWeeklyPartyVote({...vote, nowMs: started + PARTY_EVENT_VOTE_DURATION_MS});
assert(expired.resolved && expired.choice==='road' && expired.reason==='timeout',
  'timeout picks documented default, no mandatory same-time logins');
throws(()=>resolveWeeklyPartyVote({...vote,ballots:[{accountId:'a',choice:'pass'},{accountId:'a',choice:'pass'}]}),
  'cannot double-vote');
throws(()=>resolveWeeklyPartyVote({...vote,ballots:[{accountId:'intruder',choice:'pass'}]}),
  'nonmember must not vote');

const source: VerifiedPartyEventSource = {
  sourceEventId:'authoritative-activity-123', accountId:'a', partyIdAtSettlement:'party-1',
  sourceCommittedAtMs:started+3600_000,occurredAtMs:started+3600_000,
  expectedSecondsPerUnit:300,units:3,activityCategory:'skilling',
};
const member: WeeklyPartyMemberSettlement = {
  accountId:'a',joinedAtMs:started+1000,creditedPoints:0,carriedSeconds:0,
};
const accepted = planWeeklyPartyVerifiedActivity(source,member,'party-1',started,started+7*86_400_000);
assert(accepted.ok && accepted.creditedPoints===1, 'verified 15-minute activity earns one EP');
assert(accepted.ok && accepted.totalMemberPoints===1, 'member receives credited EP');
assert(planWeeklyPartyVerifiedActivity({...source,partyIdAtSettlement:'other'},member,'party-1',started,started+7*86_400_000).ok===false,
  'wrong party is rejected');
assert(planWeeklyPartyVerifiedActivity({...source,sourceCommittedAtMs:started-1},member,'party-1',started,started+7*86_400_000).ok===false,
  'out-of-week settlement rejected');
assert(planWeeklyPartyVerifiedActivity({...source,sourceCommittedAtMs:started+100},member,'party-1',started,started+7*86_400_000).ok===false,
  'pre-enrollment settlements rejected');
assert(planWeeklyPartyVerifiedActivity({...source,units:100000},member,'party-1',started,started+7*86_400_000).ok===false,
  'impossibly large settlements rejected');
const cap = planWeeklyPartyVerifiedActivity(source,{...member,creditedPoints:40},'party-1',started,started+7*86_400_000);
assert(cap.ok && cap.creditedPoints===0,'weekly cap enforced with no daily cap');
