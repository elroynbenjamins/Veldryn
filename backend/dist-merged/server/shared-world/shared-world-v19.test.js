"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const regional_crises_1 = require("./regional-crises");
const world_bosses_1 = require("./world-bosses");
const crisis = regional_crises_1.REGIONAL_CRISIS_TEMPLATE_POOL[0];
const scale = (0, regional_crises_1.deriveRegionalCrisisScale)({ eligibleActiveAccounts7d: 1000, durationHours: 48 });
node_assert_1.strict.ok(scale.targetPoints >= 6000);
node_assert_1.strict.equal(scale.expectedParticipationFraction, 0.45);
const eval1 = (0, regional_crises_1.evaluateRegionalCrisis)(crisis, { targetPoints: 10000, creditedPoints: 6500, combatPoints: 3000, skillingPoints: 3000 });
node_assert_1.strict.equal(eval1.secured, false);
node_assert_1.strict.ok(eval1.reachedStageIds.includes('turning_point'));
const eval2 = (0, regional_crises_1.evaluateRegionalCrisis)(crisis, { targetPoints: 10000, creditedPoints: 10000, combatPoints: 3000, skillingPoints: 3000 });
node_assert_1.strict.equal(eval2.secured, true);
const event = { sourceEventId: 'evt-1', accountId: 'a', occurredAtMs: 1, dateKey: '2026-09-14', profile: { id: 'crisis.test', category: 'combat', challenge: 'elite', expectedSecondsPerUnit: 60, difficultyMultiplier: 1, offline: false }, units: 10, activityKind: 'combat', contentId: 'enemy', regionId: 'rift' };
const score = (0, regional_crises_1.scoreRegionalCrisisContribution)(event, crisis, 0);
node_assert_1.strict.equal(score.eligible, true);
node_assert_1.strict.ok(score.creditedPoints > 0);
node_assert_1.strict.ok(score.creditedPoints <= crisis.contributionRules.dailyAccountCreditCap);
const boss = world_bosses_1.WORLD_BOSS_TEMPLATE_POOL[0];
const bossScale = (0, world_bosses_1.deriveWorldBossScale)({ eligibleCombatAccounts7d: 1000, medianImpactPerAttempt: 1200 });
node_assert_1.strict.ok(bossScale.maxHp >= 50000);
node_assert_1.strict.equal((0, world_bosses_1.phaseForHp)(boss, 100000, 100000).id, 'phase_1');
node_assert_1.strict.equal((0, world_bosses_1.phaseForHp)(boss, 60000, 100000).id, 'phase_2');
node_assert_1.strict.equal((0, world_bosses_1.phaseForHp)(boss, 20000, 100000).id, 'phase_3');
const damageImpact = (0, world_bosses_1.computeWorldBossImpact)(boss, { encounterId: 'e', accountId: 'a', characterId: 'c', roleProfile: 'damage', durationSeconds: 90, directDamage: 1000, damagePrevented: 0, effectiveHealing: 0, utilityUptimeSeconds: 0, survived: true, defeatedPlayer: false });
const tankImpact = (0, world_bosses_1.computeWorldBossImpact)(boss, { encounterId: 'e2', accountId: 'b', characterId: 'c2', roleProfile: 'tank', durationSeconds: 90, directDamage: 650, damagePrevented: 800, effectiveHealing: 0, utilityUptimeSeconds: 10, survived: true, defeatedPlayer: false });
const supportImpact = (0, world_bosses_1.computeWorldBossImpact)(boss, { encounterId: 'e3', accountId: 'c', characterId: 'c3', roleProfile: 'support', durationSeconds: 90, directDamage: 550, damagePrevented: 100, effectiveHealing: 650, utilityUptimeSeconds: 30, survived: true, defeatedPlayer: false });
node_assert_1.strict.ok(damageImpact.raidImpact > 0 && tankImpact.raidImpact > 0 && supportImpact.raidImpact > 0);
node_assert_1.strict.ok(tankImpact.raidImpact >= Math.round(damageImpact.raidImpact * 0.65));
node_assert_1.strict.ok(supportImpact.raidImpact >= Math.round(damageImpact.raidImpact * 0.65));
node_assert_1.strict.deepEqual((0, world_bosses_1.applyWorldBossDamage)(1000, 250), { previousHp: 1000, remainingHp: 750, requestedDamage: 250, appliedDamage: 250, defeated: false });
node_assert_1.strict.equal((0, world_bosses_1.applyWorldBossDamage)(100, 250).appliedDamage, 100);
node_assert_1.strict.equal((0, world_bosses_1.applyWorldBossDamage)(100, 250).remainingHp, 0);
node_assert_1.strict.equal((0, world_bosses_1.canStartScoredBossAttempt)({ state: 'active', attemptsToday: 3, definition: boss, nowMs: 1000, endsAtMs: 2000 }).allowed, true);
node_assert_1.strict.equal((0, world_bosses_1.canStartScoredBossAttempt)({ state: 'active', attemptsToday: 4, definition: boss, nowMs: 1000, endsAtMs: 2000 }).allowed, false);
node_assert_1.strict.equal((0, world_bosses_1.canStartScoredBossAttempt)({ state: 'defeated', attemptsToday: 4, validAttemptsTotal: 0, echoAttemptsTotal: 0, definition: boss, nowMs: 1000, endsAtMs: 100000, defeatedAtMs: 500 }).echoOnly, true);
node_assert_1.strict.equal((0, world_bosses_1.canStartScoredBossAttempt)({ state: 'defeated', attemptsToday: 0, validAttemptsTotal: 1, echoAttemptsTotal: 0, definition: boss, nowMs: 1000, endsAtMs: 100000, defeatedAtMs: 500 }).allowed, false);
node_assert_1.strict.equal((0, world_bosses_1.canStartScoredBossAttempt)({ state: 'defeated', attemptsToday: 0, validAttemptsTotal: 0, echoAttemptsTotal: 1, definition: boss, nowMs: 1000, endsAtMs: 100000, defeatedAtMs: 500 }).allowed, false);
console.log('v19 shared-world balance tests passed');
const world_boss_ranking_1 = require("./world-boss-ranking");
const shared_world_rewards_1 = require("./shared-world-rewards");
const shared_world_finalization_1 = require("./shared-world-finalization");
const crisis_world_boss_chain_1 = require("./crisis-world-boss-chain");
const ranks = (0, world_boss_ranking_1.rankWorldBossCandidates)([
    { accountId: 'b', raidImpact: 1000, appliedGlobalDamage: 900, validAttempts: 2, bestAttemptImpact: 600, lastScoredAttemptAtMs: 20 },
    { accountId: 'a', raidImpact: 1000, appliedGlobalDamage: 900, validAttempts: 2, bestAttemptImpact: 600, lastScoredAttemptAtMs: 10 },
    { accountId: 'c', raidImpact: 900, appliedGlobalDamage: 900, validAttempts: 1, bestAttemptImpact: 900, lastScoredAttemptAtMs: 5 },
]);
node_assert_1.strict.equal(ranks[0].accountId, 'a');
node_assert_1.strict.equal(ranks[0].finalRank, 1);
node_assert_1.strict.equal((0, world_boss_ranking_1.worldBossPrestigeTier)(1, 1000), 'top10');
node_assert_1.strict.equal((0, world_boss_ranking_1.worldBossPrestigeTier)(80, 1000), 'top100');
const echoClosedMs = boss.postDefeatEchoWindowHours * 3_600_000;
const fin = (0, shared_world_finalization_1.finalizeWorldBossRanks)({ nowMs: echoClosedMs, endsAtMs: echoClosedMs * 2, defeatedAtMs: 0, inFlightScoredAttempts: 0, definition: boss, rankCandidates: ranks });
node_assert_1.strict.equal(fin.ready, true);
node_assert_1.strict.equal(fin.finalRanks.length, 3);
const crisisRewards = (0, shared_world_rewards_1.crisisRewardIntents)({ state: 'secured', totalPersonalPoints: 800, claimedRewardKeys: [], definition: crisis });
node_assert_1.strict.ok(crisisRewards.some(x => x.rewardKey === 'participation'));
node_assert_1.strict.ok(crisisRewards.some(x => x.rewardKey === 'success'));
const bossRewards = (0, shared_world_rewards_1.worldBossRewardIntents)({ state: 'defeated', validAttempts: 1, echoAttempts: 0, scoredRaidImpact: 2100, finalRank: 5, qualifyingPopulation: 500, claimedRewardKeys: [], definition: boss });
node_assert_1.strict.ok(bossRewards.some(x => x.rewardKey === 'victory'));
node_assert_1.strict.ok(bossRewards.some(x => x.rewardKey === 'prestige'));
node_assert_1.strict.equal((0, crisis_world_boss_chain_1.bossUnlockForReachedStages)('crisis-1', crisis, ['response', 'turning_point', 'secured'])?.worldBossTemplateId, 'world_boss_rift_colossus');
console.log('v19 finalization/reward/ranking tests passed');
// --- Refinement regressions ---
const shared_world_finalization_2 = require("./shared-world-finalization");
const world_bosses_2 = require("./world-bosses");
const shared_world_admin_v19_1 = require("./shared-world-admin-v19");
const shared_world_worker_1 = require("./shared-world-worker");
const shared_world_notifications_1 = require("./shared-world-notifications");
const regional_crisis_service_1 = require("./regional-crisis-service");
const world_boss_service_1 = require("./world-boss-service");
// The backend build types node:assert through src/types/node-shims.d.ts, which has no
// assert.rejects, so check async rejections with a local helper.
async function rejectsWith(promise, pattern) {
    let message = '';
    try {
        await promise;
    }
    catch (error) {
        message = error instanceof Error ? error.message : String(error);
    }
    node_assert_1.strict.ok(pattern.test(message), 'expected rejection matching ' + pattern + ', got ' + (message || 'no rejection'));
}
void (async () => {
    // Finalization must not close the Echo window at the moment of defeat.
    const early = (0, shared_world_finalization_1.finalizeWorldBossRanks)({ nowMs: 60_000, endsAtMs: 100 * 3_600_000, defeatedAtMs: 0, inFlightScoredAttempts: 0, definition: boss, rankCandidates: ranks });
    node_assert_1.strict.equal(early.ready, false);
    node_assert_1.strict.equal(early.reason, 'echo_window_open');
    // ...but an Echo window that would outlast the boss closes with the boss.
    node_assert_1.strict.equal((0, world_bosses_2.worldBossEchoWindowEndsAtMs)(boss, 1000, 5000), 5000);
    node_assert_1.strict.equal((0, shared_world_finalization_1.finalizeWorldBossRanks)({ nowMs: 5000, endsAtMs: 5000, defeatedAtMs: 1000, inFlightScoredAttempts: 0, definition: boss, rankCandidates: ranks }).ready, true);
    node_assert_1.strict.equal((0, shared_world_finalization_1.finalizeWorldBossRanks)({ nowMs: 5000, endsAtMs: 5000, defeatedAtMs: 1000, inFlightScoredAttempts: 0, inFlightEchoAttempts: 1, definition: boss, rankCandidates: ranks }).reason, 'in_flight_attempts');
    node_assert_1.strict.equal((0, world_bosses_1.canStartScoredBossAttempt)({ state: 'defeated', attemptsToday: 0, definition: boss, nowMs: echoClosedMs + 1, endsAtMs: echoClosedMs * 3, defeatedAtMs: 0 }).reason, 'echo_window_closed');
    // Echo-only players get participation, never victory or prestige.
    const echoRewards = (0, shared_world_rewards_1.worldBossRewardIntents)({ state: 'defeated', validAttempts: 0, echoAttempts: 1, scoredRaidImpact: 0, finalRank: 1, qualifyingPopulation: 10, claimedRewardKeys: [], definition: boss });
    node_assert_1.strict.deepEqual(echoRewards.map(x => x.rewardKey), ['participation']);
    // A finalized boss that expired undefeated pays no victory; a finalized defeated one does.
    node_assert_1.strict.ok(!(0, shared_world_rewards_1.worldBossRewardIntents)({ state: 'finalized', validAttempts: 2, echoAttempts: 0, scoredRaidImpact: 10, claimedRewardKeys: [], definition: boss }).some(x => x.rewardKey === 'victory'));
    node_assert_1.strict.ok((0, shared_world_rewards_1.worldBossRewardIntents)({ state: 'finalized', defeatedAtMs: 1, validAttempts: 2, echoAttempts: 0, scoredRaidImpact: 10, claimedRewardKeys: [], definition: boss }).some(x => x.rewardKey === 'victory'));
    // Prestige follows worldBossPrestigeTier: outside the top 100 and top 10% earns nothing.
    node_assert_1.strict.ok(!(0, shared_world_rewards_1.worldBossRewardIntents)({ state: 'defeated', validAttempts: 1, echoAttempts: 0, scoredRaidImpact: 10, finalRank: 400, qualifyingPopulation: 1000, claimedRewardKeys: [], definition: boss }).some(x => x.rewardKey === 'prestige'));
    node_assert_1.strict.ok((0, shared_world_rewards_1.worldBossRewardIntents)({ state: 'defeated', validAttempts: 1, echoAttempts: 0, scoredRaidImpact: 10, finalRank: 900, qualifyingPopulation: 10000, claimedRewardKeys: [], definition: boss }).some(x => x.rewardKey === 'prestige'));
    // A failed-then-finalized crisis pays no success reward.
    node_assert_1.strict.ok(!(0, shared_world_rewards_1.crisisRewardIntents)({ state: 'finalized', outcome: 'failed', totalPersonalPoints: 800, claimedRewardKeys: [], definition: crisis }).some(x => x.rewardKey === 'success'));
    node_assert_1.strict.ok((0, shared_world_rewards_1.crisisRewardIntents)({ state: 'finalized', outcome: 'secured', totalPersonalPoints: 800, claimedRewardKeys: [], definition: crisis }).some(x => x.rewardKey === 'success'));
    // Mixed crises need their category share, not just the total.
    node_assert_1.strict.equal((0, shared_world_finalization_2.crisisFinalState)({ nowMs: 10, endsAtMs: 5, definition: crisis, creditedPoints: 10000, targetPoints: 10000, combatPoints: 9000, skillingPoints: 1000 }), 'failed');
    node_assert_1.strict.equal((0, shared_world_finalization_2.crisisFinalState)({ nowMs: 1, endsAtMs: 5, definition: crisis, creditedPoints: 10000, targetPoints: 10000, combatPoints: 9000, skillingPoints: 1000 }), null);
    node_assert_1.strict.equal((0, shared_world_finalization_2.crisisFinalState)({ nowMs: 1, endsAtMs: 5, definition: crisis, creditedPoints: 10000, targetPoints: 10000, combatPoints: 5000, skillingPoints: 5000 }), 'secured');
    // Impact: survival credit stops at defeat, and corrupt metrics never produce NaN.
    const alive = (0, world_bosses_1.computeWorldBossImpact)(boss, { encounterId: 's', accountId: 'a', characterId: 'c', roleProfile: 'tank', durationSeconds: 90, directDamage: 0, damagePrevented: 0, effectiveHealing: 0, utilityUptimeSeconds: 0, survived: true, defeatedPlayer: false });
    const fell = (0, world_bosses_1.computeWorldBossImpact)(boss, { encounterId: 'f', accountId: 'a', characterId: 'c', roleProfile: 'tank', durationSeconds: 30, directDamage: 0, damagePrevented: 0, effectiveHealing: 0, utilityUptimeSeconds: 0, survived: false, defeatedPlayer: false });
    node_assert_1.strict.ok(fell.performanceBreakdown.survival < alive.performanceBreakdown.survival);
    const corrupt = (0, world_bosses_1.computeWorldBossImpact)(boss, { encounterId: 'n', accountId: 'a', characterId: 'c', roleProfile: 'damage', durationSeconds: Number.NaN, directDamage: Number.NaN, damagePrevented: Number.POSITIVE_INFINITY, effectiveHealing: -5, utilityUptimeSeconds: Number.NaN, survived: true, defeatedPlayer: false });
    node_assert_1.strict.equal(corrupt.raidImpact, 0);
    // Admin commands reject blank ids and unaudited destructive actions.
    const calls = [];
    const deps = { cancelCrisis: async (id) => calls.push('cc:' + id), recalculateCrisis: async (id) => calls.push('rc:' + id), cancelWorldBoss: async (id) => calls.push('cb:' + id), recalculateWorldBossHp: async (id) => calls.push('rb:' + id), repairWorldBossAttempt: async (id) => calls.push('ra:' + id), finalizeWorldBoss: async (id) => calls.push('fb:' + id) };
    await rejectsWith((0, shared_world_admin_v19_1.executeSharedWorldAdminCommand)(deps, 'shared_world.crisis_recalculate', {}, ''), /instance_id_required/);
    await rejectsWith((0, shared_world_admin_v19_1.executeSharedWorldAdminCommand)(deps, 'shared_world.world_boss_cancel', { instanceId: 'b1' }, '  '), /reason_required/);
    await (0, shared_world_admin_v19_1.executeSharedWorldAdminCommand)(deps, 'shared_world.world_boss_repair_attempt', { encounterId: ' e1 ' }, 'stuck reservation');
    await (0, shared_world_admin_v19_1.executeSharedWorldAdminCommand)(deps, 'shared_world.crisis_recalculate', { instanceId: 'c1' }, '');
    node_assert_1.strict.deepEqual(calls, ['ra:e1', 'rc:c1']);
    // Worker: a failing step is reported and does not stop later lifecycle steps.
    let heartbeat = {};
    const worker = await (0, shared_world_worker_1.runSharedWorldWorker)({ activateDueCrises: async () => 1, failExpiredCrises: async () => { throw new Error('db_timeout'); }, finalizeResolvedCrises: async () => 2, spawnUnlockedWorldBosses: async () => 0, activateDueWorldBosses: async () => 0, expireStaleBossAttempts: async () => 3, expireWorldBosses: async () => 0, finalizeWorldBosses: async () => 4, heartbeat: async (_k, d) => { heartbeat = d; } }, { nowMs: () => 1 });
    node_assert_1.strict.equal(worker.finalizedBosses, 4);
    node_assert_1.strict.equal(worker.expiredAttempts, 3);
    node_assert_1.strict.deepEqual(worker.errors, [{ step: 'failExpiredCrises', message: 'db_timeout' }]);
    node_assert_1.strict.equal(heartbeat.ok, false);
    // Notifications dedupe on stable ids and show readable region names.
    node_assert_1.strict.equal((0, shared_world_notifications_1.crisisStageNotification)({ instanceId: 'i', crisisName: 'Rift Breach', stageId: 'turning_point', stageName: 'Wendepunkt' }).dedupeKey, 'crisis-stage:i:turning_point');
    node_assert_1.strict.equal((0, shared_world_notifications_1.regionDisplayName)('kings_road'), 'Kings Road');
    node_assert_1.strict.ok((0, shared_world_notifications_1.worldBossSpawnedNotification)({ instanceId: 'i', bossName: 'Cindermaw', regionId: 'sunscar' }).body.includes('Sunscar'));
    // Crisis service reports real progress even when a contribution is not credited.
    const securedInstance = { instanceId: 'c', definition: crisis, state: 'secured', startsAtMs: 0, endsAtMs: 10, targetPoints: 100, creditedPoints: 120, combatPoints: 60, skillingPoints: 60 };
    const late = await (0, regional_crisis_service_1.recordRegionalCrisisContribution)({ getInstance: async () => securedInstance, getAccountDailyPoints: async () => 0, recordContribution: async () => { throw new Error('must not record'); } }, 'c', { ...event, occurredAtMs: 50 });
    node_assert_1.strict.deepEqual(late, { crisisInstanceId: 'c', creditedPoints: 0, globalCreditedPoints: 120, secured: true });
    // Settlement fails fast once the reservation has expired.
    const reservation = { encounterId: 'e', instanceId: 'b', accountId: 'a', characterId: 'c', dateKey: '2026-09-14', echoOnly: false, phaseId: 'phase_1', expiresAtMs: 100 };
    await rejectsWith((0, world_boss_service_1.settleWorldBossAttempt)({ store: { loadAttempt: async () => reservation } }, { encounterId: 'e', accountId: 'a', nowMs: 101, combatResult: { encounterId: 'e', accountId: 'a', characterId: 'c', roleProfile: 'damage', durationSeconds: 90, directDamage: 1, damagePrevented: 0, effectiveHealing: 0, utilityUptimeSeconds: 0, survived: true, defeatedPlayer: false } }), /world_boss_attempt_expired/);
    console.log('v19 shared-world refinement tests passed');
})().catch(error => { console.error(error); process.exit(1); });
