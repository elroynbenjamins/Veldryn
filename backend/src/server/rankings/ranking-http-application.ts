import {parseRankingBoard,parseRankingLimit,parseRankingOffset} from './ranking-api-contracts';
import {RankingApplicationService} from './ranking-application';
export class RankingHttpApplication{
 constructor(private readonly rankings:RankingApplicationService){}
 board(accountId:string,query:{board?:unknown;limit?:unknown;offset?:unknown},nowMs:number){return this.rankings.board(accountId,parseRankingBoard(query.board),parseRankingLimit(query.limit),parseRankingOffset(query.offset),nowMs)}
}
