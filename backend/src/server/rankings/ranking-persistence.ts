import type {RankingBoardId,RankingBoardProjection} from './ranking-types';
export interface RankingRepository{board(accountId:string,board:RankingBoardId,limit:number,offset:number,nowMs:number):Promise<RankingBoardProjection>}
