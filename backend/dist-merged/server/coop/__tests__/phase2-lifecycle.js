"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const clock_1 = require("../clock");
const memory_1 = require("../repositories/memory");
function errorCode(fn) {
    try {
        fn();
    }
    catch (error) {
        return error instanceof Error ? error.message : String(error);
    }
    return '';
}
const clock = new clock_1.FakeClock(1_000);
clock.advanceMs(250);
node_assert_1.strict.equal(clock.nowMs(), 1_250);
const repository = new memory_1.MemoryCoopRepository();
repository.create({
    id: 'run-1', mode: 'qmode', controllerAccountId: 'controller', phase: 'awaiting_choice', stateVersion: 1,
    accessAccountIds: ['controller'], echoSourceAccountIds: ['echo-a', 'echo-b', 'echo-c'],
});
node_assert_1.strict.equal(repository.getAuthorized('run-1', 'controller').id, 'run-1');
node_assert_1.strict.equal(errorCode(() => repository.getAuthorized('run-1', 'echo-a')), 'not_participant');
const updated = repository.compareAndSet('run-1', 1, run => ({ ...run, phase: 'resolving_node', stateVersion: 2 }));
node_assert_1.strict.equal(updated.phase, 'resolving_node');
node_assert_1.strict.equal(errorCode(() => repository.compareAndSet('run-1', 1, run => ({ ...run, stateVersion: 2 }))), 'stale_state');
const receipt = { callerAccountId: 'controller', operation: 'choose', resourceId: 'run-1', requestId: 'req-1', requestHash: 'same', response: { ok: true } };
repository.write(receipt);
repository.write(receipt);
node_assert_1.strict.deepEqual(repository.read('controller', 'choose', 'run-1', 'req-1')?.response, { ok: true });
node_assert_1.strict.equal(errorCode(() => repository.write({ ...receipt, requestHash: 'different' })), 'idempotency_conflict');
console.log('coop phase2 lifecycle OK');
