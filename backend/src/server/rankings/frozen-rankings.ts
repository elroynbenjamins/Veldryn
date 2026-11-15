import type {RankingBoardId,RankingBoardProjection} from './ranking-types';
import {parseRankingBoard,parseRankingLimit} from './ranking-api-contracts';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Never enable via client-controlled state. The server owns both switches. */
export const RANKINGS_SNAPSHOT_RELEASED=false;
export interface FrozenRankingPage extends RankingBoardProjection {
  frozen:true;
  cursor:string;
  nextCursor:string|null;
  hasNext:boolean;
  expiresAtMs:number;
  pageSize:number;
}
export interface FrozenRankingRpcClient {
  rpc<T>(name:string,args:Record<string,unknown>):Promise<{
    data:T|null;error:{code?:string;message:string}|null
  }>;
}

function isValidPage(value:unknown):value is FrozenRankingPage{
  if(!value||typeof value!=='object')return false;
  const row=value as Partial<FrozenRankingPage>;
  return row.frozen===true&&row.prestigeOnly===true
    &&typeof row.board==='string'
    &&typeof row.cursor==='string'&&UUID.test(row.cursor)
    &&(row.nextCursor===null||(typeof row.nextCursor==='string'&&UUID.test(row.nextCursor)))
    &&typeof row.hasNext==='boolean'
    &&row.hasNext===Boolean(row.nextCursor)
    &&Number.isSafeInteger(row.expiresAtMs)
    &&typeof row.pageSize==='number'&&Number.isSafeInteger(row.pageSize)
    &&row.pageSize>=1&&row.pageSize<=50
    &&Array.isArray(row.entries)&&row.entries.length<=row.pageSize;
}

/** Service-role client only. No access token or private account ID is returned in page entries. */
export class SupabaseFrozenRankingReader {
  constructor(private readonly client:FrozenRankingRpcClient){}
  async start(accountId:string,board:RankingBoardId,pageSize=50):Promise<FrozenRankingPage>{
    const result=await this.client.rpc<FrozenRankingPage>('rankings_frozen_start_server_v1',{
      p_requester:accountId,p_board:board,p_page_size:pageSize
    });
    if(result.error||!isValidPage(result.data)||result.data.board!==board)
      throw new Error('RANKING_SNAPSHOT_UNAVAILABLE');
    return structuredClone(result.data);
  }
  async page(accountId:string,cursor:string):Promise<FrozenRankingPage>{
    const result=await this.client.rpc<FrozenRankingPage>('rankings_frozen_page_server_v1',{
      p_requester:accountId,p_cursor:cursor
    });
    if(result.error||!isValidPage(result.data)||result.data.cursor!==cursor)
      throw new Error('RANKING_SNAPSHOT_EXPIRED');
    return structuredClone(result.data);
  }
}

/** Only authenticated server routes may instantiate this application. */
export class FrozenRankingsApplication {
  constructor(
    private readonly reader:SupabaseFrozenRankingReader,
    private readonly gates:{rankingsReleased:boolean;snapshotsReleased:boolean}={
      rankingsReleased:false,snapshotsReleased:RANKINGS_SNAPSHOT_RELEASED
    }
  ){}
  private verifyAccount(accountId:string){
    if(typeof accountId!=='string'||!UUID.test(accountId))
      throw new Error('AUTH_REQUIRED');
    if(!this.gates.rankingsReleased||!this.gates.snapshotsReleased)
      throw new Error('RANKING_SNAPSHOTS_DISABLED');
  }
  start(accountId:string,query:{board?:unknown;limit?:unknown}):Promise<FrozenRankingPage>{
    this.verifyAccount(accountId);
    const board=parseRankingBoard(query.board);
    const limit=parseRankingLimit(query.limit);
    if(limit>50)throw new Error('INVALID_SNAPSHOT_PAGE_SIZE');
    return this.reader.start(accountId,board,limit);
  }
  page(accountId:string,query:{cursor?:unknown}):Promise<FrozenRankingPage>{
    this.verifyAccount(accountId);
    if(typeof query.cursor!=='string'||!UUID.test(query.cursor))
      throw new Error('INVALID_RANKING_CURSOR');
    return this.reader.page(accountId,query.cursor);
  }
}
