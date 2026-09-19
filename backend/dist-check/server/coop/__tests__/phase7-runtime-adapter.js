"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const errors_1 = require("../errors");
const supabase_runtime_1 = require("../repositories/supabase-runtime");
async function main() {
    const calls = [];
    const members = [['t', 'tank'], ['d1', 'damage'], ['d2', 'damage'], ['s', 'support']].map(([id, role]) => ({ ticketId: id, accountId: `a-${id}`, characterId: `c-${id}`, role: role, loadoutId: `l-${id}`, loadoutRevision: 1, loadoutSnapshotHash: `h-${id}`, originalEnqueuedAt: '2026-09-09T00:00:00Z', reservationId: 'reservation-1', reservationExpiresAt: '2026-09-09T00:00:20Z' }));
    const client = { rpc: async (name, args) => { calls.push({ name, args }); return { data: (name === 'reserve_coop_match_server_v1' ? members : 4), error: null }; } };
    const repository = new supabase_runtime_1.SupabaseCoopRuntimeRepository(client);
    const reserved = await repository.reserveMatch(['t', 'd1', 'd2', 's'], 'reservation-1', '2026-09-09T00:00:00Z', '2026-09-09T00:00:20Z');
    node_assert_1.strict.equal(reserved.length, 4);
    node_assert_1.strict.deepEqual(calls[0].args.p_ticket_ids, ['t', 'd1', 'd2', 's']);
    node_assert_1.strict.equal(calls[0].args.p_readiness_floor, .8);
    node_assert_1.strict.equal(await repository.releaseExpiredReservations('2026-09-09T00:00:21Z'), 4);
    node_assert_1.strict.equal(calls[1].name, 'release_expired_coop_reservations_server_v1');
    let invalid = '';
    try {
        await repository.reserveMatch(['t', 'd1', 'd1', 's'], 'reservation-2', 'now', 'later');
    }
    catch (error) {
        invalid = error instanceof Error ? error.message : String(error);
    }
    node_assert_1.strict.equal(invalid, 'invalid_reservation_request');
    const conflict = new supabase_runtime_1.SupabaseCoopRuntimeRepository({ rpc: async () => ({ data: null, error: { message: 'RESERVATION_CONFLICT' } }) });
    let conflictCode = '';
    try {
        await conflict.reserveMatch(['t', 'd1', 'd2', 's'], 'reservation-2', 'now', 'later');
    }
    catch (error) {
        conflictCode = error instanceof errors_1.CoopDomainError ? error.code : String(error);
    }
    node_assert_1.strict.equal(conflictCode, 'reservation_conflict');
    console.log('coop phase7 runtime adapter OK');
}
void main();
