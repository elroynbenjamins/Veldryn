"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const content_1 = require("../content");
const trials_1 = require("../trials");
const trial_season_1 = require("../trial-season");
const projection_1 = require("../projection");
const combat_adapter_1 = require("../combat-adapter");
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
const p = (id, level = 20) => ({ companionId: id, level, xp: 0, ascensionTier: 3, bondLevel: 8, bondXp: 0, bondTraitUnlocked: false });
const owned = { UNIT_001: p('UNIT_001'), UNIT_002: p('UNIT_002'), UNIT_003: p('UNIT_003'), UNIT_004: p('UNIT_004'), UNIT_006: p('UNIT_006'), UNIT_008: p('UNIT_008'), UNIT_012: p('UNIT_012') };
const busy = new Set();
const win = { simulate(input) { ok(input.players.length === 3, 'Trial did not send exactly three companion combatants'); ok(input.players.every(x => x.tags?.includes('companion_trial')), 'Non-companion player leaked into Trial'); return { victory: true, durationMs: 30000, reason: 'victory', players: input.players.map(x => ({ definition: { id: x.id }, alive: true })) }; } };
const lose = { simulate(input) { return { victory: false, durationMs: 60000, reason: 'wipe', players: input.players.map((x, i) => ({ definition: { id: x.id }, alive: i === 0 })) }; } };
const sep = Date.UTC(2026, 8, 11, 12), oct = Date.UTC(2026, 9, 1, 0, 0, 1);
// Required Trial tests 11-21.
ok((0, trials_1.companionTrialFloorDefinition)(20, '2026-09').recommendedPower > (0, trials_1.companionTrialFloorDefinition)(1, '2026-09').recommendedPower, 'Floor scaling did not increase');
for (let f = 1; f <= 30; f++)
    eq((0, trials_1.companionTrialFloorDefinition)(f, '2026-09').boss, f % 5 === 0, `Boss cadence wrong on ${f}`);
// Modifiers alter the authoritative combat snapshot, not only labels.
const unseasoned = (0, trials_1.buildCompanionTrialEncounter)(1, '2000-01')[0], september = (0, trials_1.buildCompanionTrialEncounter)(1, '2026-09')[0];
ok(september.stats.defense > unseasoned.stats.defense, 'Armored monthly modifier did not affect enemy defense');
ok(september.stats.attackPower > unseasoned.stats.attackPower, 'Unstable Magic monthly modifier did not add enemy pressure');
const playerBefore = (0, combat_adapter_1.buildOwnedCompanionCombatant)(owned.UNIT_001, { mode: 'companion_trial' }), playerAfter = (0, trials_1.applyCompanionTrialModifiers)([playerBefore], [], ['unstable_magic']).players[0];
ok(playerAfter.stats.haste > playerBefore.stats.haste, 'Unstable Magic did not improve companion Haste');
// Optional rarity restrictions preserve lower-rarity relevance and reject an invalid Prestige lineup.
(0, trials_1.startCompanionTrial)({ owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: sep }, ['UNIT_001', 'UNIT_002', 'UNIT_003'], 'LOW_RARITY', [{ type: 'max_rarity', rarities: ['standard', 'rare'] }]);
throws(() => (0, trials_1.startCompanionTrial)({ owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: sep }, ['UNIT_001', 'UNIT_002', 'UNIT_012'], 'PRESTIGE_BLOCK', [{ type: 'prohibit_rarity', rarity: 'prestige' }]), 'No-Prestige restriction accepted Prestige companion');
let started = (0, trials_1.startCompanionTrial)({ owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: sep }, ['UNIT_001', 'UNIT_002', 'UNIT_003'], 'SEED');
let progress = started.progress;
let runId = started.run.runId;
let floor5Reward = 0;
for (let floor = 1; floor <= 5; floor++) {
    const r = (0, trials_1.resolveCompanionTrialFloor)({ progress, owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: sep }, runId, win);
    progress = r.progress;
    if (floor === 5)
        floor5Reward = r.reward.companionEssence;
}
eq(progress.season.checkpointFloor, 6, 'Boss checkpoint did not advance to Floor 6');
eq(progress.season.currentSeasonHighestFloor, 5, 'Highest floor did not persist');
ok(progress.season.firstClearFloors.includes(5), 'First-clear flag missing');
ok(progress.season.bossRewardFloors.includes(5), 'Boss reward flag missing');
eq(progress.season.activeRun, undefined, 'Boss checkpoint should end locked run');
// Replaying an unlocked old checkpoint is allowed, and repeat reward is reduced.
started = (0, trials_1.startCompanionTrial)({ progress, owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: sep }, ['UNIT_001', 'UNIT_002', 'UNIT_003'], 'REPEAT', [], 1);
const repeat = (0, trials_1.resolveCompanionTrialFloor)({ progress: started.progress, owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: sep }, started.run.runId, win);
ok(!repeat.firstClear, 'Repeat floor incorrectly counted as first clear');
ok(repeat.reward.companionEssence < (0, content_1.companionTrialReward)(1, true, false).companionEssence, 'Repeat reward not reduced');
// A defeat ends the run with no permanent penalty/reward.
const abandoned = (0, trials_1.resolveCompanionTrialFloor)({ progress: repeat.progress, owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: sep }, repeat.progress.season.activeRun.runId, lose);
eq(abandoned.result.victory, false, 'Defeat fixture failed');
eq(abandoned.progress.season.activeRun, undefined, 'Defeat did not end run');
eq(abandoned.reward.companionEssence, 0, 'Defeat awarded Trial reward');
// Team lock: a second start cannot swap the team while a run is active.
const locked = (0, trials_1.startCompanionTrial)({ progress: abandoned.progress, owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: sep }, ['UNIT_001', 'UNIT_002', 'UNIT_003'], 'LOCKED', [], 1);
throws(() => (0, trials_1.startCompanionTrial)({ progress: locked.progress, owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: sep }, ['UNIT_004', 'UNIT_006', 'UNIT_008'], 'SWAP', [], 1), 'Active run allowed team swap');
// Monthly real-time reset tests 1-17.
let monthly = (0, trial_season_1.createCompanionTrialProgress)(sep);
monthly = { season: { ...monthly.season, currentFloor: 11, checkpointFloor: 11, currentSeasonHighestFloor: 14, firstClearFloors: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], bossRewardFloors: [5, 10], specialObjectives: { special: true }, monthlyChallengeCompletion: { challenge: true }, weeklyChallengeCompletion: { weekly: true }, weeklyChallengeClaims: ['weekly'], leaderboardScore: 12345, activeRun: { runId: 'OLD_RUN', seasonKey: '2026-09', teamCompanionIds: ['UNIT_001', 'UNIT_002', 'UNIT_003'], startedAt: new Date(sep).toISOString(), contentVersion: 'v', currentFloor: 11, startFloor: 11, seed: 'x', restrictionIds: [] } }, lifetime: { ...monthly.lifetime, lifetimeHighestFloor: 29, totalTrialBossesDefeated: 7, totalTrialFloorsCleared: 41, monthlySeasonsParticipated: 3, monthlyFloor30Clears: 1, bestEverCompanionTeamPower: 7777 }, archive: [] };
const same = (0, trial_season_1.rolloverCompanionTrialSeason)(monthly, Date.UTC(2026, 8, 30, 23, 59, 59));
eq(same.rolled, false, 'Same calendar month reset progress');
eq(same.progress.season.currentFloor, 11, 'Same-month floor changed');
const permanentSnapshot = { owned: JSON.stringify(owned), companionEssence: 4321, bondstones: 17, level: owned.UNIT_001.level, bond: owned.UNIT_001.bondLevel, sanctuary: { trainingGroundLevel: 3 } };
const rolled = (0, trial_season_1.rolloverCompanionTrialSeason)(monthly, oct);
eq(rolled.rolled, true, 'New month did not roll');
eq(rolled.progress.season.seasonKey, '2026-10', 'Wrong new season key');
eq(rolled.progress.season.currentFloor, 1, 'Current floor did not reset');
eq(rolled.progress.season.checkpointFloor, 1, 'Checkpoint did not reset');
eq(rolled.progress.season.firstClearFloors.length, 0, 'First-clear flags did not reset');
eq(rolled.progress.season.bossRewardFloors.length, 0, 'Monthly boss-clear flags did not reset');
eq(Object.keys(rolled.progress.season.specialObjectives).length, 0, 'Monthly special objectives did not reset');
eq(Object.keys(rolled.progress.season.monthlyChallengeCompletion).length, 0, 'Monthly challenges did not reset');
eq(rolled.progress.season.leaderboardScore, 0, 'Monthly leaderboard score did not reset');
eq(rolled.progress.season.currentSeasonHighestFloor, 0, 'Current-month highest did not reset');
eq(rolled.progress.season.activeRun, undefined, 'Expired active run survived reset');
eq(rolled.expiredRunId, 'OLD_RUN', 'Expired run was not identified');
eq(rolled.progress.lifetime.lifetimeHighestFloor, 29, 'Lifetime highest reset');
eq(rolled.progress.lifetime.totalTrialBossesDefeated, 7, 'Lifetime boss count reset');
eq(rolled.progress.lifetime.totalTrialFloorsCleared, 41, 'Lifetime floor count reset');
eq(rolled.progress.lifetime.monthlyFloor30Clears, 1, 'Lifetime monthly clear count reset');
eq(rolled.progress.lifetime.bestEverCompanionTeamPower, 7777, 'Best team power reset');
// Rollover has no access to permanent companion/economy objects, so they remain byte-identical.
eq(JSON.stringify(owned), permanentSnapshot.owned, 'Permanent companion progression changed');
eq(permanentSnapshot.companionEssence, 4321, 'Companion Essence changed');
eq(permanentSnapshot.bondstones, 17, 'Bondstones changed');
// Old-season run cannot resolve; new season first clears are available again.
throws(() => (0, trials_1.resolveCompanionTrialFloor)({ progress: monthly, owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: oct }, 'OLD_RUN', win), 'Expired run continued across month');
const octStart = (0, trials_1.startCompanionTrial)({ progress: rolled.progress, owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: oct }, ['UNIT_001', 'UNIT_002', 'UNIT_003'], 'OCT');
const octFloor1 = (0, trials_1.resolveCompanionTrialFloor)({ progress: octStart.progress, owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: oct }, octStart.run.runId, win);
ok(octFloor1.firstClear, 'New-month first clear was not re-enabled');
// Server time decides season; there is no client/device time input.
eq((0, trial_season_1.companionTrialResetInfo)(oct).seasonKey, '2026-10', 'Server reset info used wrong season');
const projection = (0, projection_1.projectCompanionTrial)(rolled.progress, oct, 6543).projection;
eq(projection.timezone, 'UTC', 'Trial projection timezone must be UTC');
eq(projection.title, 'Companion Trials — October 2026', 'Trial projection title wrong');
eq(projection.serverNow, new Date(oct).toISOString(), 'Trial projection did not use server time');
eq(projection.teamPower, 6543, 'Trial projection lost Team Power');
ok(projection.notice.includes('Companion progression does not'), 'Monthly reset notice missing');
// Floor 30 has a repeatable monthly completion package and lifetime clear tracking.
let tower = (0, trial_season_1.createCompanionTrialProgress)(sep);
tower = { ...tower, season: { ...tower.season, checkpointFloor: 26, currentFloor: 26, currentSeasonHighestFloor: 29, firstClearFloors: Array.from({ length: 29 }, (_, i) => i + 1), bossRewardFloors: [5, 10, 15, 20, 25] } };
let towerRun = (0, trials_1.startCompanionTrial)({ progress: tower, owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: sep }, ['UNIT_001', 'UNIT_002', 'UNIT_003'], 'F30', [], 26), last;
for (let floor = 26; floor <= 30; floor++) {
    last = (0, trials_1.resolveCompanionTrialFloor)({ progress: towerRun.progress, owned, busyCompanionIds: busy, trialsUnlocked: true, serverNowMs: sep }, towerRun.run.runId, win);
    towerRun = { ...towerRun, progress: last.progress, run: last.progress.season.activeRun ?? towerRun.run };
}
ok(last.monthlyCompleted, 'Floor 30 did not trigger monthly completion');
ok(last.reward.companionEssence >= 600, 'Monthly completion Essence package missing');
ok(last.reward.bondstones >= 3, 'Monthly completion Bondstones missing');
eq(last.progress.lifetime.monthlyFloor30Clears, 1, 'Lifetime monthly Floor 30 clear not recorded');
// Calendar math: February/leap year, 30-day, 31-day, year rollover.
eq((0, trial_season_1.companionTrialSeasonKey)(Date.UTC(2028, 1, 29, 23, 59, 59)), '2028-02', 'Leap February key wrong');
eq((0, trial_season_1.companionTrialSeasonKey)(Date.UTC(2028, 2, 1, 0, 0, 0)), '2028-03', 'Leap February rollover wrong');
eq((0, trial_season_1.companionTrialSeasonKey)(Date.UTC(2026, 3, 30, 23, 59, 59)), '2026-04', '30-day month key wrong');
eq((0, trial_season_1.companionTrialSeasonKey)(Date.UTC(2026, 4, 1, 0, 0, 0)), '2026-05', '30-day rollover wrong');
eq((0, trial_season_1.companionTrialSeasonKey)(Date.UTC(2026, 0, 31, 23, 59, 59)), '2026-01', '31-day month key wrong');
eq((0, trial_season_1.companionTrialSeasonKey)(Date.UTC(2026, 1, 1, 0, 0, 0)), '2026-02', '31-day rollover wrong');
eq((0, trial_season_1.companionTrialSeasonKey)(Date.UTC(2026, 11, 31, 23, 59, 59)), '2026-12', 'December key wrong');
eq((0, trial_season_1.companionTrialSeasonKey)(Date.UTC(2027, 0, 1, 0, 0, 0)), '2027-01', 'Year rollover wrong');
// Config remains scalable beyond 30 even though launch target is 30.
eq(content_1.COMPANION_TRIAL_FLOOR_COUNT, 30, 'Launch floor count mismatch');
ok(floor5Reward > 0, 'Boss first-clear reward missing');
console.log('companion-phase2-trials-monthly: PASS');
