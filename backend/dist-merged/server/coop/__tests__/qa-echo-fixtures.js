"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const qmode_1 = require("../qmode");
const qa_echo_fixtures_1 = require("../qa-echo-fixtures");
const nowMs = 1_790_000_000_000;
for (const definition of qa_echo_fixtures_1.QA_ECHO_DEFINITIONS) {
    const accountId = `qa-controller-${definition.classId.toLowerCase()}`;
    const service = new qmode_1.QModeService(new qmode_1.MemoryQModeRunRepository(), 'qa-dungeon-secret');
    const run = service.create({
        requestId: `qa-request-${definition.classId.toLowerCase()}`,
        runId: `qa-run-${definition.classId.toLowerCase()}`,
        controllerAccountId: accountId,
        controllerSnapshot: (0, qa_echo_fixtures_1.createQaFrozenLoadout)({ accountId, classId: definition.classId, level: 100 }),
        expeditionId: 'EXP_001', tier: 5, contentVersion: qa_echo_fixtures_1.QA_ECHO_CONTENT_VERSION, balanceVersion: 'qa-balance-v1',
        nowMs, profiles: (0, qa_echo_fixtures_1.createQaEchoPool)({ nowMs, level: 100 }),
    });
    node_assert_1.strict.equal(run.players.length, 4);
    node_assert_1.strict.equal(run.echoSourceAccountIds.length, 3);
    node_assert_1.strict.equal(new Set(run.echoSourceAccountIds).size, 3);
    const roles = run.players.map(player => player.role);
    node_assert_1.strict.equal(roles.filter(role => role === 'tank').length, 1);
    node_assert_1.strict.equal(roles.filter(role => role === 'damage').length, 2);
    node_assert_1.strict.equal(roles.filter(role => role === 'support').length, 1);
    const damageClasses = run.players.filter(player => player.role === 'damage').map(player => player.classId);
    node_assert_1.strict.equal(new Set(damageClasses).size, 2, `duplicate damage class for ${definition.classId}`);
}
console.log('PASS QA Echo pool supports every controller class and valid 1T/2D/1S composition');
