import type {RankingRepository} from './ranking-persistence';
import type {RankingBoardId,RankingBoardProjection} from './ranking-types';

export interface RankingRpcClient{rpc<T>(name:string,args:Record<string,unknown>):Promise<{data:T|null;error:{message:string;code?:string}|null}>}

/** Service-role adapter: the database RPC owns ordering, visibility, and metric derivation. */
export class SupabaseRankingRepository implements RankingRepository{
  constructor(private readonly client:RankingRpcClient){}
  async board(accountId:string,board:RankingBoardId,limit:number,offset:number,_nowMs:number):Promise<RankingBoardProjection>{
    const result=await this.client.rpc<RankingBoardProjection>('rankings_board_server_v1',{p_requester:accountId,p_board:board,p_limit:limit,p_offset:offset});
    if(result.error)throw new Error(`rankings_persistence:${result.error.code??'unknown'}:${result.error.message}`);
    if(!result.data)throw new Error('rankings_empty_response');
    return structuredClone(result.data);
  }
}
