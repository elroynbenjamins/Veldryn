"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const reward_integrity_1 = require("../reward-integrity");
const repository = new reward_integrity_1.MemoryRewardIntegrityRepository(), service = new reward_integrity_1.CoopRewardService(repository);
const state = { cleared: true, routeProgress: 1, reachedFinalBoss: true };
const entitlement = (id, mode, account = 'player', earnedAtMs = 0) => ({ id, runId: `run-${id}`, mode, recipientAccountId: account, characterId: `char-${account}`, kind: 'participant', rewardStage: 'clear', tier: 1, mapBaseMarks: 100, state, periodDateKey: '2026-09-09', periodWeekKey: '2026-09-07', earnedAtMs, claimed: false });
for (let i = 0; i < 4; i++) {
    service.create(entitlement(`e${i}`, i % 2 ? 'live' : 'qmode'));
    service.claim('player', `e${i}`, `request-${i}`);
}
node_assert_1.strict.equal(repository.daily.get('player:2026-09-09')?.enhanced, 3);
node_assert_1.strict.equal(repository.weekly.get('player:2026-09-07')?.liveFellowship, 2);
node_assert_1.strict.equal(repository.wallets.get('player'), 370, 'Live clears add a 25% Fellowship bonus while shared enhanced charges remain mode-neutral');
node_assert_1.strict.deepEqual(service.rewardBudget('player', 0, '2026-09-07'), { charges: 0, nextChargeAtMs: 28_800_000, weekKey: '2026-09-07', weeklyUsed: 3 });
service.create(entitlement('recharged', 'live', 'player', 28_800_000));
const thirdLive = service.claim('player', 'recharged', 'request-recharged');
node_assert_1.strict.equal(thirdLive.liveFellowshipBonus, 25);
node_assert_1.strict.equal(repository.wallets.get('player'), 495, 'one enhanced reward charge regenerates after eight hours and the third Live clear still earns Fellowship');
node_assert_1.strict.deepEqual(service.rewardBudget('player', 28_800_000, '2026-09-07'), { charges: 0, nextChargeAtMs: 57_600_000, weekKey: '2026-09-07', weeklyUsed: 4 });
const replay = service.claim('player', 'e0', 'request-0');
node_assert_1.strict.equal(replay.idempotentReplay, true);
node_assert_1.strict.equal(repository.wallets.get('player'), 495, 'idempotent replay does not change the wallet');
let denied = '';
try {
    service.claim('echo-owner', 'e0', 'request-echo');
}
catch (error) {
    denied = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(denied, 'not_reward_recipient');
service.create({ ...entitlement('assist', 'qmode', 'echo-owner'), kind: 'echo_assistance', characterId: undefined });
node_assert_1.strict.ok(service.claim('echo-owner', 'assist', 'request-assist').marks > 0);
repository.wallets.set('player', 50);
service.purchasePersonal({ accountId: 'player', activeParticipantAccountId: 'player', memberKind: 'human', cost: 20, requestId: 'buy-1' });
service.purchasePersonal({ accountId: 'player', activeParticipantAccountId: 'player', memberKind: 'human', cost: 20, requestId: 'buy-1' });
node_assert_1.strict.equal(repository.wallets.get('player'), 30);
let echoSpend = '';
try {
    service.purchasePersonal({ accountId: 'echo-owner', activeParticipantAccountId: 'player', memberKind: 'echo', cost: 1, requestId: 'bad-buy' });
}
catch (error) {
    echoSpend = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(echoSpend, 'echo_wallet_forbidden');
const cadenceRepository = new reward_integrity_1.MemoryRewardIntegrityRepository(), cadenceService = new reward_integrity_1.CoopRewardService(cadenceRepository), eightHours = 28_800_000;
for (let i = 0; i < 12; i++) {
    const item = { ...entitlement(`cadence-${i}`, 'live', 'cadence-player', i * eightHours), periodWeekKey: 'week-a' };
    cadenceService.create(item);
    cadenceService.claim('cadence-player', item.id, `cadence-request-${i}`);
}
const capped = { ...entitlement('cadence-capped', 'qmode', 'cadence-player', 12 * eightHours), periodWeekKey: 'week-a' };
cadenceService.create(capped);
node_assert_1.strict.equal(cadenceService.claim('cadence-player', capped.id, 'cadence-request-capped').marks, 20, 'weekly limit keeps unlimited play at the post-cap rate');
const reset = { ...entitlement('cadence-reset', 'live', 'cadence-player', 13 * eightHours), periodWeekKey: 'week-b' };
cadenceService.create(reset);
node_assert_1.strict.equal(cadenceService.claim('cadence-player', reset.id, 'cadence-request-reset').marks, 125, 'new week restores both enhanced eligibility and the 3-clear Live Fellowship allowance');
const noBonusRepository = new reward_integrity_1.MemoryRewardIntegrityRepository(), noBonusService = new reward_integrity_1.CoopRewardService(noBonusRepository), failed = { ...state, cleared: false };
const failedLive = { ...entitlement('failed-live', 'live', 'failed-player'), state: failed };
noBonusService.create(failedLive);
node_assert_1.strict.equal(noBonusService.claim('failed-player', failedLive.id, 'failed-live-request').liveFellowshipBonus, 0, 'failed Live runs do not consume Fellowship');
node_assert_1.strict.equal(noBonusRepository.weekly.get('failed-player:2026-09-07')?.liveFellowship ?? 0, 0);
for (let i = 0; i < 4; i++) {
    const item = entitlement(`fellowship-${i}`, 'live', 'fellowship-player');
    noBonusService.create(item);
    const result = noBonusService.claim('fellowship-player', item.id, `fellowship-request-${i}`);
    node_assert_1.strict.equal(result.liveFellowshipBonus, i < 3 ? 25 : 0);
}
node_assert_1.strict.equal(noBonusRepository.weekly.get('fellowship-player:2026-09-07')?.liveFellowship, 3, 'Fellowship is limited to three successful Live clears per account week');
const failRepo = new reward_integrity_1.MemoryRewardIntegrityRepository(), failService = new reward_integrity_1.CoopRewardService(failRepo);
const fail = { ...state, cleared: false, routeProgress: 1, reachedFinalBoss: true };
for (let i = 0; i < 14; i++) {
    const item = { ...entitlement(`failure-${i}`, 'live', 'failed-consolation', i * 1000), state: fail };
    failService.create(item);
    const claim = failService.claim('failed-consolation', item.id, `failure-request-${i}`);
    node_assert_1.strict.equal(claim.marks, i < 12 ? 7 : 0, 'Failure payout must be limited to 12 small consolation claims per week');
    node_assert_1.strict.equal(claim.liveFellowshipBonus, 0, 'Failed Live clears never grant Fellowship');
}
node_assert_1.strict.equal(failRepo.enhancedCharges.size, 0, 'Failed attempts must not consume or initialize enhanced charges');
node_assert_1.strict.equal(failRepo.weekly.get('failed-consolation:2026-09-07')?.enhanced, 0, 'Failed attempts cannot consume weekly enhanced reward allowance');
const clearAfterFailures = entitlement('after-failures', 'qmode', 'failed-consolation', 20_000);
failService.create(clearAfterFailures);
node_assert_1.strict.equal(failService.claim('failed-consolation', clearAfterFailures.id, 'after-failures-clear').marks, 100, 'A successful clear after failures still earns a full enhanced payout');
node_assert_1.strict.equal(failRepo.enhancedCharges.get('failed-consolation')?.charges, 2, 'Only a successful clear spends the charge');
const replayFailure = failService.claim('failed-consolation', 'failure-0', 'failure-request-0');
node_assert_1.strict.equal(replayFailure.marks, 7);
node_assert_1.strict.equal(replayFailure.idempotentReplay, true);
node_assert_1.strict.equal(failRepo.failedWeekly.get('failed-consolation:2026-09-07'), 12, 'Idempotent replay never grants additional weekly failure allowance');
console.log('coop phase11 rewards OK');
