import type {RankingEntryProjection,RankingSelfProjection} from './ranking-types';

export interface WorldBossHistoryProjection{
  bossId:string;
  bossName:string;
  finalizedAtMs:number;
  generatedAtMs:number;
  prestigeOnly:true;
  entries:RankingEntryProjection[];
  self:RankingSelfProjection;
}
export interface WorldBossHistoryRepository{
  event(accountId:string,bossId:string,limit:number,offset:number):Promise<WorldBossHistoryProjection>;
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Independently gated event history, in addition to the database gate.
 * Both global Rankings and World Boss History gates must be explicitly true.
 * Defaults to fail closed, independent of the database gate.
 * Never create this service in the mobile client.
 */
export class WorldBossHistoryService{
  constructor(
    private readonly repository:WorldBossHistoryRepository,
    private readonly gates:{rankingsReleased:boolean;worldBossHistoryReleased:boolean}={rankingsReleased:false,worldBossHistoryReleased:false}
  ){}
  event(accountId:string,bossId:string,limit=50,offset=0){
    if(!this.gates.rankingsReleased||!this.gates.worldBossHistoryReleased)
      throw new Error('WORLD_BOSS_HISTORY_DISABLED');
    if(typeof accountId!=='string'||!UUID.test(accountId))throw new Error('AUTH_REQUIRED');
    if(typeof bossId!=='string'||!UUID.test(bossId))throw new Error('INVALID_WORLD_BOSS_ID');
    if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw new Error('INVALID_RANKING_LIMIT');
    if(!Number.isSafeInteger(offset)||offset<0||offset>10000)throw new Error('INVALID_RANKING_OFFSET');
    return this.repository.event(accountId,bossId,limit,offset);
  }
}
export interface WorldBossHistoryRpcClient{
  rpc<T>(name:string,args:Record<string,unknown>):Promise<{
    data:T|null;error:{code?:string;message:string}|null
  }>;
}
/** Authenticated backend only: do not give the service key to the app. */
export class SupabaseWorldBossHistoryRepository implements WorldBossHistoryRepository{
  constructor(private readonly client:WorldBossHistoryRpcClient){}
  async event(accountId:string,bossId:string,limit:number,offset:number){
    const result=await this.client.rpc<WorldBossHistoryProjection>(
      'leaderboards_world_boss_event_server_v1',{
        p_requester:accountId,p_boss_id:bossId,p_limit:limit,p_offset:offset
      });
    if(result.error)throw new Error(
      `world_boss_history_persistence:${result.error.code??'unknown'}:${result.error.message}`
    );
    if(!result.data)throw new Error('WORLD_BOSS_HISTORY_EMPTY_RESPONSE');
    return structuredClone(result.data);
  }
}

/** Parse an existing server-authenticated request; never trusts a caller's accountId. */
export class WorldBossHistoryHttpApplication{
  constructor(private readonly service:WorldBossHistoryService){}
  event(accountId:string,query:{bossId?:unknown;limit?:unknown;offset?:unknown}){
    const bossId=query.bossId;
    if(typeof bossId!=='string')throw new Error('INVALID_WORLD_BOSS_ID');
    const parse=(v:unknown,fallback:number,error:string)=>{
      if(v===undefined||v===null||v==='')return fallback;
      const n=typeof v==='string'?Number(v):v;
      if(typeof n!=='number'||!Number.isSafeInteger(n))throw new Error(error);
      return n;
    };
    return this.service.event(
      accountId,bossId,
      parse(query.limit,50,'INVALID_RANKING_LIMIT'),
      parse(query.offset,0,'INVALID_RANKING_OFFSET')
    );
  }
}
