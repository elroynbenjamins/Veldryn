"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const launch_combat_1 = require("../content/launch-combat");
const pve_balance_batch_1 = require("../pve-balance-batch");
const players = ['Ironwarden', 'Wayfinder', 'Ravager', 'Dawnkeeper'].map(classId => (0, launch_combat_1.launchPlayer)(classId, 25));
const input = { encounterId: 'ROOTBOUND_BOSS', players, iterations: 6, seedPrefix: 'PVE_BATCH_TEST_V1', maxDurationMs: 180000 };
const first = (0, pve_balance_batch_1.runPveBalanceBatch)(input), second = (0, pve_balance_batch_1.runPveBalanceBatch)(input);
node_assert_1.strict.deepEqual(first, second, 'same batch inputs must produce identical aggregate output');
node_assert_1.strict.equal(first.schemaVersion, 1);
node_assert_1.strict.equal(first.telemetrySchemaVersion, 2);
node_assert_1.strict.equal(first.encounterId, 'ROOTBOUND_BOSS');
node_assert_1.strict.equal(first.iterations, 6);
node_assert_1.strict.equal(first.resultCounts.victory + first.resultCounts.wipe + first.resultCounts.timeout, 6);
node_assert_1.strict.ok(first.winRate >= 0 && first.winRate <= 1);
node_assert_1.strict.equal(first.players.length, 4);
node_assert_1.strict.equal(first.party.length, 4);
node_assert_1.strict.ok(first.encounterArchetypes.length > 0);
node_assert_1.strict.ok(first.encounterMechanics.length > 0);
node_assert_1.strict.ok(first.enemyCasts.length > 0);
node_assert_1.strict.ok(Object.keys(first.abilities.partyDamage).length > 0);
node_assert_1.strict.ok(Object.keys(first.abilities.incomingDamage).length > 0);
node_assert_1.strict.ok(first.durationMs.min <= first.durationMs.p10 && first.durationMs.p10 <= first.durationMs.p50 && first.durationMs.p50 <= first.durationMs.p90 && first.durationMs.p90 <= first.durationMs.max);
for (const player of first.players) {
    node_assert_1.strict.equal(player.runs, 6);
    node_assert_1.strict.ok(player.downRate >= 0 && player.downRate <= 1);
    node_assert_1.strict.ok(player.endHpPct.min <= player.endHpPct.max);
}
for (const cast of first.enemyCasts) {
    node_assert_1.strict.ok(cast.started >= cast.completed);
    node_assert_1.strict.ok(cast.started >= cast.interrupted);
    node_assert_1.strict.ok(cast.completionRate >= 0 && cast.completionRate <= 1);
    node_assert_1.strict.ok(cast.interruptionRate >= 0 && cast.interruptionRate <= 1);
}
const encoded = JSON.stringify(first);
for (const privateField of ['attackPower', 'defense', 'accuracy', 'evasion', 'events', 'cooldownReadyAt'])
    node_assert_1.strict.equal(encoded.includes(privateField), false, `batch report leaked ${privateField}`);
let invalid = '';
try {
    (0, pve_balance_batch_1.runPveBalanceBatch)({ ...input, iterations: 0 });
}
catch (error) {
    invalid = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(invalid, 'invalid_balance_iterations');
console.log('PASS deterministic reusable PvE balance batch harness');
