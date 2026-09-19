"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const queue_service_1 = require("../queue-service");
const now = 100_000;
const ticket = (id, role, accountId = id) => ({ id, accountId, characterId: `char-${id}`, role, normalizedReadiness: 1, loadoutId: `load-${id}`, loadoutRevision: 1, loadoutSnapshotHash: `hash-${id}`, expeditionId: 'EXP_001', tier: 1, contentVersion: 'v1', balanceVersion: 'b1', serviceRegion: 'eu', enqueuedAtMs: 0, heartbeatExpiresAtMs: now + 10_000, status: 'queued' });
node_assert_1.strict.equal((0, queue_service_1.chooseBoundedCoopMatch)([ticket('d1', 'damage'), ticket('d2', 'damage'), ticket('d3', 'damage'), ticket('d4', 'damage')], now), null);
node_assert_1.strict.equal((0, queue_service_1.chooseBoundedCoopMatch)([ticket('t', 'tank'), ticket('d1', 'damage'), ticket('d2', 'damage')], now), null);
const valid = [ticket('t', 'tank'), ticket('d1', 'damage'), ticket('d2', 'damage'), ticket('s', 'support')];
const candidate = (0, queue_service_1.chooseBoundedCoopMatch)(valid, now);
node_assert_1.strict.ok(candidate);
node_assert_1.strict.equal(candidate.ticketIds.length, 4);
const repository = new queue_service_1.MemoryQueueRepository();
valid.forEach(row => repository.add(row));
const first = repository.reserve(candidate, 'reservation-a', now, now + 20_000);
node_assert_1.strict.equal(first.every(row => row.status === 'reserved'), true);
const readyRoster = (0, queue_service_1.readyRosterFromReservedTickets)(first);
node_assert_1.strict.equal(readyRoster[0].loadoutRevision, 1);
node_assert_1.strict.equal(readyRoster.every(row => row.loadoutSnapshotHash.startsWith('hash-')), true);
let race = '';
try {
    repository.reserve(candidate, 'reservation-b', now, now + 20_000);
}
catch (error) {
    race = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(race, 'reservation_conflict');
repository.releaseExpired(now + 20_001);
node_assert_1.strict.equal(repository.list().every(row => row.status === 'queued'), true);
const duplicateAccount = [ticket('t2', 'tank', 'same'), ticket('d3', 'damage', 'same'), ticket('d4', 'damage'), ticket('s2', 'support')];
node_assert_1.strict.equal((0, queue_service_1.chooseBoundedCoopMatch)(duplicateAccount, now), null);
console.log('coop phase7 matchmaking OK');
