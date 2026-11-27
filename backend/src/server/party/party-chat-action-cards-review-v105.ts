/** Hidden, non-authorizing view of private Party workflow records.
 * Server must load canonical message linkage, membership, leader, source
 * revision, eligibility and response rows. Chat text is never a command.
 * This module does not run a poll, launch combat, enroll, grant or spend.
 */
export const PARTY_CHAT_ACTION_CARDS_V105_RELEASED=false;
type PendingState='pending'|'completed'|'cancelled'|'expired';
interface CardBase{
 readonly partyId:string;readonly messageId:string;readonly sourceId:string;
 readonly createdAtMs:number;
}
interface OpenCard extends CardBase{
 readonly rosterRevision:number;readonly sourceRevision:number;
 readonly expiresAtMs:number;readonly state:PendingState;
 readonly eligibleAccountIds:readonly string[];
}
export interface VoteCardV105 extends OpenCard{
 readonly kind:'contract_vote'|'event_vote';
 readonly options:readonly {id:string;labelKey:string}[];
 readonly ballots:readonly {accountId:string;optionId:string}[];
 readonly selectedOptionId?:string;
}
export interface ReadyCardV105 extends OpenCard{
 readonly kind:'group_readiness';
 readonly responses:readonly {accountId:string;ready:boolean}[];
}
export interface RecruitmentCardV105 extends OpenCard{
 readonly kind:'recruitment_request';readonly applicantAccountId:string;
 readonly outcome?:'accepted'|'declined';
}
export interface AchievementCardV105 extends CardBase{
 readonly kind:'shared_achievement';
 readonly achievementKind:'contract_completed'|'event_milestone'|'contract_expiry';
 readonly milestoneId:string;
 readonly verifiedReceiptId:string;
}
export type PartyChatCardV105=VoteCardV105|ReadyCardV105|RecruitmentCardV105|AchievementCardV105;
const validId=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(x);
const positiveRevision=(x:number)=>Number.isSafeInteger(x)&&x>=1;
function fail(reason:string):never{throw Error('party_chat_card_v105_'+reason);}
function checkIds(rows:readonly string[],min:number,max:number){
 if(!Array.isArray(rows)||rows.length<min||rows.length>max||
  !rows.every(validId)||new Set(rows).size!==rows.length)fail('invalid_account_set');
}
export function projectPartyChatCardV105(input:{
 readonly card:PartyChatCardV105;
 readonly message:{id:string;partyId:string;accountId:string|null;isSystem:boolean};
 readonly viewerAccountId:string;readonly activePartyId:string;
 readonly activeAccountIds:readonly string[];readonly leaderAccountId:string;
 readonly rosterRevision:number;readonly currentSourceRevision:number;
 readonly serverNowMs:number;
},qaEnabled=false){
 if(!qaEnabled||PARTY_CHAT_ACTION_CARDS_V105_RELEASED||process.env.NODE_ENV==='production')fail('unreleased');
 const {card:c,message:m,viewerAccountId:viewer,activeAccountIds:active,serverNowMs:now}=input;
 if(!c||!m||!validId(c.partyId)||!validId(c.sourceId)||!validId(c.messageId)||
  m.id!==c.messageId||m.partyId!==c.partyId||m.accountId!==null||m.isSystem!==true||
  input.activePartyId!==c.partyId||!validId(viewer))fail('chat_scope_mismatch');
 checkIds(active,1,4);
 if(!active.includes(viewer)||!active.includes(input.leaderAccountId))fail('chat_scope_mismatch');
 if(!Number.isSafeInteger(c.createdAtMs)||c.createdAtMs<0||
  !Number.isSafeInteger(now)||now<c.createdAtMs)fail('invalid_time');
 const base={partyId:c.partyId,messageId:c.messageId,sourceId:c.sourceId,
  releaseEnabled:false as const,canExecute:false as const,canPersist:false as const,
  canGrantRewards:false as const,canLaunchCombat:false as const};
 if(c.kind==='shared_achievement'){
  if(!['contract_completed','event_milestone','contract_expiry'].includes(c.achievementKind)||
   !validId(c.milestoneId)||!validId(c.verifiedReceiptId))fail('invalid_achievement');
  return Object.freeze({...base,kind:c.kind,status:'announcement' as const,
   achievementKind:c.achievementKind,milestoneId:c.milestoneId,
   deduplicationKey:[c.partyId,c.achievementKind,c.sourceId,c.milestoneId].map(x=>x.length+':'+x).join('|'),
   actions:Object.freeze([] as string[])});
 }
 if(!['contract_vote','event_vote','group_readiness','recruitment_request'].includes(c.kind)||
  !positiveRevision(c.rosterRevision)||!positiveRevision(c.sourceRevision)||
  !positiveRevision(input.rosterRevision)||!positiveRevision(input.currentSourceRevision)||
  input.rosterRevision<c.rosterRevision||input.currentSourceRevision<c.sourceRevision||
  !Number.isSafeInteger(c.expiresAtMs)||c.expiresAtMs<=c.createdAtMs||
  !['pending','completed','cancelled','expired'].includes(c.state))fail('invalid_workflow');
 checkIds(c.eligibleAccountIds,1,4);
 const eligible=new Set(c.eligibleAccountIds);
 const stale=input.rosterRevision!==c.rosterRevision||input.currentSourceRevision!==c.sourceRevision||
  c.eligibleAccountIds.some(id=>!active.includes(id));
 const status=c.state==='pending'?(now>=c.expiresAtMs?'expired':stale?'stale':'pending'):c.state;
 const actionable=status==='pending'&&eligible.has(viewer);
 const common={...base,status,expiresAtMs:c.expiresAtMs,rosterRevision:c.rosterRevision,sourceRevision:c.sourceRevision};
 if(c.kind==='contract_vote'||c.kind==='event_vote'){
  if(!Array.isArray(c.options)||c.options.length<2||c.options.length>5||
   c.options.some(o=>!o||!validId(o.id)||!validId(o.labelKey))||
   new Set(c.options.map(o=>o.id)).size!==c.options.length||!Array.isArray(c.ballots))fail('invalid_vote');
  const options:VoteCardV105['options']=c.options;
  const ballots:VoteCardV105['ballots']=c.ballots;
  const counts=new Map(options.map(o=>[o.id,0])),votes=new Map<string,string>();
  for(const ballot of ballots){
   if(!ballot||!eligible.has(ballot.accountId)||votes.has(ballot.accountId)||!counts.has(ballot.optionId))fail('invalid_ballot');
   votes.set(ballot.accountId,ballot.optionId);
   counts.set(ballot.optionId,counts.get(ballot.optionId)!+1);
  }
  if(c.state==='completed'? !c.selectedOptionId||!counts.has(c.selectedOptionId):c.selectedOptionId!==undefined)fail('invalid_vote_result');
  return Object.freeze({...common,kind:c.kind,options:Object.freeze(options.map(o=>Object.freeze({...o,votes:counts.get(o.id)!}))),
   myVote:votes.get(viewer)??null,respondedCount:votes.size,eligibleCount:eligible.size,
   selectedOptionId:c.selectedOptionId??null,
   actions:Object.freeze(actionable&&!votes.has(viewer)?['vote']:[])});
 }
 if(c.kind==='group_readiness'){
  if(!Array.isArray(c.responses))fail('invalid_readiness');
  const responses:ReadyCardV105['responses']=c.responses;
  const replies=new Map<string,boolean>();
  for(const row of responses){
   if(!row||!eligible.has(row.accountId)||replies.has(row.accountId)||typeof row.ready!=='boolean')fail('invalid_readiness');
   replies.set(row.accountId,row.ready);
  }
  return Object.freeze({...common,kind:c.kind,
   members:Object.freeze(c.eligibleAccountIds.map(id=>Object.freeze({accountId:id,ready:replies.get(id)??null}))),
   readyCount:[...replies.values()].filter(Boolean).length,eligibleCount:eligible.size,
   actions:Object.freeze(actionable&&!replies.has(viewer)?['ready','not_ready']:[])});
 }
 if(c.kind==='recruitment_request'){
  if(!validId(c.applicantAccountId)||eligible.size!==1||
   (c.state==='pending'&&!stale&&!eligible.has(input.leaderAccountId))||
   (c.state==='completed'? !['accepted','declined'].includes(c.outcome??''):c.outcome!==undefined))
   fail('invalid_recruitment');
  // Do not leak applicant identity to uninvolved members in the shared feed.
  const leader=viewer===input.leaderAccountId;
  return Object.freeze({...common,kind:c.kind,applicantAccountId:leader?c.applicantAccountId:null,
   outcome:c.outcome??null,actions:Object.freeze(actionable&&leader?['accept','decline']:[])});
 }
 return fail('unsupported_kind');
}
