"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const supabase_ranking_repository_1 = require("../supabase-ranking-repository");
const ranking_application_1 = require("../ranking-application");
const ranking_http_application_1 = require("../ranking-http-application");
const ranking_api_contracts_1 = require("../ranking-api-contracts");
class Memory {
    last;
    async board(accountId, board, limit, offset, nowMs) { this.last = { accountId, board, limit, offset, nowMs }; return { board, title: 'Arena Rating', description: 'Seasonal rating', unit: 'rating', prestigeOnly: true, generatedAtMs: nowMs, entries: [{ rank: 1, entityType: 'account', displayName: 'Aster', value: 1420, isSelf: true }], self: { listed: true, rank: 1, value: 1420 } }; }
}
const expectThrow = (fn) => { let threw = false; try {
    fn();
}
catch {
    threw = true;
} node_assert_1.strict.equal(threw, true); };
const main = async () => {
    node_assert_1.strict.equal((0, ranking_api_contracts_1.parseRankingBoard)('guild'), 'guild');
    node_assert_1.strict.equal((0, ranking_api_contracts_1.parseRankingLimit)('50'), 50);
    node_assert_1.strict.equal((0, ranking_api_contracts_1.parseRankingOffset)('12'), 12);
    expectThrow(() => (0, ranking_api_contracts_1.parseRankingBoard)('combat_level'));
    expectThrow(() => (0, ranking_api_contracts_1.parseRankingLimit)(101));
    expectThrow(() => (0, ranking_api_contracts_1.parseRankingOffset)(-1));
    const repo = new Memory(), http = new ranking_http_application_1.RankingHttpApplication(new ranking_application_1.RankingApplicationService(repo)), board = await http.board(' account-a ', { board: 'arena_rating', limit: 50, offset: 12 }, 1234);
    node_assert_1.strict.equal(board.entries[0].displayName, 'Aster');
    node_assert_1.strict.equal(repo.last?.accountId, 'account-a');
    node_assert_1.strict.equal(repo.last?.limit, 50);
    node_assert_1.strict.equal(repo.last?.offset, 12);
    node_assert_1.strict.equal(repo.last?.nowMs, 1234);
    expectThrow(() => http.board('a', { board: 'arena_rating' }, Number.NaN));
    const calls = [];
    const client = { rpc: async (name, args) => {
            calls.push({ name, args });
            return { data: { board: args.p_board, title: 'Verified', description: 'server-sourced', unit: 'level', prestigeOnly: true, generatedAtMs: 1234, entries: [] }, error: null };
        } };
    const legacy = new supabase_ranking_repository_1.SupabaseRankingRepository(client);
    await legacy.board('account-a', 'mining', 51, 50, 1234);
    node_assert_1.strict.equal(calls[0]?.name, 'rankings_board_server_v2', 'production default must use existing v2');
    const selected = new supabase_ranking_repository_1.SupabaseRankingRepository(client, true);
    const selectedBoard = await selected.board('account-a', 'dungeon_clears', 51, 50, 1234);
    node_assert_1.strict.equal(selectedBoard.board, 'dungeon_clears');
    node_assert_1.strict.equal(calls[1]?.name, 'rankings_board_server_v3');
    node_assert_1.strict.deepEqual(calls[1]?.args, { p_requester: 'account-a', p_board: 'dungeon_clears', p_limit: 51, p_offset: 50 });
    const missingCalls = [];
    const missing = { rpc: async (name, _args) => {
            missingCalls.push(name);
            return { data: null, error: { code: 'PGRST202', message: 'not deployed' } };
        } };
    let v3MissingRejected = false;
    try {
        await new supabase_ranking_repository_1.SupabaseRankingRepository(missing, true).board('account-a', 'mining', 51, 0, 1234);
    }
    catch (error) {
        v3MissingRejected = String(error).includes('rankings_persistence');
    }
    ;
    node_assert_1.strict.equal(v3MissingRejected, true, 'missing v3 RPC must fail closed with persistence error');
    node_assert_1.strict.deepEqual(missingCalls, ['rankings_board_server_v3'], 'missing v3 must fail closed and never query v2');
    console.log('ranking application PASS');
};
void main();
