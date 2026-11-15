/** Post-settlement read adapter for Day-8 Party Events and six-week Guild PvE.
 * The mode settlement writer is intentionally separate; no client endpoint can
 * submit scores or trigger archive finalization. */
export type FinalMode='party_event'|'guild_pve';
export const PARTY_EVENT_HISTORY_RELEASED=false;
export const GUILD_PVE_HISTORY_RELEASED=false;
export interface FinalModeProjection{
  mode:FinalMode;eventKey:string;metric:string;bracket:string;
  prestigeOnly:true;finalizedAtMs:number;generatedAtMs:number;
  entries:Array<{rank:number;entityType:'party'|'guild';displayName:string;
    value:number;secondaryValue:number;isSelf:false}>;
}
export interface FinalModeRpcClient{
  rpc<T>(name:string,args:Record<string,unknown>):Promise<{
    data:T|null;error:{code?:string;message:string}|null
  }>;
}
export class SupabaseFinalModeHistoryRepository{
  constructor(private readonly client:FinalModeRpcClient){}
  async event(mode:FinalMode,eventKey:string,metric:string,bracket:string,limit:number,offset:number){
    const result=await this.client.rpc<FinalModeProjection>(
      'rankings_final_mode_history_server_v1',{
        p_mode:mode,p_event_key:eventKey,p_metric:metric,p_bracket:bracket,
        p_limit:limit,p_offset:offset
      });
    if(result.error||!result.data||result.data.prestigeOnly!==true
      ||result.data.mode!==mode||result.data.eventKey!==eventKey
      ||result.data.metric!==metric||result.data.bracket!==bracket
      ||!Array.isArray(result.data.entries))
      throw new Error('FINAL_MODE_RANKING_UNAVAILABLE');
    return structuredClone(result.data);
  }
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class FinalModeHistoryApplication{
  constructor(
    private readonly repository:SupabaseFinalModeHistoryRepository,
    private readonly flags:{
      rankingsReleased:boolean;partyEventReleased:boolean;guildPveReleased:boolean
    }={rankingsReleased:false,partyEventReleased:PARTY_EVENT_HISTORY_RELEASED,
      guildPveReleased:GUILD_PVE_HISTORY_RELEASED}
  ){}
  event(accountId:string,scope:{mode:FinalMode;eventKey:string;metric:string;
    bracket:string;limit?:number;offset?:number}){
    if(!this.flags.rankingsReleased ||
      (scope.mode==='party_event'&&!this.flags.partyEventReleased) ||
      (scope.mode==='guild_pve'&&!this.flags.guildPveReleased))
      throw new Error('FINAL_MODE_RANKINGS_DISABLED');
    if(!UUID.test(accountId))throw new Error('AUTH_REQUIRED');
    if(!['party_event','guild_pve'].includes(scope.mode)
      ||typeof scope.eventKey!=='string'||scope.eventKey.length<1||scope.eventKey.length>120
      ||typeof scope.bracket!=='string'||!/^[-a-z0-9_:]{1,48}$/.test(scope.bracket)
      ||(scope.mode==='party_event'&&!['damage','depth','support','shielding','mechanics'].includes(scope.metric))
      ||(scope.mode==='guild_pve'&&!['campaign_score','campaign_progress','contribution'].includes(scope.metric)))
      throw new Error('INVALID_FINAL_MODE_RANKING_SCOPE');
    const limit=scope.limit??50,offset=scope.offset??0;
    if(!Number.isSafeInteger(limit)||limit<1||limit>100
      ||!Number.isSafeInteger(offset)||offset<0||offset>10000)
      throw new Error('INVALID_FINAL_MODE_PAGE');
    return this.repository.event(scope.mode,scope.eventKey,scope.metric,scope.bracket,limit,offset);
  }
}
