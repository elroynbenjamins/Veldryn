"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const phase2_application_1 = require("../phase2-application");
const ok = (v, m) => { if (!v)
    throw new Error(m); };
const eq = (a, b, m) => { if (a !== b)
    throw new Error(`${m}: expected ${String(b)}, got ${String(a)}`); };
const p = (id, level = 25) => ({ companionId: id, level, xp: 0, ascensionTier: 3, bondLevel: 8, bondXp: 0, bondTraitUnlocked: false });
class Repo {
    state = { owned: { UNIT_001: p('UNIT_001', 20), UNIT_002: p('UNIT_002', 20), UNIT_003: p('UNIT_003', 20), UNIT_004: p('UNIT_004', 25) }, economy: { gold: 100000, companionEssence: 5000, bondstones: 10, materials: { IRONWOOD_FANG: 99, SUPPLIES: 99 } }, sanctuary: { trainingGroundLevel: 1, essenceBasinLevel: 1, bondHallLevel: 1, expeditionPensLevel: 3, masteryChamberLevel: 1 }, assignments: [], equippedCompanionIds: [], trialsUnlocked: true, profile: { showcaseCompanionIds: [] }, assignmentBondstonesClaimedThisWeek: 0, specialBossClears: [] };
    receipts = new Map();
    async transact(i, work) { const key = `${i.accountId}|${i.action}|${i.requestId}`, prior = this.receipts.get(key); if (prior) {
        if (prior.fp !== i.fingerprint)
            throw new Error('request_id_conflict');
        return structuredClone(prior.result);
    } const done = await work(structuredClone(this.state)); this.state = done.state; this.receipts.set(key, { fp: i.fingerprint, result: structuredClone(done.result) }); return done.result; }
}
const combat = { simulate(input) { return { victory: true, durationMs: 22000, reason: 'victory', players: input.players.map(x => ({ definition: { id: x.id }, alive: true })) }; } };
async function run() {
    const repo = new Repo();
    const clock = { nowMs: () => Date.UTC(2026, 8, 11, 12) };
    const app = new phase2_application_1.CompanionPhase2Application(repo, combat, clock);
    const first = await app.startTrial('A1', { requestId: 'REQ_TRIAL', teamIds: ['UNIT_001', 'UNIT_002', 'UNIT_003'], seed: 'APP' });
    const replay = await app.startTrial('A1', { requestId: 'REQ_TRIAL', teamIds: ['UNIT_001', 'UNIT_002', 'UNIT_003'], seed: 'APP' });
    eq(first.run.runId, replay.run.runId, 'Trial start idempotency returned different run');
    eq(repo.state.trialProgress?.season.activeRun?.runId, first.run.runId, 'Idempotent replay changed Trial state');
    let locked = false;
    try {
        await app.startAssignment('A1', { requestId: 'REQ_LOCKED', missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_001'] });
    }
    catch (e) {
        locked = e.message === 'trial_companion_cannot_be_assigned';
    }
    ok(locked, 'Application allowed active Trial companion on Sanctuary mission');
    const gold = repo.state.economy.gold;
    const mission = await app.startAssignment('A1', { requestId: 'REQ_MISSION', missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_004'] });
    const missionReplay = await app.startAssignment('A1', { requestId: 'REQ_MISSION', missionId: 'MISSION_SCOUT_2H', companionIds: ['UNIT_004'] });
    eq(mission.assignment.assignmentId, missionReplay.assignment.assignmentId, 'Assignment idempotency returned different mission');
    eq(repo.state.assignments.length, 1, 'Assignment replay duplicated assignment');
    eq(repo.state.economy.gold, gold - 300, 'Assignment replay charged twice');
    console.log('companion-phase2-application: PASS');
}
void run();
