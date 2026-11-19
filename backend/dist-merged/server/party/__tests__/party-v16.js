"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const party_1 = require("../../social/party");
const party_contracts_1 = require("../party-contracts");
const invariants_1 = require("../../coop/invariants");
function assert(value, message) {
    if (!value)
        throw new Error(message);
}
const now = Date.UTC(2026, 8, 12, 12, 0, 0);
const baseParty = {
    id: 'party-1', leaderAccountId: 'a1', leaderCharacterId: 'c1', focus: 'mixed', status: 'active',
    members: [{ accountId: 'a1', characterId: 'c1', role: 'damage', joinedAtMs: 1 }],
};
assert((0, party_1.persistentPartyCanExistWithCurrentRoles)(baseParty.members), 'one-player persistent party must be valid');
let party = (0, party_1.joinPersistentParty)(baseParty, { accountId: 'a2', characterId: 'c2', role: 'tank', joinedAtMs: 2 });
party = (0, party_1.joinPersistentParty)(party, { accountId: 'a3', characterId: 'c3', role: 'support', joinedAtMs: 3 });
party = (0, party_1.joinPersistentParty)(party, { accountId: 'a4', characterId: 'c4', role: 'damage', joinedAtMs: 4 });
assert(party.members.length === 4, 'party should support four members');
assert(!(0, party_1.canJoinPersistentParty)(party, { accountId: 'a5', characterId: 'c5' }).allowed, 'party must reject fifth member');
assert((0, party_1.canAccessPersistentPartyChat)(party, 'a2'), 'party chat should be accessible to current party members');
assert((0, party_1.evaluateLiveDungeonComposition)(party.members).valid, '1T/2D/1S party may enter Live Dungeon queue');
const freeRoles = { ...party, members: party.members.map(member => ({ ...member, role: 'damage' })) };
assert((0, party_1.persistentPartyCanExistWithCurrentRoles)(freeRoles.members), 'persistent party must not be role locked');
assert(!(0, party_1.evaluateLiveDungeonComposition)(freeRoles.members).valid, 'generic party roles must not bypass Live Dungeon exact composition');
assert(!(0, invariants_1.hasExactCoopRoles)(freeRoles.members.map(member => member.role)), 'actual Live Dungeon validator rejects unrestricted persistent Party roles');
assert((0, invariants_1.hasExactCoopRoles)(party.members.map(member => member.role)), 'valid 1T/2D/1S online roster should start Live Dungeon');
(0, invariants_1.validateCoopRoster)(party.members.map(member => ({ ...member, role: member.role })));
const afterLeaderLeaves = (0, party_1.leavePersistentParty)(party, 'a1');
assert(!afterLeaderLeaves.disbanded && afterLeaderLeaves.state.leaderAccountId === 'a2', 'leader should transfer to oldest remaining member');
const combatBudget = (0, party_contracts_1.buildPartyContractBudget)(party_contracts_1.SAMPLE_WEEKLY_CONTRACTS[0]);
assert(combatBudget.totalExpectedMinutes > 0 && combatBudget.totalTargetPoints > 0, 'contract needs expected-effort budget');
const fast = (0, party_contracts_1.objectivePointBudget)({ id: 'fast', activityKind: 'gathering', metric: 'fast_action', targetUnits: 120, expectedSecondsPerUnit: 5, difficulty: 'standard' });
const slow = (0, party_contracts_1.objectivePointBudget)({ id: 'slow', activityKind: 'crafting', metric: 'slow_action', targetUnits: 10, expectedSecondsPerUnit: 60, difficulty: 'standard' });
assert(Math.abs(fast - slow) <= 1, 'equal expected time should produce comparable points regardless of raw unit count');
const objective = combatBudget.objectives[0];
const capped = (0, party_contracts_1.normalizedContributionDelta)(objective, objective.targetUnits - 1, 99999);
assert(capped.acceptedUnits === 1, 'over-farming cannot score beyond objective target');
const members = ['a1', 'a2', 'a3', 'a4'];
let progress = (0, party_contracts_1.createEmptyPartyContractProgress)();
const first = (0, party_contracts_1.recordVerifiedContribution)(combatBudget, progress, members, {
    idempotencyKey: 'evt-00000001', accountId: 'a1', objectiveId: objective.id, deltaUnits: 10,
});
progress = first.progress;
const replay = (0, party_contracts_1.recordVerifiedContribution)(combatBudget, progress, members, {
    idempotencyKey: 'evt-00000001', accountId: 'a1', objectiveId: objective.id, deltaUnits: 10,
});
assert(replay.replayed && replay.normalizedPoints === 0, 'same contribution event must be idempotent');
// Fill objectives through verified events, but only a1 contributes. Contract completes globally while noncontributors are reward-ineligible.
for (const [index, item] of combatBudget.objectives.entries()) {
    progress = (0, party_contracts_1.recordVerifiedContribution)(combatBudget, progress, members, {
        idempotencyKey: `finish-${index}-0000`, accountId: 'a1', objectiveId: item.id, deltaUnits: item.targetUnits,
    }).progress;
}
const completion = (0, party_contracts_1.evaluateContractCompletion)(combatBudget, progress, members);
assert(completion.complete, 'shared party objectives should complete from pooled verified progress');
assert(completion.eligibleAccountIds.includes('a1'), 'contributor should be reward eligible');
assert(completion.ineligibleAccountIds.includes('a4'), 'minimum personal contribution must prevent leech rewards');
const miniBudget = (0, party_contracts_1.buildPartyContractBudget)(party_contracts_1.SAMPLE_MINI_EVENT_CONTRACTS[0]);
assert(miniBudget.totalTargetPoints > 0, 'temporary ranked mini-event must use the same normalized effort budget');
assert((0, party_contracts_1.isMiniEventActive)({ eventKey: 'event', definition: party_contracts_1.SAMPLE_MINI_EVENT_CONTRACTS[0], startsAtMs: now - 1, endsAtMs: now + 1 }, now), 'mini event window should use authoritative timestamps');
const ranked = (0, party_contracts_1.rankPartyScores)([
    { partyId: 'late', normalizedPoints: 500, completedAtMs: 200 },
    { partyId: 'high', normalizedPoints: 700, completedAtMs: 300 },
    { partyId: 'early', normalizedPoints: 500, completedAtMs: 100 },
]);
assert(ranked.map(row => row.partyId).join(',') === 'high,early,late', 'rankings should prioritize normalized points then earlier completion');
assert((0, party_contracts_1.utcWeekKey)(Date.UTC(2026, 8, 13)) === '2026-09-07', 'weekly contracts should key from Monday UTC');
console.log('party v16 tests passed');
const prototypeKey = (0, party_contracts_1.recordVerifiedContribution)(combatBudget, (0, party_contracts_1.createEmptyPartyContractProgress)(), members, { idempotencyKey: 'constructor', accountId: 'a1', objectiveId: objective.id, deltaUnits: 1 });
assert(!prototypeKey.replayed, 'prototype property names are real event IDs, not inherited receipts');
let invalidEffort = false;
try {
    (0, party_contracts_1.objectivePointBudget)({ ...objective, setupMinutes: NaN });
}
catch {
    invalidEffort = true;
}
assert(invalidEffort, 'nonfinite preparation cannot create scores');
const disbanded = (0, party_1.leavePersistentParty)(baseParty, 'a1');
assert(disbanded.disbanded && !(0, party_1.canAccessPersistentPartyChat)(disbanded.state, 'a1'), 'last member disbands and loses chat');
// A second character changes the active fighter, not the account's Party slot.
const switchedLeader = (0, party_1.switchPersistentPartyCharacter)(party, {
    accountId: 'a1', characterId: 'c1-alt', classId: 'DAWNKEEPER',
    ownedCharacterIds: ['c1', 'c1-alt'],
});
assert(switchedLeader.leaderAccountId === 'a1' && switchedLeader.leaderCharacterId === 'c1-alt', 'leader character changes without transferring account leadership');
assert(switchedLeader.members.length === party.members.length
    && switchedLeader.members[0].joinedAtMs === party.members[0].joinedAtMs, 'switch preserves Party slot and joined-at contribution entitlement');
assert(switchedLeader.members[0].role === 'support'
    && !(0, party_1.evaluateLiveDungeonComposition)(switchedLeader.members).valid, 'switch recomputes role and cannot bypass exact dungeon composition');
const switchedMember = (0, party_1.switchPersistentPartyCharacter)(party, {
    accountId: 'a2', characterId: 'c2-alt', classId: 'KNIFE_DANCER',
    ownedCharacterIds: ['c2', 'c2-alt'],
});
assert(switchedMember.leaderCharacterId === 'c1'
    && switchedMember.members[1].characterId === 'c2-alt'
    && (0, party_1.canAccessPersistentPartyChat)(switchedMember, 'a2'), 'member can use alternate character without leaving Party or losing chat');
function switchRejected(input, reason) {
    let caught = false;
    try {
        (0, party_1.switchPersistentPartyCharacter)(party, input);
    }
    catch (error) {
        caught = error instanceof Error && error.message === reason;
    }
    assert(caught, `switch must reject ${reason}`);
}
switchRejected({ accountId: 'a2', characterId: 'c3', classId: 'KNIFE_DANCER',
    ownedCharacterIds: ['c2'] }, 'party_character_not_owned');
switchRejected({ accountId: 'a2', characterId: 'c2-alt', classId: 'KNIFE_DANCER',
    ownedCharacterIds: ['c2-alt'], activityLocked: true }, 'party_character_switch_activity_locked');
switchRejected({ accountId: 'outsider', characterId: 'c-out', classId: 'IRONWARDEN',
    ownedCharacterIds: ['c-out'] }, 'party_member_not_found');
switchRejected({ accountId: 'a2', characterId: 'c3', classId: 'KNIFE_DANCER',
    ownedCharacterIds: ['c2', 'c3'] }, 'party_duplicate_character');
assert((0, party_1.persistentPartyRoleForClass)('IRONWARDEN') === 'tank'
    && (0, party_1.persistentPartyRoleForClass)('DAWNKEEPER') === 'support'
    && (0, party_1.persistentPartyRoleForClass)('KNIFE_DANCER') === 'damage', 'class roles are derived from the selected character rather than UI-provided role');
const noChange = (0, party_1.switchPersistentPartyCharacter)(party, {
    accountId: 'a1', characterId: 'c1', classId: 'KNIFE_DANCER',
    ownedCharacterIds: ['c1'],
});
assert(noChange === party, 'switching to the same fighter and role avoids a needless roster update');
switchRejected({ accountId: 'a2', characterId: 'c2-alt', classId: 'UNKNOWN',
    ownedCharacterIds: ['c2', 'c2-alt'] }, 'party_unknown_character_class');
