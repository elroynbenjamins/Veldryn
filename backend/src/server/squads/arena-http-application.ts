import {ArenaApplicationService} from './arena-application';
import {parseArenaClaimRequest,parseArenaOpponentRequest,parseArenaPublishRequest,parseArenaStartRequest} from './arena-api-contracts';

/** Framework-neutral authenticated boundary. The caller supplies only verified identity and server time. */
export class ArenaHttpApplication{
  constructor(private readonly arena:ArenaApplicationService){}
  private verified(accountId:string,nowMs:number){if(typeof accountId!=='string'||accountId.trim().length<1||accountId.length>128)throw new Error('invalid_authenticated_account');if(!Number.isSafeInteger(nowMs)||nowMs<0)throw new Error('invalid_server_time');return accountId.trim()}
  entry(accountId:string,nowMs:number){return this.arena.entry(...this.verifiedArgs(accountId,nowMs))}
  publishDefense(accountId:string,body:unknown,nowMs:number){const [id,time]=this.verifiedArgs(accountId,nowMs);return this.arena.publishDefense(id,{...parseArenaPublishRequest(body),nowMs:time})}
  opponents(accountId:string,body:unknown,nowMs:number){const [id,time]=this.verifiedArgs(accountId,nowMs);return this.arena.opponents(id,{...parseArenaOpponentRequest(body),nowMs:time})}
  startMatch(accountId:string,body:unknown,nowMs:number){const [id,time]=this.verifiedArgs(accountId,nowMs);return this.arena.startMatch(id,{...parseArenaStartRequest(body),nowMs:time})}
  history(accountId:string,limit=20){return this.arena.history(this.verified(accountId,Date.now()),limit)}
  claimReward(accountId:string,entitlementId:string,body:unknown,nowMs:number){const [id,time]=this.verifiedArgs(accountId,nowMs);if(typeof entitlementId!=='string'||entitlementId.trim().length<1||entitlementId.length>128)throw new Error('invalid_entitlement_id');return this.arena.claimReward(id,entitlementId.trim(),parseArenaClaimRequest(body).requestId,time)}
  private verifiedArgs(accountId:string,nowMs:number):[string,number]{return [this.verified(accountId,nowMs),nowMs]}
}
