import { strict as assert } from 'node:assert';
import { FakeClock } from '../clock';
import { MemoryCoopRepository } from '../repositories/memory';

function errorCode(fn: () => void): string {
  try { fn(); } catch (error) { return error instanceof Error ? error.message : String(error); }
  return '';
}

const clock = new FakeClock(1_000);
clock.advanceMs(250);
assert.equal(clock.nowMs(), 1_250);

const repository = new MemoryCoopRepository();
repository.create({
  id: 'run-1', mode: 'qmode', controllerAccountId: 'controller', phase: 'awaiting_choice', stateVersion: 1,
  accessAccountIds: ['controller'], echoSourceAccountIds: ['echo-a', 'echo-b', 'echo-c'],
});
assert.equal(repository.getAuthorized('run-1', 'controller').id, 'run-1');
assert.equal(errorCode(() => repository.getAuthorized('run-1', 'echo-a')), 'not_participant');
const updated = repository.compareAndSet('run-1', 1, run => ({ ...run, phase: 'resolving_node', stateVersion: 2 }));
assert.equal(updated.phase, 'resolving_node');
assert.equal(errorCode(() => repository.compareAndSet('run-1', 1, run => ({ ...run, stateVersion: 2 }))), 'stale_state');

const receipt = { callerAccountId: 'controller', operation: 'choose', resourceId: 'run-1', requestId: 'req-1', requestHash: 'same', response: { ok: true } };
repository.write(receipt);
repository.write(receipt);
assert.deepEqual(repository.read('controller', 'choose', 'run-1', 'req-1')?.response, { ok: true });
assert.equal(errorCode(() => repository.write({ ...receipt, requestHash: 'different' })), 'idempotency_conflict');

console.log('coop phase2 lifecycle OK');
