/** Hidden local QA lifecycle rehearsal. No timers, socket, network or device
 * storage. Future feed/Party provider integration must use canonical receipt
 * and invalidation events, not arbitrary message bodies or client success.
 */
export interface PartyChatRefreshScopeV114{readonly accountId:string;readonly partyId:string}
export interface PartyChatRefreshHintV114 extends PartyChatRefreshScopeV114{
 readonly eventId:string;readonly kind:'role_swap'|'contract_vote'|'event_vote'|'group_readiness'|'recruitment_request'|'shared_achievement';
 readonly terminal:boolean;readonly rosterChanged:boolean;
}
export interface PartyChatRefreshTargetsV114{readonly feed:boolean;readonly party:boolean}
export const PARTY_CHAT_REFRESH_V114_RELEASED=false;
const valid=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=128;
export class PartyChatRefreshPreviewV114{
 private scope:PartyChatRefreshScopeV114|null=null;
 private active=false;
 private seen=new Set<string>();
 private dirtyFeed=false;
 private dirtyParty=false;
 private generation=0;
 private pending:Promise<void>|null=null;
 constructor(private readonly read:(scope:PartyChatRefreshScopeV114,targets:PartyChatRefreshTargetsV114)=>Promise<void>,
  private readonly qaPreview=false){}
 setScope(scope:PartyChatRefreshScopeV114|null){
  if(scope?.accountId===this.scope?.accountId&&scope?.partyId===this.scope?.partyId)return;
  this.generation++;this.pending=null;this.seen.clear();this.dirtyFeed=false;this.dirtyParty=false;
  this.scope=scope&&valid(scope.accountId)&&valid(scope.partyId)?Object.freeze({...scope}):null;
 }
 setActive(active:boolean){
  if(active&&!this.active&&this.scope){this.dirtyFeed=true;this.dirtyParty=true;}
  this.active=active;
 }
 invalidate(hint:PartyChatRefreshHintV114){
  if(!this.qaPreview||!this.scope||hint.accountId!==this.scope.accountId||hint.partyId!==this.scope.partyId||
   !valid(hint.eventId)||this.seen.has(hint.eventId)||
   !['role_swap','contract_vote','event_vote','group_readiness','recruitment_request','shared_achievement'].includes(hint.kind)||
   typeof hint.terminal!=='boolean'||typeof hint.rosterChanged!=='boolean'||
   (hint.rosterChanged&&(!hint.terminal||!['role_swap','recruitment_request'].includes(hint.kind))))return false;
  this.seen.add(hint.eventId);
  if(this.seen.size>256)this.seen.delete(this.seen.values().next().value!);
  this.dirtyFeed=true;
  this.dirtyParty||=hint.rosterChanged;
  return true;
 }
 /** Host can batch events and call once. No new polling loop.
  * A failed read restores dirty state for the next explicit refresh. */
 flush():Promise<void>{
  if(!this.qaPreview||!this.active||!this.scope)return Promise.resolve();
  if(this.pending)return this.pending;
  if(!this.dirtyFeed&&!this.dirtyParty)return Promise.resolve();
  const scope=this.scope,generation=this.generation;
  const targets={feed:this.dirtyFeed,party:this.dirtyParty};
  this.dirtyFeed=false;this.dirtyParty=false;
  const request=Promise.resolve().then(()=>{
   if(generation!==this.generation||!this.active)return;
   return this.read(scope,targets);
  }).catch(error=>{
   if(generation===this.generation){this.dirtyFeed||=targets.feed;this.dirtyParty||=targets.party;}
   throw error;
  }).finally(()=>{
   if(generation===this.generation&&this.pending===request)this.pending=null;
  });
  this.pending=request;return request;
 }
}
