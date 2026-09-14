"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coop_qmode_1 = require("../src/core/coop-qmode");
const coop_qmode_fixtures_1 = require("../src/dev/coop-qmode-fixtures");
function equal(actual, expected, message = 'values differ') { if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${message}: ${JSON.stringify(actual)}`); }
function throws(work, pattern) { let message = ''; try {
    work();
}
catch (error) {
    message = error instanceof Error ? error.message : String(error);
} if (!pattern.test(message))
    throw new Error(`Expected ${pattern}, received ${message}`); }
(0, coop_qmode_1.validateCoopQModeTeam)(coop_qmode_fixtures_1.qModeReadyFixture);
equal((0, coop_qmode_1.qModeStatusCanEnterRun)(coop_qmode_fixtures_1.qModeReadyFixture), true);
equal(coop_qmode_fixtures_1.qModeReadyFixture.members.filter(member => member.kind === 'echo').length, 3);
equal(new Set(coop_qmode_fixtures_1.qModeReadyFixture.members.map(member => member.memberId)).size, 4);
(0, coop_qmode_1.validateCoopQModeTeam)(coop_qmode_fixtures_1.qModeShortageFixture);
(0, coop_qmode_1.validateCoopQModeTeam)(coop_qmode_fixtures_1.qModeConflictFixture);
equal((0, coop_qmode_1.qModeStatusCanEnterRun)(coop_qmode_fixtures_1.qModeShortageFixture), false);
equal((0, coop_qmode_1.qModeStatusCanEnterRun)(coop_qmode_fixtures_1.qModeResumeFixture), false, 'resume must refetch before commands');
throws(() => (0, coop_qmode_1.validateCoopQModeTeam)({ ...coop_qmode_fixtures_1.qModeReadyFixture, members: coop_qmode_fixtures_1.qModeReadyFixture.members.slice(0, 3) }), /incomplete_qmode_team/);
throws(() => (0, coop_qmode_1.validateCoopQModeTeam)({ ...coop_qmode_fixtures_1.qModeReadyFixture, members: coop_qmode_fixtures_1.qModeReadyFixture.members.map((member, index) => index === 0 ? { ...member, role: 'damage' } : member) }), /invalid_qmode_composition/);
throws(() => (0, coop_qmode_1.validateCoopQModeTeam)({ ...coop_qmode_fixtures_1.qModeReadyFixture, sourceAccountId: 'private' }), /private_echo_data_forbidden/);
equal(coop_qmode_fixtures_1.qModeReadyFixture.requestId, 'q-gallery-request', 'request identity must remain stable for duplicate retries');
console.log('coop qmode presentation OK');
