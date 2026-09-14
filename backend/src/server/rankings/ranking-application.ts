import type {RankingRepository} from './ranking-persistence';
import type {RankingBoardId} from './ranking-types';
export class RankingApplicationService{
 constructor(private readonly repo:RankingRepository){}
 board(accountId:string,board:RankingBoardId,limit=50,offset=0,nowMs=Date.now()){if(typeof accountId!=='string'||!accountId.trim())throw new Error('AUTH_REQUIRED');if(!Number.isSafeInteger(nowMs)||nowMs<0)throw new Error('INVALID_TIME');return this.repo.board(accountId.trim(),board,Math.max(1,Math.min(100,Math.floor(limit))),Math.max(0,Math.min(10000,Math.floor(offset))),nowMs)}
}
