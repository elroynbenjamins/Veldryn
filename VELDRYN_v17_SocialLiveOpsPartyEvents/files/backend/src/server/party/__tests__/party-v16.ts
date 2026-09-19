import {
  PARTY_CONTRACT_DAILY_CREDIT_CAP,
  PARTY_CONTRACT_MAX_ACCOUNT_COMPLETION_SHARE,
  creditContribution,
  evaluatePartyContract,
  memberEligibleForFullContractReward,
  scoreContribution,
  type PartyContractDefinition,
} from '../party-contracts';
import { getPartyContractRotation, partyContractWeekKey } from '../party-contract-schedule';
import { basePartyCompositionAllowed, canJoinPersistentParty, type PersistentPartySnapshot } from '../party-policy';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const party: PersistentPartySnapshot = {
  partyId: 'p1',
  leaderAccountId: 'a1',
  joinPolicy: 'request_to_join',
  activityPreference: 'mixed',
  members: [
    { accountId: 'a1', characterId: 'c1', joinedAtMs: 1 },
    { accountId: 'a2', characterId: 'c2', joinedAtMs: 2 },
  ],
};

assert(basePartyCompositionAllowed(1), 'one-member persistent party should be valid');
assert(basePartyCompositionAllowed(4), 'four-member persistent party should be valid');
assert(!basePartyCompositionAllowed(5), 'five-member persistent party should be rejected');
assert(canJoinPersistentParty(party, 'a3', false).allowed, 'request-to-join party should accept a candidate');
assert(!canJoinPersistentParty({ ...party, members: [...party.members, { accountId: 'a3', characterId: 'c3', joinedAtMs: 3 }, { accountId: 'a4', characterId: 'c4', joinedAtMs: 4 }] }, 'a5', false).allowed, 'full party should reject candidate');

const routineHour = scoreContribution({
  profile: { id: 'test', category: 'skilling', expectedSecondsPerUnit: 3600, challenge: 'routine' },
  units: 1,
});
assert(routineHour === 1000, 'one routine standardized hour should equal 1000 points');

const boss = scoreContribution({
  profile: { id: 'boss', category: 'combat', expectedSecondsPerUnit: 240, challenge: 'boss' },
  units: 1,
});
const routine = scoreContribution({
  profile: { id: 'routine', category: 'combat', expectedSecondsPerUnit: 240, challenge: 'routine' },
  units: 1,
});
assert(boss > routine, 'boss effort should outscore equal-time routine effort');

const capped = creditContribution({
  rawEventPoints: 5000,
  pointsCreditedToday: 0,
  pointsCreditedForCompletionByAccount: 0,
  contractTargetPoints: 3600,
});
assert(capped.dailyCreditedPoints === PARTY_CONTRACT_DAILY_CREDIT_CAP, 'daily contribution cap must apply');
assert(capped.completionCreditedPoints <= Math.ceil(3600 * PARTY_CONTRACT_MAX_ACCOUNT_COMPLETION_SHARE), 'one account completion share cap must apply');

const combatContract: PartyContractDefinition = {
  id: 'combat',
  name: 'Combat',
  focus: 'combat',
  description: '',
  targetPoints: 3600,
  estimatedPartyHours: 3.6,
  rewardTier: 'standard',
};
const progress = [
  { accountId: 'a1', rawPoints: 2500, completionPoints: 2500, combatPoints: 2500, skillingPoints: 0 },
  { accountId: 'a2', rawPoints: 1100, completionPoints: 1100, combatPoints: 1100, skillingPoints: 0 },
];
const evaluation = evaluatePartyContract(combatContract, progress);
assert(evaluation.complete, 'two meaningful contributors should be able to complete a combat contract');
assert(memberEligibleForFullContractReward(combatContract, progress[1]), 'second contributor should be reward eligible');

const leechProgress = [
  { accountId: 'a1', rawPoints: 3500, completionPoints: 3500, combatPoints: 3500, skillingPoints: 0 },
  { accountId: 'a2', rawPoints: 100, completionPoints: 100, combatPoints: 100, skillingPoints: 0 },
];
assert(!evaluatePartyContract(combatContract, leechProgress).complete, 'one tiny contributor must not satisfy social completion');
assert(!memberEligibleForFullContractReward(combatContract, leechProgress[1]), 'late leech should not receive full reward');

const mixed: PartyContractDefinition = {
  id: 'mixed',
  name: 'Mixed',
  focus: 'mixed',
  description: '',
  targetPoints: 4000,
  estimatedPartyHours: 4,
  mixedMinimumFractionPerCategory: 0.30,
  rewardTier: 'enhanced',
};
assert(!evaluatePartyContract(mixed, [
  { accountId: 'a1', rawPoints: 2800, completionPoints: 2800, combatPoints: 2800, skillingPoints: 0 },
  { accountId: 'a2', rawPoints: 1200, completionPoints: 1200, combatPoints: 1200, skillingPoints: 0 },
]).complete, 'mixed contract must actually include skilling');
assert(evaluatePartyContract(mixed, [
  { accountId: 'a1', rawPoints: 2200, completionPoints: 2200, combatPoints: 1600, skillingPoints: 600 },
  { accountId: 'a2', rawPoints: 1800, completionPoints: 1800, combatPoints: 600, skillingPoints: 1200 },
]).complete, 'mixed contract should complete when both categories meet the minimum');

const rotation = getPartyContractRotation(new Date('2026-09-13T12:00:00Z'));
assert(rotation.contracts.length === 3, 'rotation must contain exactly three weekly contracts');
assert(rotation.contracts.some((x) => x.focus === 'combat') && rotation.contracts.some((x) => x.focus === 'skilling') && rotation.contracts.some((x) => x.focus === 'mixed'), 'rotation must contain combat, skilling and mixed');
assert(partyContractWeekKey(new Date('2026-09-13T12:00:00Z')) === '2026-09-07', 'week key should use Monday UTC');

console.log('party-v16 ok');
