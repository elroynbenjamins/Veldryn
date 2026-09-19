"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineLiveReady = void 0;
const queue_service_1 = require("../src/server/coop/queue-service");
const loadout_snapshots_1 = require("../src/server/coop/loadout-snapshots");
const launch_content_1 = require("../src/server/expeditions/content/launch-content");
const config_1 = require("../src/server/coop/config");
const coop_loadout_1 = require("./coop-loadout");
const gameplay_1 = require("./gameplay");
/** Live clients' queue polling drives bounded matching. The database owns ready
 * deadlines, membership and receipts; its cron worker also expires idle checks. */
class OnlineLiveReady {
    services;
    constructor(services) {
        this.services = services;
    }
    async match(accountId) {
        const pool = await this.services.rpc('online_live_candidates_server_v1', { p_account_id: accountId });
        const candidate = (0, queue_service_1.chooseBoundedCoopMatch)(pool.tickets, pool.serverNow, 8, pool.requiredTicketIds, roster => !(pool.blockedPairs ?? []).some(pair => roster.some(row => row.accountId === pair.blocker) && roster.some(row => row.accountId === pair.blocked)));
        if (!candidate)
            return;
        try {
            await this.services.rpc('open_online_live_ready_server_v1', { p_account_id: accountId, p_ticket_ids: candidate.ticketIds, p_check_id: this.services.randomId(), p_refill_id: pool.refillId });
        }
        catch (error) {
            if (!/reservation_conflict|stale_ready_roster/i.test(error instanceof Error ? error.message : ''))
                throw error;
        }
    }
    load(accountId, checkId) { return this.services.rpc('online_live_ready_state_server_v1', { p_account_id: accountId, p_check_id: checkId }); }
    async respond(accountId, checkId, request) {
        // Receipt lookup precedes equipment reads so committed requests can replay
        // after unrelated gameplay changes or a ready deadline passes.
        const intent = JSON.stringify([request.rosterRevision, request.accept]);
        const replay = async () => {
            const prior = await this.services.rpc('read_online_coop_receipt_server_v1', { p_account_id: accountId, p_operation: 'live_ready_v1', p_resource_id: checkId, p_request_id: request.requestId });
            if (prior && prior.requestHash !== intent)
                throw new gameplay_1.GameplayError('idempotency_key_conflict', 409);
            return prior;
        };
        const prior = await replay();
        if (prior)
            return prior.response;
        try {
            let frozen = null;
            if (request.accept) {
                const source = await this.services.rpc('online_live_ready_sources_server_v1', { p_account_id: accountId, p_check_id: checkId });
                const definition = launch_content_1.EXPEDITIONS[source.dungeonId];
                if (!definition?.coopImplemented)
                    throw new gameplay_1.GameplayError('dungeon_unavailable');
                const records = source.members.map(member => (0, coop_loadout_1.deriveOnlineCoopLoadout)(member.accountId, member.state, member.version));
                frozen = (0, loadout_snapshots_1.freezeCoopRosterAtCommit)({ minLevel: (0, config_1.coopRequiredLevel)(definition.minLevel, source.tier), syncLevel: definition.recommendedLevel,
                    selections: source.members.map(member => ({ accountId: member.accountId, characterId: member.characterId, loadoutId: member.loadoutId, expectedRevision: member.loadoutRevision, queuedSnapshotHash: member.loadoutSnapshotHash })),
                    repository: { getOwnedLoadout: (owner, character, loadout) => records.find(record => record.accountId === owner && record.characterId === character && record.loadoutId === loadout) },
                });
            }
            return await this.services.rpc('respond_online_live_ready_server_v1', { p_account_id: accountId, p_check_id: checkId, p_roster_revision: request.rosterRevision, p_accept: request.accept, p_request_id: request.requestId, p_request_hash: intent, p_frozen_roster: frozen });
        }
        catch (error) {
            const receipt = await replay();
            if (receipt)
                return receipt.response;
            throw error;
        }
    }
}
exports.OnlineLiveReady = OnlineLiveReady;
