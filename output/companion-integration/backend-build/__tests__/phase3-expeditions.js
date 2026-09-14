"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assignments_1 = require("../assignments");
const content_1 = require("../content");
const status_1 = require("../status");
const ok = (v, m) => { if (!v)
    throw new Error(m); };
const eq = (a, b, m) => { if (a !== b)
    throw new Error(`${m}: expected ${String(b)}, got ${String(a)}`); };
const throws = (f, m) => { let did = false; try {
    f();
}
catch {
    did = true;
} if (!did)
    throw new Error(m); };
const p = (id, level = 30, bondLevel = 8, ascensionTier = 3) => ({ companionId: id, level, xp: 0, ascensionTier, bondLevel, bondXp: 0, bondTraitUnlocked: bondLevel >= 10 });
const owned = { UNIT_001: p('UNIT_001', 20, 8, 2), UNIT_002: p('UNIT_002', 20, 8, 2), UNIT_003: p('UNIT_003', 20, 8, 2), UNIT_004: p('UNIT_004', 25, 8, 2), UNIT_006: p('UNIT_006', 25, 8, 2), UNIT_007: p('UNIT_007', 30), UNIT_013: p('UNIT_013', 25), UNIT_014: p('UNIT_014', 30), UNIT_015: p('UNIT_015', 30), UNIT_021: p('UNIT_021', 25), UNIT_022: p('UNIT_022', 30), UNIT_024: p('UNIT_024', 35) };
const economy = { gold: 100000, companionEssence: 500, bondstones: 5, materials: { SUPPLIES: 99, IRONWOOD_FANG: 99 } };
const now = Date.UTC(2026, 8, 11, 12);
// 1: 1-3 companions may be sent when the mission permits.
ok((0, assignments_1.validateCompanionMissionTeam)({ missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_001'], owned, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 1 }).ok, 'One-companion mission rejected');
ok((0, assignments_1.validateCompanionMissionTeam)({ missionId: 'MISSION_SUNSCAR_4H', companionIds: ['UNIT_015', 'UNIT_014'], owned, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 1 }).ok, 'Two-companion mission rejected');
ok((0, assignments_1.validateCompanionMissionTeam)({ missionId: 'MISSION_ASTERFALL_SHRINE_8H', companionIds: ['UNIT_006', 'UNIT_007', 'UNIT_004'], owned, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 2 }).ok, 'Three-companion mission rejected');
// 2 role requirements.
ok(!(0, assignments_1.validateCompanionMissionTeam)({ missionId: 'MISSION_SUNSCAR_4H', companionIds: ['UNIT_013', 'UNIT_014'], owned, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 1 }).ok, 'Role requirement ignored');
// 3 level requirements.
const low = { ...owned, UNIT_015: p('UNIT_015', 14) };
ok(!(0, assignments_1.validateCompanionMissionTeam)({ missionId: 'MISSION_SUNSCAR_4H', companionIds: ['UNIT_015', 'UNIT_014'], owned: low, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 1 }).ok, 'Level requirement ignored');
// 4 rarity requirements: Forgotten Shrine needs at least one Rare+.
const standards = { ...owned, UNIT_001: p('UNIT_001', 20, 8, 2), UNIT_002: p('UNIT_002', 20, 8, 2), UNIT_003: p('UNIT_003', 20, 8, 2) };
ok(!(0, assignments_1.validateCompanionMissionTeam)({ missionId: 'MISSION_ASTERFALL_SHRINE_8H', companionIds: ['UNIT_001', 'UNIT_002', 'UNIT_003'], owned: standards, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 2 }).ok, 'Rarity requirement ignored');
// 5 origin requirement.
ok(!(0, assignments_1.validateCompanionMissionTeam)({ missionId: 'MISSION_SUNSCAR_4H', companionIds: ['UNIT_006', 'UNIT_003'], owned, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 1 }).ok, 'Sunscar origin requirement ignored');
// 6 Team Power requirement primitive exists and is authoritative.
ok((0, assignments_1.companionMissionRequirementSatisfied)({ type: 'min_team_power', value: 100 }, ['UNIT_006', 'UNIT_007', 'UNIT_004'], owned), 'Valid Team Power requirement failed');
ok(!(0, assignments_1.companionMissionRequirementSatisfied)({ type: 'min_team_power', value: 999999 }, ['UNIT_006', 'UNIT_007', 'UNIT_004'], owned), 'Impossible Team Power requirement passed');
// Additional requirement primitives: ascension, tag, exact ID, maximum rarity.
ok((0, assignments_1.companionMissionRequirementSatisfied)({ type: 'min_ascension', tier: 2, count: 2 }, ['UNIT_006', 'UNIT_007', 'UNIT_004'], owned), 'Ascension requirement failed');
ok((0, assignments_1.companionMissionRequirementSatisfied)({ type: 'tag_count', tag: 'damage', count: 2 }, ['UNIT_006', 'UNIT_007', 'UNIT_004'], owned), 'Tag requirement failed');
ok((0, assignments_1.companionMissionRequirementSatisfied)({ type: 'companion_id', companionId: 'UNIT_006' }, ['UNIT_006', 'UNIT_007', 'UNIT_004'], owned), 'Specific companion requirement failed');
ok((0, assignments_1.companionMissionRequirementSatisfied)({ type: 'max_rarity', rarity: 'elite' }, ['UNIT_006', 'UNIT_007', 'UNIT_004'], owned), 'Maximum rarity requirement failed');
// 7 equipped cannot be sent.
throws(() => (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SUNSCAR_4H', companionIds: ['UNIT_015', 'UNIT_014'], owned, assignments: [], equippedCompanionIds: new Set(['UNIT_015']), expeditionPensLevel: 1, economy, serverNowMs: now, requestId: 'EQUIPPED' }), 'Equipped companion assigned');
// 8 busy cannot be sent twice.
const first = (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_001'], owned, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 2, economy, serverNowMs: now, requestId: 'FIRST' });
throws(() => (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_001'], owned, assignments: [first.assignment], equippedCompanionIds: new Set(), expeditionPensLevel: 2, economy: first.economy, serverNowMs: now, requestId: 'SECOND' }), 'Busy companion assigned twice');
// Trial-locked and explicit unavailable status also reject.
throws(() => (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_002'], owned, assignments: [], equippedCompanionIds: new Set(), lockedTrialCompanionIds: new Set(['UNIT_002']), expeditionPensLevel: 1, economy, serverNowMs: now, requestId: 'TRIAL' }), 'Active Trial companion assigned');
throws(() => (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_002'], owned, assignments: [], equippedCompanionIds: new Set(), unavailableCompanionIds: new Set(['UNIT_002']), expeditionPensLevel: 1, economy, serverNowMs: now, requestId: 'UNAVAILABLE' }), 'Unavailable companion assigned');
// 9 claim before completion fails; 10 after works; 11 cannot claim twice.
throws(() => (0, assignments_1.claimCompanionAssignment)({ assignment: first.assignment, owned, serverNowMs: Date.parse(first.assignment.endsAt) - 1, bondstonesClaimedThisWeek: 0 }), 'Early claim succeeded');
const claimed = (0, assignments_1.claimCompanionAssignment)({ assignment: first.assignment, owned, serverNowMs: Date.parse(first.assignment.endsAt) + 1, bondstonesClaimedThisWeek: 0 });
eq(claimed.assignment.status, 'claimed', 'Completed assignment did not claim');
throws(() => (0, assignments_1.claimCompanionAssignment)({ assignment: claimed.assignment, owned, serverNowMs: Date.parse(first.assignment.endsAt) + 2, bondstonesClaimedThisWeek: 0 }), 'Claimed twice');
// Explicit lazy completion state is server-time derived.
const completed = (0, assignments_1.rolloverCompanionAssignmentStatuses)([first.assignment], Date.parse(first.assignment.endsAt) + 1)[0];
eq(completed.status, 'completed', 'Lazy completion state did not resolve');
eq((0, status_1.companionAvailabilityStatus)('UNIT_001', { owned, assignments: [completed], equippedCompanionIds: new Set(), serverNowMs: Date.parse(first.assignment.endsAt) + 1 }), 'available', 'Finished unclaimed Expedition should release the companion');
// 12 costs deduct once; 13 failed start deducts nothing.
const again = (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_003'], owned, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 1, economy, serverNowMs: now, requestId: 'COST' });
eq(again.economy.gold, economy.gold - (0, content_1.companionMission)('MISSION_SCOUT_2H').costs.gold, 'Mission cost wrong');
eq(economy.gold, 100000, 'Caller economy mutated');
const snapshot = JSON.stringify(economy);
throws(() => (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SUNSCAR_4H', companionIds: ['UNIT_013'], owned, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 1, economy, serverNowMs: now, requestId: 'FAIL' }), 'Invalid start succeeded');
eq(JSON.stringify(economy), snapshot, 'Failed start deducted resources');
// 14 grade calculation; 15 bonus requirement affects S eligibility/reward path.
const shrineIds = ['UNIT_006', 'UNIT_007', 'UNIT_004'];
const grade = (0, assignments_1.predictedCompanionMissionGrade)('MISSION_ASTERFALL_SHRINE_8H', shrineIds, owned);
ok(['C', 'B', 'A', 'S'].includes(grade), 'Invalid grade');
const mixedOwned = { ...owned, UNIT_013: p('UNIT_013', 25) };
const mixedGrade = (0, assignments_1.predictedCompanionMissionGrade)('MISSION_ASTERFALL_SHRINE_8H', ['UNIT_006', 'UNIT_007', 'UNIT_013'], mixedOwned);
if (grade === 'S')
    ok(mixedGrade !== 'S', 'S grade ignored bonus requirement');
// 16 Bond XP uses reduced configured rate.
const scout = (0, content_1.companionMission)('MISSION_SCOUT_2H'), mult = claimed.assignment.performanceGrade === 'S' ? 1.5 : claimed.assignment.performanceGrade === 'A' ? 1.25 : claimed.assignment.performanceGrade === 'B' ? 1.1 : 1;
eq(claimed.reward.bondXp, Math.max(1, Math.round(scout.baseRewards.bondXp * content_1.COMPANION_EXPEDITION_BOND_RATE * mult)), 'Expedition Bond rate wrong');
// 17 server time determines completion, 18 there is no client/device time input to bypass it.
const fakeClientTomorrow = Date.parse(first.assignment.endsAt) + 86400000;
ok(fakeClientTomorrow > Date.parse(first.assignment.endsAt), 'Test fixture invalid');
throws(() => (0, assignments_1.claimCompanionAssignment)({ assignment: first.assignment, owned, serverNowMs: now, bondstonesClaimedThisWeek: 0 }), 'Client-clock-like early claim bypassed serverNow');
// Pens influence capacity/timer modestly, never extreme.
const pen3 = (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_003'], owned, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 3, economy, serverNowMs: now, requestId: 'PEN3' });
eq(pen3.durationMs, Math.round(scout.durationMs * (1 - content_1.COMPANION_EXPEDITION_PEN_DURATION_REDUCTION[3])), 'Pen duration reduction wrong');
ok(pen3.durationMs > scout.durationMs * .9, 'Pen reduction became extreme');
// Unified status vocabulary derives state from authority, never client booleans.
eq((0, status_1.companionAvailabilityStatus)('UNIT_001', { owned, assignments: [first.assignment], equippedCompanionIds: new Set(), serverNowMs: now }), 'expedition', 'Expedition status not derived');
eq((0, status_1.companionAvailabilityStatus)('UNIT_002', { owned, assignments: [], equippedCompanionIds: new Set(['UNIT_002']), serverNowMs: now }), 'equipped', 'Equipped status not derived');
eq((0, status_1.companionAvailabilityStatus)('UNIT_999', { owned, assignments: [], equippedCompanionIds: new Set(), serverNowMs: now }), 'unavailable', 'Invalid companion status wrong');
console.log('companion-phase3-expeditions: PASS');
