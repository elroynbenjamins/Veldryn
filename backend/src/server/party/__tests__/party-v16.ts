import {
  canAccessPersistentPartyChat,
  canJoinPersistentParty,
  evaluateLiveDungeonComposition,
  joinPersistentParty,
  leavePersistentParty,
  persistentPartyCanExistWithCurrentRoles,
  type PersistentPartyState,
} from '../../social/party';
import {
  buildPartyContractBudget,
  createEmptyPartyContractProgress,
  evaluateContractCompletion,
  normalizedContributionDelta,
  objectivePointBudget,
  recordVerifiedContribution,
  SAMPLE_MINI_EVENT_CONTRACTS,
  SAMPLE_WEEKLY_CONTRACTS,
  isMiniEventActive,
  rankPartyScores,
  utcWeekKey,
} from '../party-contracts';
import {hasExactCoopRoles,validateCoopRoster} from '../../coop/invariants';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const now = Date.UTC(2026, 8, 12, 12, 0, 0);

const baseParty: PersistentPartyState = {
  id: 'party-1', leaderAccountId: 'a1', leaderCharacterId: 'c1', focus: 'mixed', status: 'active',
  members: [{ accountId: 'a1', characterId: 'c1', role: 'damage', joinedAtMs: 1 }],
};

assert(persistentPartyCanExistWithCurrentRoles(baseParty.members), 'one-player persistent party must be valid');
let party = joinPersistentParty(baseParty, { accountId: 'a2', characterId: 'c2', role: 'tank', joinedAtMs: 2 });
party = joinPersistentParty(party, { accountId: 'a3', characterId: 'c3', role: 'support', joinedAtMs: 3 });
party = joinPersistentParty(party, { accountId: 'a4', characterId: 'c4', role: 'damage', joinedAtMs: 4 });
assert(party.members.length === 4, 'party should support four members');
assert(!canJoinPersistentParty(party, { accountId: 'a5', characterId: 'c5' }).allowed, 'party must reject fifth member');
assert(canAccessPersistentPartyChat(party, 'a2'), 'party chat should be accessible to current party members');
assert(evaluateLiveDungeonComposition(party.members).valid, '1T/2D/1S party may enter Live Dungeon queue');

const freeRoles = { ...party, members: party.members.map(member => ({ ...member, role: 'damage' as const })) };
assert(persistentPartyCanExistWithCurrentRoles(freeRoles.members), 'persistent party must not be role locked');
assert(!evaluateLiveDungeonComposition(freeRoles.members).valid, 'generic party roles must not bypass Live Dungeon exact composition');
assert(
  !hasExactCoopRoles(freeRoles.members.map(member => member.role!)),
  'actual Live Dungeon validator rejects unrestricted persistent Party roles',
);
assert(
  hasExactCoopRoles(party.members.map(member => member.role!)),
  'valid 1T/2D/1S online roster should start Live Dungeon',
);
validateCoopRoster(party.members.map(member=>({...member,role:member.role!})));

const afterLeaderLeaves = leavePersistentParty(party, 'a1');
assert(!afterLeaderLeaves.disbanded && afterLeaderLeaves.state.leaderAccountId === 'a2', 'leader should transfer to oldest remaining member');

const combatBudget = buildPartyContractBudget(SAMPLE_WEEKLY_CONTRACTS[0]);
assert(combatBudget.totalExpectedMinutes > 0 && combatBudget.totalTargetPoints > 0, 'contract needs expected-effort budget');

const fast = objectivePointBudget({ id: 'fast', activityKind: 'gathering', metric: 'fast_action', targetUnits: 120, expectedSecondsPerUnit: 5, difficulty: 'standard' });
const slow = objectivePointBudget({ id: 'slow', activityKind: 'crafting', metric: 'slow_action', targetUnits: 10, expectedSecondsPerUnit: 60, difficulty: 'standard' });
assert(Math.abs(fast - slow) <= 1, 'equal expected time should produce comparable points regardless of raw unit count');

const objective = combatBudget.objectives[0];
const capped = normalizedContributionDelta(objective, objective.targetUnits - 1, 99999);
assert(capped.acceptedUnits === 1, 'over-farming cannot score beyond objective target');

const members = ['a1', 'a2', 'a3', 'a4'];
let progress = createEmptyPartyContractProgress();
const first = recordVerifiedContribution(combatBudget, progress, members, {
  idempotencyKey: 'evt-00000001', accountId: 'a1', objectiveId: objective.id, deltaUnits: 10,
});
progress = first.progress;
const replay = recordVerifiedContribution(combatBudget, progress, members, {
  idempotencyKey: 'evt-00000001', accountId: 'a1', objectiveId: objective.id, deltaUnits: 10,
});
assert(replay.replayed && replay.normalizedPoints === 0, 'same contribution event must be idempotent');

// Fill objectives through verified events, but only a1 contributes. Contract completes globally while noncontributors are reward-ineligible.
for (const [index, item] of combatBudget.objectives.entries()) {
  progress = recordVerifiedContribution(combatBudget, progress, members, {
    idempotencyKey: `finish-${index}-0000`, accountId: 'a1', objectiveId: item.id, deltaUnits: item.targetUnits,
  }).progress;
}
const completion = evaluateContractCompletion(combatBudget, progress, members);
assert(completion.complete, 'shared party objectives should complete from pooled verified progress');
assert(completion.eligibleAccountIds.includes('a1'), 'contributor should be reward eligible');
assert(completion.ineligibleAccountIds.includes('a4'), 'minimum personal contribution must prevent leech rewards');

const miniBudget = buildPartyContractBudget(SAMPLE_MINI_EVENT_CONTRACTS[0]);
assert(miniBudget.totalTargetPoints > 0, 'temporary ranked mini-event must use the same normalized effort budget');
assert(isMiniEventActive({ eventKey: 'event', definition: SAMPLE_MINI_EVENT_CONTRACTS[0], startsAtMs: now - 1, endsAtMs: now + 1 }, now), 'mini event window should use authoritative timestamps');
const ranked = rankPartyScores([
  { partyId: 'late', normalizedPoints: 500, completedAtMs: 200 },
  { partyId: 'high', normalizedPoints: 700, completedAtMs: 300 },
  { partyId: 'early', normalizedPoints: 500, completedAtMs: 100 },
]);
assert(ranked.map(row => row.partyId).join(',') === 'high,early,late', 'rankings should prioritize normalized points then earlier completion');
assert(utcWeekKey(Date.UTC(2026, 8, 13)) === '2026-09-07', 'weekly contracts should key from Monday UTC');

console.log('party v16 tests passed');

const prototypeKey=recordVerifiedContribution(combatBudget,createEmptyPartyContractProgress(),members,{idempotencyKey:'constructor',accountId:'a1',objectiveId:objective.id,deltaUnits:1});
assert(!prototypeKey.replayed,'prototype property names are real event IDs, not inherited receipts');
let invalidEffort=false;
try{objectivePointBudget({...objective,setupMinutes:NaN});}catch{invalidEffort=true;}
assert(invalidEffort,'nonfinite preparation cannot create scores');
const disbanded=leavePersistentParty(baseParty,'a1');
assert(disbanded.disbanded&&!canAccessPersistentPartyChat(disbanded.state,'a1'),'last member disbands and loses chat');
