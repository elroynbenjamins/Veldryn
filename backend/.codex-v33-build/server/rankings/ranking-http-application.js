"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankingHttpApplication = void 0;
const ranking_api_contracts_1 = require("./ranking-api-contracts");
class RankingHttpApplication {
    rankings;
    constructor(rankings) {
        this.rankings = rankings;
    }
    board(accountId, query, nowMs) { return this.rankings.board(accountId, (0, ranking_api_contracts_1.parseRankingBoard)(query.board), (0, ranking_api_contracts_1.parseRankingLimit)(query.limit), (0, ranking_api_contracts_1.parseRankingOffset)(query.offset), nowMs); }
}
exports.RankingHttpApplication = RankingHttpApplication;
