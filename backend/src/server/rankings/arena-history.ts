import type {RankingEntryProjection,RankingSelfProjection} from './ranking-types';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type ArenaHistoryMetric='arena_rating'|'arena_wins';
export interface ArenaFinalHistory {
  board:ArenaHistoryMetric;seasonId:string;title:string;description:string;unit:string;
  prestigeOnly:true;finalizedAtMs:number;generatedAtMs:number;
  entries:RankingEntryProjection[];self:RankingSelfProjection;
}
export interface ArenaHistoryRpcClient {
  rpc<T>(name:string,args:Record<string,unknown>):Promise<{
    data:T|null;error:{code?:string;message:string}|null
  }>;
}
export const ARENA_HISTORY_RELEASED=false;
export class SupabaseArenaHistoryRepository {
  constructor(private readonly client:ArenaHistoryRpcClient){}
  async read(accountId:string,seasonId:string,metric:ArenaHistoryMetric,limit:number,offset:number){
    const r=await this.client.rpc<ArenaFinalHistory>(
      'rankings_arena_final_history_server_v1',{
        p_requester:accountId,p_season_id:seasonId,p_metric:metric,
        p_limit:limit,p_offset:offset
      });
    if(r.error||!r.data||r.data.prestigeOnly!==true
      ||r.data.board!==metric||r.data.seasonId!==seasonId
      ||!Array.isArray(r.data.entries))throw new Error('ARENA_HISTORY_UNAVAILABLE');
    return structuredClone(r.data);
  }
}
/** The client cannot enable Arena archives; both global and season gates default off. */
export class ArenaHistoryApplication {
  constructor(
    private readonly repository:SupabaseArenaHistoryRepository,
    private readonly flags:{rankingsReleased:boolean;arenaHistoryReleased:boolean}={
      rankingsReleased:false,arenaHistoryReleased:ARENA_HISTORY_RELEASED
    }
  ){}
  read(accountId:string,query:{
    seasonId?:unknown;metric?:unknown;limit?:unknown;offset?:unknown
  }){
    if(!this.flags.rankingsReleased||!this.flags.arenaHistoryReleased)
      throw new Error('ARENA_HISTORY_DISABLED');
    if(typeof accountId!=='string'||!UUID.test(accountId))
      throw new Error('AUTH_REQUIRED');
    if(typeof query.seasonId!=='string'
      ||query.seasonId.length>120||!query.seasonId.trim())
      throw new Error('INVALID_ARENA_SEASON');
    if(query.metric!=='arena_rating'&&query.metric!=='arena_wins')
      throw new Error('INVALID_ARENA_HISTORY_METRIC');
    const limit=query.limit===undefined?50:Number(query.limit);
    const offset=query.offset===undefined?0:Number(query.offset);
    if(!Number.isSafeInteger(limit)||limit<1||limit>100
      ||!Number.isSafeInteger(offset)||offset<0||offset>10000)
      throw new Error('INVALID_ARENA_HISTORY_PAGE');
    return this.repository.read(accountId,query.seasonId,query.metric,limit,offset);
  }
}
