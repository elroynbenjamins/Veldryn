/** Private hidden contract-focus/social-readiness adapter. Never routes
 * event ballots to a second poll or accepts recruitment without a real join.
 * Server owns workflow kind, session identity and canonical snapshots.
 */
import {projectPartyChatCardV105,type ReadyCardV105,type VoteCardV105} from './party-chat-action-cards-review-v105';
import {planContractFocusBallotV112,buildContractFocusCardV112} from './party-contract-focus-vote-review-v112';
import {reviewPartyChatActionTransactionV106,type PartyChatStoreV106,type PartyChatRequestV106} from './party-chat-action-transaction-review-v106';
export const PARTY_SOCIAL_ACTION_V123_RELEASED=false;
type Scope=Omit<Parameters<typeof projectPartyChatCardV105>[0],'card'|'viewerAccountId'>;
type FocusInput=Parameters<typeof buildContractFocusCardV112>[0];
type Session={readonly accountId:string;readonly partyId:string};
type Kind='contract_vote'|'group_readiness';
const valid=(s:unknown):s is string=>typeof s==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(s);
function fail(s:string):never{throw Error('party_social_action_v123_'+s);}
function gate(qa:boolean){
 if(!qa||PARTY_SOCIAL_ACTION_V123_RELEASED||process.env.NODE_ENV==='production')fail('unreleased');
}
function sessionScope(session:Session,scope:Scope){
 if(!session||!valid(session.accountId)||!valid(session.partyId)||scope.activePartyId!==session.partyId)
  fail('scope_mismatch');
 return {...scope,viewerAccountId:session.accountId};
}
/** Owner transition for a social check, not a dungeon ready check.
 * Close when all eligible members have answered, even if some are not ready.
 * This never starts any gameplay. */
export function planSocialReadinessResponseV123(input:{
 readonly session:Session;readonly scope:Scope;readonly card:ReadyCardV105;
 readonly action:'ready'|'not_ready';
},qaEnabled=false){
 gate(qaEnabled);
 const {card,action}=input;
 const scope=sessionScope(input.session,input.scope);
 if(card.kind!=='group_readiness'||!['ready','not_ready'].includes(action))fail('invalid_action');
 const view=projectPartyChatCardV105({...scope,card},true);
 if(view.kind!=='group_readiness'||!view.actions.includes(action))fail('response_not_allowed');
 const responses=Object.freeze([...card.responses.map(row=>Object.freeze({...row})),
  Object.freeze({accountId:scope.viewerAccountId,ready:action==='ready'})]);
 const completed=responses.length===card.eligibleAccountIds.length;
 const next:ReadyCardV105=Object.freeze({...card,state:completed?'completed':'pending',responses});
 return Object.freeze({card:next,completed,everyoneReady:completed&&responses.every(row=>row.ready),
  canLaunchCombat:false as const,canPersist:false as const,releaseEnabled:false as const});
}
/** Reuse V112 for every ballot; no separate reward or assignment logic. */
export function planContractFocusResponseV123(input:FocusInput&{
 readonly session:Session;readonly scope:Scope;readonly optionId:string;
},qaEnabled=false){
 gate(qaEnabled);
 const scope=sessionScope(input.session,input.scope);
 const result=planContractFocusBallotV112({...input,scope},true);
 return Object.freeze({...result,offer:Object.freeze({...input.offer,ballots:result.proposedBallots})});
}
export function readPartySocialCardV123(input:{
 readonly session:Session;readonly scope:Scope;readonly card:ReadyCardV105|VoteCardV105;
 readonly names:Readonly<Record<string,string>>;readonly optionLabels:Readonly<Record<string,string>>;
 readonly title:string;readonly summary:string;readonly snapshotRevision:number;
},qaEnabled=false){
 gate(qaEnabled);
 const scope=sessionScope(input.session,input.scope);
 if(!Number.isSafeInteger(input.snapshotRevision)||input.snapshotRevision<1||
  (input.card.kind!=='contract_vote'&&input.card.kind!=='group_readiness'))fail('unsupported_workflow');
 const view=projectPartyChatCardV105({...scope,card:input.card},true);
 const base={id:view.sourceId,partyId:view.partyId,messageId:view.messageId,title:input.title,summary:input.summary};
 const label=(map:Readonly<Record<string,string>>,key:string)=>{
  const value=Object.prototype.hasOwnProperty.call(map,key)?map[key]:undefined;
  if(typeof value!=='string'||!value.trim()||value.length>160)throw Error('party_social_action_v123_missing_label');
  return value;
 };
 const card=view.kind==='contract_vote'?Object.freeze({...base,kind:'contract_vote' as const,
  status:view.status,expiresAtMs:view.expiresAtMs,allowedActions:view.actions,
  options:Object.freeze(view.options.map(o=>Object.freeze({id:o.id,label:label(input.optionLabels,o.labelKey),votes:o.votes}))),
  eligibleCount:view.eligibleCount,myVote:view.myVote}):
  view.kind==='group_readiness'?Object.freeze({...base,kind:'group_readiness' as const,
   status:view.status,expiresAtMs:view.expiresAtMs,allowedActions:view.actions,
   members:Object.freeze(view.members.map(m=>Object.freeze({id:m.accountId,name:label(input.names,m.accountId),ready:m.ready}))) }):null;
 if(!card)throw Error('party_social_action_v123_unsupported_workflow');
 return Object.freeze({card,activeSnapshot:Object.freeze({...input.session,snapshotRevision:input.snapshotRevision,
  rosterRevision:scope.rosterRevision,serverNowMs:scope.serverNowMs,
  requests:Object.freeze(card.status==='pending'?[Object.freeze({card,sourceRevision:scope.currentSourceRevision})]:[])}),
  releaseEnabled:false as const});
}
export async function respondPartySocialCardV123(input:{
 readonly session:Session;readonly kind:Kind;readonly body:unknown;readonly store:PartyChatStoreV106;
},qaEnabled=false){
 gate(qaEnabled);
 const {session,kind,body}=input;
 if(!session||!valid(session.accountId)||!valid(session.partyId)||!body||typeof body!=='object'||Array.isArray(body)||
  (kind!=='contract_vote'&&kind!=='group_readiness'))fail('invalid_request');
 const b=body as Record<string,unknown>;
 const action=b.action,option=b.optionId;
 if(Object.keys(b).some(k=>!['requestId','cardId','partyId','messageId','action','optionId','rosterRevision','sourceRevision'].includes(k))||
  !valid(b.requestId)||!valid(b.cardId)||b.partyId!==session.partyId||!valid(b.messageId)||
  typeof b.rosterRevision!=='number'||typeof b.sourceRevision!=='number'||
  (kind==='contract_vote'?(action!=='vote'||!valid(option)):
   ((action!=='ready'&&action!=='not_ready')||option!==undefined)))
  throw Error('party_social_action_v123_invalid_request');
 const request:PartyChatRequestV106={requestId:b.requestId,partyId:session.partyId,messageId:b.messageId,
  sourceId:b.cardId,rosterRevision:b.rosterRevision,sourceRevision:b.sourceRevision,kind,
  action:action as 'vote'|'ready'|'not_ready',...(typeof option==='string'?{optionId:option}:{})};
 return reviewPartyChatActionTransactionV106({actorAccountId:session.accountId,request,store:input.store},true);
}
