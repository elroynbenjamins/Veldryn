"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const ready_checks_1 = require("../ready-checks");
const recovery_1 = require("../recovery");
const roster = [['a', 'tank'], ['b', 'damage'], ['c', 'damage'], ['d', 'support']].map(([accountId, role], index) => ({ accountId, characterId: `c${index}`, ticketId: `t${index}`, role: role, originalEnqueuedAtMs: index, loadoutId: `load-${index}`, loadoutRevision: 1, loadoutSnapshotHash: `hash-${index}` }));
const repository = new ready_checks_1.MemoryReadyCheckRepository();
const service = new ready_checks_1.ReadyCheckService(repository);
let check = service.open('check-1', 'party-1', 1, roster, 0);
for (const accountId of ['a', 'b', 'c'])
    check = service.respond(check.id, 1, accountId, true, 1);
node_assert_1.strict.equal(check.status, 'open');
check = service.timeout(check.id, 20_000);
node_assert_1.strict.equal(check.status, 'refilling');
node_assert_1.strict.equal(check.roster.length, 3);
const restarted = new ready_checks_1.ReadyCheckService(repository);
const fresh = restarted.refill(check.id, 'check-2', { ...roster[3], accountId: 'replacement', characterId: 'replacement-char', ticketId: 'replacement-ticket', loadoutId: 'replacement-loadout', loadoutSnapshotHash: 'replacement-hash' }, 20_001);
node_assert_1.strict.equal(fresh.rosterRevision, 2);
node_assert_1.strict.equal(Object.keys(fresh.accepts).length, 0);
let stale = '';
try {
    restarted.respond(fresh.id, 1, 'a', true, 20_002);
}
catch (error) {
    stale = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(stale, 'stale_ready_roster');
let committed = fresh;
for (const accountId of committed.roster.map(member => member.accountId))
    committed = restarted.respond(committed.id, 2, accountId, true, 20_003);
node_assert_1.strict.equal(committed.status, 'committed');
let cancelRace = '';
try {
    restarted.cancel(committed.id, 'a', 20_004);
}
catch (error) {
    cancelRace = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(cancelRace, 'run_already_committed');
let recovery = { phase: 'combat', members: roster.map(member => ({ accountId: member.accountId, characterId: member.characterId, connected: true, absent: false, voluntaryLeaver: false })) };
recovery = (0, recovery_1.disconnectMember)(recovery, 'b', 100);
recovery = (0, recovery_1.enterSafeBoundary)(recovery, 30_000);
node_assert_1.strict.equal(recovery.phase, 'paused_for_reconnect');
recovery = (0, recovery_1.reconnectMember)(recovery, 'b', 40_000);
node_assert_1.strict.equal(recovery.phase, 'active');
recovery = (0, recovery_1.disconnectMember)(recovery, 'b', 50_000);
recovery = (0, recovery_1.enterSafeBoundary)(recovery, 110_001);
node_assert_1.strict.equal(recovery.phase, 'continue_or_end');
recovery = (0, recovery_1.resolveContinueOrEnd)(recovery, { a: 'continue', c: 'end' });
node_assert_1.strict.equal(recovery.phase, 'abandoned');
console.log('coop phase8 ready/recovery OK');
