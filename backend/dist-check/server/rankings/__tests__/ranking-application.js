"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
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
const main = async () => { node_assert_1.strict.equal((0, ranking_api_contracts_1.parseRankingBoard)('guild'), 'guild'); node_assert_1.strict.equal((0, ranking_api_contracts_1.parseRankingLimit)('50'), 50); node_assert_1.strict.equal((0, ranking_api_contracts_1.parseRankingOffset)('12'), 12); expectThrow(() => (0, ranking_api_contracts_1.parseRankingBoard)('combat_level')); expectThrow(() => (0, ranking_api_contracts_1.parseRankingLimit)(101)); expectThrow(() => (0, ranking_api_contracts_1.parseRankingOffset)(-1)); const repo = new Memory(), http = new ranking_http_application_1.RankingHttpApplication(new ranking_application_1.RankingApplicationService(repo)), board = await http.board(' account-a ', { board: 'arena_rating', limit: 50, offset: 12 }, 1234); node_assert_1.strict.equal(board.entries[0].displayName, 'Aster'); node_assert_1.strict.equal(repo.last?.accountId, 'account-a'); node_assert_1.strict.equal(repo.last?.limit, 50); node_assert_1.strict.equal(repo.last?.offset, 12); node_assert_1.strict.equal(repo.last?.nowMs, 1234); expectThrow(() => http.board('a', { board: 'arena_rating' }, Number.NaN)); console.log('ranking application PASS'); };
void main();
