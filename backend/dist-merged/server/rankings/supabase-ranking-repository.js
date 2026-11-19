"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseRankingRepository = void 0;
/** Service-role adapter: the database RPC owns ordering, visibility, and metric derivation. */
class SupabaseRankingRepository {
    client;
    v3Enabled;
    /** Explicit opt-in for QA only. Default stays on the currently deployed v2 RPC. */
    constructor(client, v3Enabled = false) {
        this.client = client;
        this.v3Enabled = v3Enabled;
    }
    async board(accountId, board, limit, offset, _nowMs) {
        const result = await this.client.rpc(this.v3Enabled ? 'rankings_board_server_v3' : 'rankings_board_server_v2', { p_requester: accountId, p_board: board, p_limit: limit, p_offset: offset });
        if (result.error)
            throw new Error(`rankings_persistence:${result.error.code ?? 'unknown'}:${result.error.message}`);
        if (!result.data)
            throw new Error('rankings_empty_response');
        return structuredClone(result.data);
    }
}
exports.SupabaseRankingRepository = SupabaseRankingRepository;
