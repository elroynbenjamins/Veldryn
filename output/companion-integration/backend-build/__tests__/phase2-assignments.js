"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assignments_1 = require("../assignments");
const content_1 = require("../content");
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
const p = (id, level = 30) => ({ companionId: id, level, xp: 0, ascensionTier: 3, bondLevel: 8, bondXp: 0, bondTraitUnlocked: false });
const owned = { UNIT_001: p('UNIT_001', 20), UNIT_002: p('UNIT_002', 20), UNIT_003: p('UNIT_003', 20), UNIT_013: p('UNIT_013', 25), UNIT_014: p('UNIT_014', 30), UNIT_015: p('UNIT_015', 30), UNIT_023: p('UNIT_023', 30), UNIT_024: p('UNIT_024', 35) };
const economy = { gold: 100000, companionEssence: 0, bondstones: 0, materials: { SUPPLIES: 99 } };
const now = Date.UTC(2026, 8, 11, 12);
// Use 4h Sunscar mission with a strong Tank + Support pair.
const ids = ['UNIT_015', 'UNIT_014'];
const valid = (0, assignments_1.validateCompanionMissionTeam)({ missionId: 'MISSION_SUNSCAR_4H', companionIds: ids, owned, assignments: [], equippedCompanionIds: new Set() });
ok(valid.ok, 'Valid mission team rejected');
const expectedA = (0, assignments_1.predictedCompanionMissionGrade)('MISSION_SUNSCAR_4H', ids, owned), expectedB = (0, assignments_1.predictedCompanionMissionGrade)('MISSION_SUNSCAR_4H', ids, owned);
eq(expectedA, expectedB, 'Grade calculation not deterministic');
let started = (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SUNSCAR_4H', companionIds: ids, owned, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 2, economy, serverNowMs: now, requestId: 'REQ_START_1' });
ok(started.economy.gold < economy.gold, 'Mission cost not deducted');
eq(economy.gold, 100000, 'Start mutated caller economy');
// 22 busy companion cannot start another mission (capacity 2 leaves room so busy rule is what matters).
throws(() => (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_015'], owned, assignments: [started.assignment], equippedCompanionIds: new Set(), expeditionPensLevel: 2, economy: started.economy, serverNowMs: now, requestId: 'REQ_BUSY' }), 'Busy companion started another assignment');
// Active Trial companions are also locked until that Trial run ends.
throws(() => (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_002'], owned, assignments: [], equippedCompanionIds: new Set(), lockedTrialCompanionIds: new Set(['UNIT_002']), expeditionPensLevel: 2, economy, serverNowMs: now, requestId: 'REQ_TRIAL_LOCK' }), 'Active Trial companion was sent on a Sanctuary mission');
// 23 equipped companion cannot be assigned.
throws(() => (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SUNSCAR_4H', companionIds: ids, owned, assignments: [], equippedCompanionIds: new Set(['UNIT_015']), expeditionPensLevel: 2, economy, serverNowMs: now, requestId: 'REQ_EQUIPPED' }), 'Equipped companion was silently assigned');
// 24 before endsAt cannot claim.
throws(() => (0, assignments_1.claimCompanionAssignment)({ assignment: started.assignment, owned, serverNowMs: Date.parse(started.assignment.endsAt) - 1, bondstonesClaimedThisWeek: 0 }), 'Early assignment claim succeeded');
// 25 claim after completion, 27/28 deterministic grade/reward.
const claim1 = (0, assignments_1.claimCompanionAssignment)({ assignment: started.assignment, owned, serverNowMs: Date.parse(started.assignment.endsAt) + 1, bondstonesClaimedThisWeek: 0 });
eq(claim1.assignment.status, 'claimed', 'Completed mission did not claim');
eq(claim1.assignment.performanceGrade, expectedA, 'Claim grade differs from prediction');
const deterministic = (0, assignments_1.claimCompanionAssignment)({ assignment: started.assignment, owned, serverNowMs: Date.parse(started.assignment.endsAt) + 5000, bondstonesClaimedThisWeek: 0 });
eq(JSON.stringify(claim1.reward), JSON.stringify(deterministic.reward), 'Mission reward not deterministic');
// 26 claimed cannot claim twice.
throws(() => (0, assignments_1.claimCompanionAssignment)({ assignment: claim1.assignment, owned, serverNowMs: Date.parse(started.assignment.endsAt) + 10000, bondstonesClaimedThisWeek: 0 }), 'Assignment claimed twice');
// 29 Pen capacity respected.
eq((0, assignments_1.companionExpeditionPenCapacity)(1), 1, 'Pen Lv1 capacity');
eq((0, assignments_1.companionExpeditionPenCapacity)(2), 2, 'Pen Lv2 capacity');
eq((0, assignments_1.companionExpeditionPenCapacity)(3), 3, 'Pen Lv3 capacity');
const other = { ...started.assignment, assignmentId: 'OTHER', companionIds: ['UNIT_023'], status: 'active' };
throws(() => (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_003'], owned, assignments: [other], equippedCompanionIds: new Set(), expeditionPensLevel: 1, economy, serverNowMs: now, requestId: 'REQ_CAP' }), 'Pen capacity exceeded');
// 30 cost deducted exactly once by one start result; repeating the same pure call yields same result but production receipt protects application transaction.
const startedAgain = (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SUNSCAR_4H', companionIds: ids, owned, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 2, economy, serverNowMs: now, requestId: 'REQ_START_1' });
eq(startedAgain.economy.gold, started.economy.gold, 'Deterministic start cost mismatch');
eq(startedAgain.assignment.assignmentId, started.assignment.assignmentId, 'Deterministic assignment ID mismatch');
// 31 failed request deducts nothing.
const before = JSON.stringify(economy);
throws(() => (0, assignments_1.startCompanionAssignment)({ accountId: 'A1', missionId: 'MISSION_SUNSCAR_4H', companionIds: ['UNIT_015'], owned, assignments: [], equippedCompanionIds: new Set(), expeditionPensLevel: 2, economy, serverNowMs: now, requestId: 'REQ_FAIL' }), 'Invalid team unexpectedly started');
eq(JSON.stringify(economy), before, 'Failed mission mutated economy');
// 32 expedition Bond is explicitly reduced to 25% of mission active-equivalent budget before grade multiplier.
const mission = (0, content_1.companionMission)('MISSION_SUNSCAR_4H'), gradeMult = claim1.assignment.performanceGrade === 'S' ? 1.5 : claim1.assignment.performanceGrade === 'A' ? 1.25 : claim1.assignment.performanceGrade === 'B' ? 1.1 : 1;
eq(claim1.reward.bondXp, Math.max(1, Math.round(mission.baseRewards.bondXp * content_1.COMPANION_EXPEDITION_BOND_RATE * gradeMult)), 'Expedition Bond rate mismatch');
console.log('companion-phase2-assignments: PASS');
