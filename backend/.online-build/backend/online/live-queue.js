"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineLiveQueue = void 0;
const node_crypto_1 = require("node:crypto");
const launch_content_1 = require("../src/server/expeditions/content/launch-content");
const config_1 = require("../src/server/coop/config");
const loadout_snapshots_1 = require("../src/server/coop/loadout-snapshots");
const coop_loadout_1 = require("./coop-loadout");
const gameplay_1 = require("./gameplay");
const live_ready_1 = require("./live-ready");
/** Live admission reuses matchmaking_tickets. The selected loadout is a reference,
 * never a source of client-supplied stats, role, readiness, owner or time. */
class OnlineLiveQueue {
    services;
    constructor(services) {
        this.services = services;
    }
    async join(accountId, request) {
        if (request.mode !== 'live')
            throw new gameplay_1.GameplayError('invalid_mode');
        const hash = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(request)).digest('hex');
        const replay = async () => {
            const prior = await this.services.rpc('read_online_coop_receipt_server_v1', { p_account_id: accountId, p_operation: 'live_queue_v1', p_resource_id: accountId, p_request_id: request.requestId });
            if (prior && prior.requestHash !== hash)
                throw new gameplay_1.GameplayError('idempotency_key_conflict', 409);
            return prior;
        };
        const prior = await replay();
        if (prior)
            return prior.response;
        const definition = launch_content_1.EXPEDITIONS[request.dungeonId];
        if (!definition?.coopImplemented)
            throw new gameplay_1.GameplayError('dungeon_unavailable');
        const game = await this.services.rpc('load_online_game_server_v1', { p_account_id: accountId });
        if (!game.state?.character)
            throw new gameplay_1.GameplayError('character_required');
        if (game.state.character.id !== request.characterId || request.loadoutId !== 'current')
            throw new gameplay_1.GameplayError('loadout_not_owned', 403);
        if (game.version !== request.loadoutRevision) {
            const receipt = await replay();
            if (receipt)
                return receipt.response;
            throw new gameplay_1.GameplayError('stale_game_version', 409);
        }
        const record = (0, coop_loadout_1.deriveOnlineCoopLoadout)(accountId, game.state, game.version);
        const snapshot = (0, loadout_snapshots_1.resolveAndFreezeLoadout)({ accountId, characterId: request.characterId, loadoutId: 'current', expectedRevision: game.version, minLevel: (0, config_1.coopRequiredLevel)(definition.minLevel, request.tier), syncLevel: definition.recommendedLevel, repository: { getOwnedLoadout: () => record } });
        return this.services.rpc('join_online_live_queue_server_v1', {
            p_account_id: accountId, p_game_version: game.version, p_request_id: request.requestId, p_request_hash: hash,
            p_ticket_id: this.services.randomId(), p_expedition_id: definition.id, p_tier: request.tier,
            p_content_version: coop_loadout_1.ONLINE_COOP_BALANCE_VERSION, p_snapshot: snapshot,
        });
    }
    async state(accountId) {
        await new live_ready_1.OnlineLiveReady(this.services).match(accountId);
        return this.services.rpc('online_live_queue_state_server_v1', { p_account_id: accountId });
    }
    command(accountId, ticketId, action, requestId) {
        return this.services.rpc('command_online_live_queue_server_v1', { p_account_id: accountId, p_ticket_id: ticketId, p_action: action, p_request_id: requestId });
    }
}
exports.OnlineLiveQueue = OnlineLiveQueue;
