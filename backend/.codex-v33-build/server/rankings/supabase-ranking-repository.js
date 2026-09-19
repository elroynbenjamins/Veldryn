"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseRankingRepository = void 0;
/** Service-role adapter: the database RPC owns ordering, visibility, and metric derivation. */
class SupabaseRankingRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async board(accountId, board, limit, offset, _nowMs) {
        const result = await this.client.rpc('rankings_board_server_v1', { p_requester: accountId, p_board: board, p_limit: limit, p_offset: offset });
        if (result.error)
            throw new Error(`rankings_persistence:${result.error.code ?? 'unknown'}:${result.error.message}`);
        if (!result.data)
            throw new Error('rankings_empty_response');
        return structuredClone(result.data);
    }
}
exports.SupabaseRankingRepository = SupabaseRankingRepository;
