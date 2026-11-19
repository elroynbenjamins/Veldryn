"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const queue_service_1 = require("../queue-service");
const now = 100_000;
const defaultClass = (id, role) => role === 'tank' ? 'IRONWARDEN' : role === 'support' ? 'DAWNKEEPER' : id.endsWith('2') || id.endsWith('4') ? 'RAVAGER' : 'WAYFINDER';
const ticket = (id, role, accountId = id, classId = defaultClass(id, role)) => ({ id, accountId, characterId: `char-${id}`, role, classId, normalizedReadiness: 1, powerIndex: 10_000, loadoutId: `load-${id}`, loadoutRevision: 1, loadoutSnapshotHash: `hash-${id}`, expeditionId: 'EXP_001', tier: 1, contentVersion: 'v1', balanceVersion: 'b1', serviceRegion: 'eu', enqueuedAtMs: 0, heartbeatExpiresAtMs: now + 10_000, status: 'queued' });
node_assert_1.strict.equal((0, queue_service_1.chooseBoundedCoopMatch)([ticket('d1', 'damage'), ticket('d2', 'damage'), ticket('d3', 'damage'), ticket('d4', 'damage')], now), null);
node_assert_1.strict.equal((0, queue_service_1.chooseBoundedCoopMatch)([ticket('t', 'tank'), ticket('d1', 'damage'), ticket('d2', 'damage')], now), null);
node_assert_1.strict.equal((0, queue_service_1.chooseQuickMatchExpedition)([{ expeditionId: 'EXP_001', tank: 0, damage: 2, support: 1, oldestQueuedAtMs: 0 }, { expeditionId: 'EXP_002', tank: 0, damage: 0, support: 0 }], ['EXP_002', 'EXP_001'], 'tank', now), 'EXP_001', 'Quick Match should fill the role-short dungeon first');
node_assert_1.strict.equal((0, queue_service_1.chooseQuickMatchExpedition)([], ['EXP_004', 'EXP_003'], 'damage', now), 'EXP_004', 'empty pools should preserve the server-provided progression preference');
const valid = [{ ...ticket('t', 'tank'), tier: 5 }, { ...ticket('d1', 'damage'), tier: 3 }, { ...ticket('d2', 'damage'), tier: 4 }, { ...ticket('s', 'support'), tier: 3 }];
const candidate = (0, queue_service_1.chooseBoundedCoopMatch)(valid, now);
node_assert_1.strict.ok(candidate);
node_assert_1.strict.equal(candidate.ticketIds.length, 4);
node_assert_1.strict.equal((0, queue_service_1.resolvedAutoTier)(valid), 3, 'live roster should resolve to the highest tier shared by all four players');
const duplicateDamage = [ticket('td', 'tank'), ticket('same-dps-1', 'damage', 'dps-a', 'WAYFINDER'), ticket('same-dps-2', 'damage', 'dps-b', 'WAYFINDER'), ticket('sd', 'support')];
node_assert_1.strict.equal((0, queue_service_1.chooseBoundedCoopMatch)(duplicateDamage, now), null, 'Live matchmaking must never pair two copies of the same Damage class');
const alternateDamage = [...duplicateDamage, ticket('different-dps', 'damage', 'dps-c', 'RAVAGER')];
const alternateCandidate = (0, queue_service_1.chooseBoundedCoopMatch)(alternateDamage, now);
node_assert_1.strict.ok(alternateCandidate);
node_assert_1.strict.ok(alternateCandidate.ticketIds.includes('different-dps'), 'matcher should use another Damage class when one is available');
const mismatchedPower = [{ ...ticket('pt', 'tank'), powerIndex: 10_000 }, { ...ticket('pd1', 'damage'), powerIndex: 10_100 }, { ...ticket('pd2', 'damage'), powerIndex: 9_950 }, { ...ticket('ps', 'support'), powerIndex: 20_000 }];
node_assert_1.strict.equal((0, queue_service_1.chooseBoundedCoopMatch)(mismatchedPower, now), null, 'matching must not form an impossible power-spread party');
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
