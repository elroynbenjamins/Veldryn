/** Local QA preview only. The future authenticated host must supply a complete,
 * account-scoped active-request snapshot independently of chat history.
 * No disk cache, network, automatic mutation retries, or release authority.
 */
import {partyChatPreviewPresentationV113,partyChatPreviewIntentV113,
 type PartyChatPreviewCardV113,type PartyChatPreviewAction} from './party-chat-card-preview-v113';
export const PARTY_CHAT_ACTIVE_REQUESTS_V115_RELEASED=false;
const MAX_REQUESTS=24,MAX_FRESH_MS=30000;
type Scope={readonly accountId:string;readonly partyId:string};
export interface PartyActiveRequestV115{
 readonly card:PartyChatPreviewCardV113;
 readonly sourceRevision:number;
}
export interface PartyActiveSnapshotV115 extends Scope{
 readonly snapshotRevision:number;
 readonly rosterRevision:number;
 readonly serverNowMs:number;
 readonly requests:readonly PartyActiveRequestV115[];
}
type Ticket=Readonly<Scope&{generation:number;sequence:number;startedAt:number}>;
const valid=(s:unknown):s is string=>typeof s==='string'&&s.length>0&&s.length<=128;
const revision=(n:number)=>Number.isSafeInteger(n)&&n>=1;
const clock=(n:number)=>Number.isFinite(n)&&n>=0;
function copyCard(card:PartyChatPreviewCardV113):PartyChatPreviewCardV113{
 const allowedActions=Object.freeze([...card.allowedActions]);
 switch(card.kind){
  case 'role_swap':return Object.freeze({...card,allowedActions,members:Object.freeze(card.members.map(m=>Object.freeze({...m})))});
  case 'group_readiness':return Object.freeze({...card,allowedActions,members:Object.freeze(card.members.map(m=>Object.freeze({...m})))});
  case 'contract_vote':case 'event_vote':return Object.freeze({...card,allowedActions,
   options:Object.freeze(card.options.map(o=>Object.freeze({...o})))});
  case 'recruitment_request':case 'shared_achievement':return Object.freeze({...card,allowedActions});
 }
}
export class PartyActiveRequestsPreviewV115{
 private scope:Scope|null=null;
 private active=false;
 private generation=0;
 private sequence=0;
 private ticket:Ticket|null=null;
 private snapshot:PartyActiveSnapshotV115|null=null;
 private lastRevision=0;
 private receivedAt=0;
 private startedAt=0;
 private serverUpperAtReceipt=0;
 private lastClock=0;
 private readonly qaPreview:boolean;
 constructor(qaPreview=false){this.qaPreview=qaPreview;}
 setScope(scope:Scope|null){
  if(scope?.accountId===this.scope?.accountId&&scope?.partyId===this.scope?.partyId)return;
  this.generation++;this.ticket=null;this.snapshot=null;this.lastRevision=0;
  this.scope=scope&&valid(scope.accountId)&&valid(scope.partyId)?Object.freeze({...scope}):null;
 }
 setActive(active:boolean){
  if(active===this.active)return;
  this.active=active;this.invalidate();
 }
 /** Any canonical invalidation or reconnect disables stale controls until
  * a fresh complete snapshot arrives. Old in-flight reads cannot revive it. */
 invalidate(){this.generation++;this.ticket=null;this.snapshot=null;}
 private checkClock(now:number){
  if(!clock(now)||now<this.lastClock){this.invalidate();return false;}
  this.lastClock=now;return true;
 }
 beginRead(monotonicNow:number):Ticket|null{
  if(!this.checkClock(monotonicNow)||!this.qaPreview||!this.active||!this.scope)return null;
  this.snapshot=null;
  this.ticket=Object.freeze({...this.scope,generation:this.generation,sequence:++this.sequence,startedAt:monotonicNow});
  return this.ticket;
 }
 acceptRead(ticket:Ticket,snapshot:PartyActiveSnapshotV115,monotonicNow:number):boolean{
  if(!this.checkClock(monotonicNow)||!this.qaPreview||!this.active||!this.scope||ticket!==this.ticket)return false;
  this.ticket=null;
  if(!snapshot||snapshot.accountId!==this.scope.accountId||snapshot.partyId!==this.scope.partyId||
   !revision(snapshot.snapshotRevision)||snapshot.snapshotRevision<this.lastRevision||
   !revision(snapshot.rosterRevision)||!Number.isSafeInteger(snapshot.serverNowMs)||snapshot.serverNowMs<0||
   monotonicNow-ticket.startedAt>=MAX_FRESH_MS||
   !Array.isArray(snapshot.requests)||snapshot.requests.length>MAX_REQUESTS)return false;
  const rows:readonly PartyActiveRequestV115[]=snapshot.requests;
  const ids=new Set<string>(),messages=new Set<string>();
  for(const row of rows){
   const c=row?.card;
   if(!c||!valid(c.id)||!valid(c.messageId)||c.partyId!==snapshot.partyId||
    !revision(row.sourceRevision)||ids.has(c.id)||messages.has(c.messageId)||
    c.status!=='pending'||c.kind==='shared_achievement'||
    !Array.isArray(c.allowedActions)||typeof c.expiresAtMs!=='number'||!Number.isSafeInteger(c.expiresAtMs))return false;
   ids.add(c.id);messages.add(c.messageId);
  }
  // Upper bound on elapsed server time: charge the entire request duration
  // against the server timestamp, then use monotonic elapsed time only.
  const upper=snapshot.serverNowMs+monotonicNow-ticket.startedAt;
  if(!Number.isSafeInteger(Math.ceil(upper)))return false;
  this.startedAt=ticket.startedAt;this.receivedAt=monotonicNow;this.serverUpperAtReceipt=upper;
  this.lastRevision=snapshot.snapshotRevision;
  this.snapshot=Object.freeze({...snapshot,requests:Object.freeze(rows.map(row=>Object.freeze({
   card:copyCard(row.card),sourceRevision:row.sourceRevision})))});
  return true;
 }
 view(monotonicNow:number){
  const validClock=this.checkClock(monotonicNow);
  const s=this.snapshot;
  const fresh=validClock&&this.qaPreview&&this.active&&!!s&&monotonicNow-this.startedAt<MAX_FRESH_MS;
  const serverNowMs=fresh?this.serverUpperAtReceipt+monotonicNow-this.receivedAt:0;
  const rows=fresh&&s?s.requests.filter(row=>!partyChatPreviewPresentationV113(row.card,serverNowMs,true).collapsed):[];
  const needsResponse=(row:PartyActiveRequestV115)=>{
   const card=row.card;
   const p=partyChatPreviewPresentationV113(card,serverNowMs,true);
   return p.canPreviewRespond&&(!('myVote' in card)||!card.myVote);
  };
  const sorted=[...rows].sort((a,b)=>Number(needsResponse(b))-Number(needsResponse(a))||
   a.card.expiresAtMs!-b.card.expiresAtMs!||a.card.id.localeCompare(b.card.id));
  return Object.freeze({fresh,serverNowMs,requests:Object.freeze(sorted),
   needsResponse:sorted.filter(needsResponse).length,waiting:sorted.filter(row=>!needsResponse(row)).length,
   rosterRevision:fresh&&s?s.rosterRevision:null,releaseEnabled:false as const});
 }
 /** Resolve a fresh scoped preview intent at tap time, not render time.
  * No command key or actual RPC is produced. */
 intent(cardId:string,action:PartyChatPreviewAction,monotonicNow:number,optionId?:string){
  const view=this.view(monotonicNow);
  const row=view.requests.find(r=>r.card.id===cardId);
  if(!view.fresh||!row||view.rosterRevision===null)return null;
  const intent=partyChatPreviewIntentV113(row.card,view.serverNowMs,action,optionId,true);
  return intent?Object.freeze({...intent,rosterRevision:view.rosterRevision,sourceRevision:row.sourceRevision}):null;
 }
}
