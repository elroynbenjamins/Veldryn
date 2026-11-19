"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const api_contracts_1 = require("../api-contracts");
function error(action) { try {
    action();
}
catch (reason) {
    return reason instanceof Error ? reason.message : String(reason);
} return ''; }
const start = (0, api_contracts_1.parseCoopRunRequest)({ requestId: 'request-123', dungeonId: 'EXP_001', tier: 1, characterId: 'char-1', loadoutId: 'load-1', loadoutRevision: 7 }, 'qmode');
node_assert_1.strict.equal(start.mode, 'qmode');
node_assert_1.strict.equal(start.characterId, 'char-1');
node_assert_1.strict.equal(error(() => (0, api_contracts_1.parseCoopRunRequest)({ ...start, role: 'tank' }, 'live')), 'client_role_forbidden');
node_assert_1.strict.equal(error(() => (0, api_contracts_1.parseCoopRunRequest)({ requestId: 'request-123', dungeonId: 'EXP_001', tier: 1, loadoutId: 'load-1', loadoutRevision: 7 }, 'live')), 'invalid_characterId');
node_assert_1.strict.deepEqual((0, api_contracts_1.parseCoopDecisionCommand)({ requestId: 'request-456', decisionId: 'decision-1', decisionRevision: 2, optionId: 'd2-c1' }), { requestId: 'request-456', decisionId: 'decision-1', decisionRevision: 2, optionId: 'd2-c1' });
node_assert_1.strict.deepEqual((0, api_contracts_1.parseCoopReadyCommand)({ requestId: 'request-789', rosterRevision: 3, accept: true }), { requestId: 'request-789', rosterRevision: 3, accept: true });
node_assert_1.strict.equal((0, api_contracts_1.parseCoopChatCommand)({ requestId: 'request-chat', text: 'Ready' }).text, 'Ready');
node_assert_1.strict.equal(error(() => (0, api_contracts_1.parseCoopChatCommand)({ requestId: 'request-chat', text: 'x'.repeat(301) })), 'invalid_text');
console.log('coop phase2 API contracts OK');
