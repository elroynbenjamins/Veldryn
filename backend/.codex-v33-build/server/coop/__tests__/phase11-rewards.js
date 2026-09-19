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
node_assert_1.strict.equal(repository.wallets.get('player'), 320, 'fourth shared-mode claim uses 20% post-cap marks');
node_assert_1.strict.deepEqual(service.rewardBudget('player', 0, '2026-09-07'), { charges: 0, nextChargeAtMs: 28_800_000, weekKey: '2026-09-07', weeklyUsed: 3 });
service.create(entitlement('recharged', 'live', 'player', 28_800_000));
service.claim('player', 'recharged', 'request-recharged');
node_assert_1.strict.equal(repository.wallets.get('player'), 420, 'one enhanced reward charge regenerates after eight hours');
node_assert_1.strict.deepEqual(service.rewardBudget('player', 28_800_000, '2026-09-07'), { charges: 0, nextChargeAtMs: 57_600_000, weekKey: '2026-09-07', weeklyUsed: 4 });
const replay = service.claim('player', 'e0', 'request-0');
node_assert_1.strict.equal(replay.idempotentReplay, true);
node_assert_1.strict.equal(repository.wallets.get('player'), 420, 'idempotent replay does not change the wallet');
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
node_assert_1.strict.equal(cadenceService.claim('cadence-player', reset.id, 'cadence-request-reset').marks, 100, 'new authoritative week restores enhanced eligibility when a charge is available');
console.log('coop phase11 rewards OK');
