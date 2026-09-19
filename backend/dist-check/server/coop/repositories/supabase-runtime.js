"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseCoopRuntimeRepository = void 0;
const errors_1 = require("../errors");
function domainError(error) {
    const message = error.message.toUpperCase();
    if (message.includes('STALE_STATE'))
        return new errors_1.CoopDomainError('stale_state');
    if (message.includes('NOT_PARTICIPANT'))
        return new errors_1.CoopDomainError('not_participant');
    if (message.includes('RESERVATION_CONFLICT'))
        return new errors_1.CoopDomainError('reservation_conflict');
    return new Error(`coop_persistence:${error.code ?? 'unknown'}:${error.message}`);
}
class SupabaseCoopRuntimeRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async load(runId, actorAccountId) {
        const result = await this.client.rpc('load_coop_runtime_server_v1', {
            p_run_id: runId, p_actor_account_id: actorAccountId,
        });
        if (result.error)
            throw domainError(result.error);
        if (!result.data)
            throw new Error('run_not_found');
        return structuredClone(result.data);
    }
    async compareAndSet(input) {
        const result = await this.client.rpc('commit_coop_runtime_server_v1', {
            p_run_id: input.runId, p_actor_account_id: input.actorAccountId,
            p_expected_state_version: input.expectedStateVersion, p_phase: input.phase,
            p_current_node_id: input.currentNodeId ?? null, p_cleared_pre_boss_count: input.clearedPreBossCount,
            p_private_state: input.privateState, p_client_projection: input.clientProjection,
            p_event_cursor: input.eventCursor, p_event_type: input.eventType,
            p_event_payload: input.eventPayload, p_semantic_key: input.semanticKey,
        });
        if (result.error)
            throw domainError(result.error);
        if (!result.data)
            throw new Error('empty_commit_response');
        return structuredClone(result.data);
    }
    async claimDueJobs(workerId, limit = 16, leaseMs = 30_000) {
        const result = await this.client.rpc('claim_coop_due_jobs_server_v1', {
            p_worker_id: workerId, p_limit: limit, p_lease_ms: leaseMs,
        });
        if (result.error)
            throw domainError(result.error);
        return structuredClone(result.data ?? []);
    }
    async reserveMatch(ticketIds, reservationId, now, expiresAt, readinessFloor = .8) {
        if (ticketIds.length !== 4 || new Set(ticketIds).size !== 4)
            throw new Error('invalid_reservation_request');
        const result = await this.client.rpc('reserve_coop_match_server_v1', {
            p_ticket_ids: [...ticketIds], p_reservation_id: reservationId, p_now: now, p_expires_at: expiresAt, p_readiness_floor: readinessFloor,
        });
        if (result.error)
            throw domainError(result.error);
        if (!result.data || result.data.length !== 4)
            throw new Error('invalid_reservation_response');
        return structuredClone(result.data);
    }
    async releaseExpiredReservations(now) {
        const result = await this.client.rpc('release_expired_coop_reservations_server_v1', { p_now: now });
        if (result.error)
            throw domainError(result.error);
        return result.data ?? 0;
    }
}
exports.SupabaseCoopRuntimeRepository = SupabaseCoopRuntimeRepository;
