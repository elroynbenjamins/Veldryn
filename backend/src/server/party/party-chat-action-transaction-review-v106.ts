/** HIDDEN disposable transaction rehearsal. No production store or RPC.
 * A future private adapter must serialize party membership, workflow rows,
 * request receipts and the owner workflow mutation on ONE transaction.
 * A UI projection or a synthetic port does not authorize real actions.
 */
import {enemyV2SnapshotDigest as digest} from '../combat/v2/enemy-engine-authority';
import {projectPartyChatCardV105,type PartyChatCardV105} from './party-chat-action-cards-review-v105';
import {projectPartySwapChatV104,type PartySwapChatProposalV104} from './party-role-swap-chat-review-v104';
export const PARTY_CHAT_ACTION_TRANSACTION_V106_RELEASED=false;
type Action='vote'|'ready'|'not_ready'|'accept'|'decline';
type Kind='role_swap'|'contract_vote'|'event_vote'|'group_readiness'|'recruitment_request';
export interface PartyChatRequestV106{
 readonly requestId:string;readonly partyId:string;readonly messageId:string;
 readonly sourceId:string;readonly rosterRevision:number;readonly sourceRevision:number;
 readonly kind:Kind;readonly action:Action;readonly optionId?:string;
}
interface Scope{
 readonly message:{id:string;partyId:string;accountId:string|null;isSystem:boolean};
 readonly activePartyId:string;readonly activeAccountIds:readonly string[];
 readonly leaderAccountId:string;readonly rosterRevision:number;
 readonly currentSourceRevision:number;readonly serverNowMs:number;
}
export type PartyChatWorkflowV106=Scope&(
 {readonly kind:'role_swap';readonly proposal:PartySwapChatProposalV104}|
 {readonly kind:Exclude<Kind,'role_swap'>;readonly card:Exclude<PartyChatCardV105,{kind:'shared_achievement'}>}
);
export interface PartyChatDispatchV106{
 readonly actorAccountId:string;readonly request:Readonly<PartyChatRequestV106>;
 readonly workflowDigest:string;
}
export interface PartyChatEffectV106{
 readonly sourceId:string;readonly actorAccountId:string;
 readonly requestDigest:string;
 readonly status:'response_recorded'|'workflow_completed'|'workflow_declined';
 readonly effectId:string;
}
export interface PartyChatReceiptV106{
 readonly key:string;readonly requestDigest:string;
 readonly partyId:string;readonly actorAccountId:string;
 readonly effect:PartyChatEffectV106;
 readonly qaOnly:true;readonly canGrantRewards:false;
}
export interface PartyChatTransactionV106{
 readonly readReceipt:(key:string)=>Promise<PartyChatReceiptV106|null>;
 readonly loadWorkflow:(partyId:string,sourceId:string,kind:Kind)=>Promise<PartyChatWorkflowV106|null>;
 /** Delegate to owning workflow, never independently resolve a vote or grant a reward.
  * Same transaction, fake-only today. Must recheck canonical source/time and
  * return an immutable effect receipt AFTER its own successful write. */
 readonly dispatch:(input:PartyChatDispatchV106)=>Promise<PartyChatEffectV106>;
 readonly readEffect:(effectId:string)=>Promise<PartyChatEffectV106|null>;
 readonly insertReceipt:(receipt:PartyChatReceiptV106)=>Promise<void>;
}
export interface PartyChatStoreV106{
 /** Serialize the request key globally and party scope, including all workflow
  * mutations; rollback every write when callback throws. */
 readonly transact:<T>(scope:{partyId:string;requestKey:string},fn:(tx:PartyChatTransactionV106)=>Promise<T>)=>Promise<T>;
}
const id=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(x);
const revision=(x:number)=>Number.isSafeInteger(x)&&x>=1;
function fail(reason:string):never{throw Error('party_chat_tx_v106_'+reason);}
const kinds:readonly Kind[]=['role_swap','contract_vote','event_vote','group_readiness','recruitment_request'];
function checkEffect(effect:PartyChatEffectV106,request:PartyChatRequestV106,actor:string,requestDigest:string){
 if(!effect||effect.sourceId!==request.sourceId||effect.actorAccountId!==actor||
  effect.requestDigest!==requestDigest||!id(effect.effectId)||
  !['response_recorded','workflow_completed','workflow_declined'].includes(effect.status))
  fail('invalid_effect');
}
export async function reviewPartyChatActionTransactionV106(input:{
 /** Server-private authenticated principal, not a request payload field. */
 readonly actorAccountId:string;readonly request:PartyChatRequestV106;readonly store:PartyChatStoreV106;
},qaEnabled=false){
 if(!qaEnabled||PARTY_CHAT_ACTION_TRANSACTION_V106_RELEASED||process.env.NODE_ENV==='production')fail('unreleased');
 const actor=input.actorAccountId,raw=input.request,store=input.store;
 if(!id(actor)||!raw||!id(raw.requestId)||!id(raw.partyId)||!id(raw.messageId)||!id(raw.sourceId)||
  !revision(raw.rosterRevision)||!revision(raw.sourceRevision)||!kinds.includes(raw.kind)||
  !['vote','ready','not_ready','accept','decline'].includes(raw.action)||
  (raw.action==='vote'?!id(raw.optionId):raw.optionId!==undefined)||
  Object.keys(raw).some(k=>!['requestId','partyId','messageId','sourceId','rosterRevision','sourceRevision','kind','action','optionId'].includes(k))||
  !store||typeof store.transact!=='function')fail('invalid_request');
 const request=Object.freeze({...raw});
 const requestDigest=digest({actor,request});
 const key=digest({actor,requestId:request.requestId});
 return store.transact({partyId:request.partyId,requestKey:key},async tx=>{
  if(process.env.NODE_ENV==='production')fail('unreleased');
  const prior=await tx.readReceipt(key);
  if(prior!==null){
   if(prior.key!==key||prior.partyId!==request.partyId||prior.actorAccountId!==actor||
    prior.requestDigest!==requestDigest||prior.qaOnly!==true||prior.canGrantRewards!==false)
    fail('conflicting_replay');
   checkEffect(prior.effect,request,actor,requestDigest);
   const historical=await tx.readEffect(prior.effect.effectId);
   if(historical===null||digest(historical)!==digest(prior.effect))fail('missing_replay_evidence');
   return {receipt:prior,newlyRecorded:false};
  }
  const loaded=await tx.loadWorkflow(request.partyId,request.sourceId,request.kind);
  if(loaded===null)throw Error('party_chat_tx_v106_workflow_missing');
  const workflow=structuredClone(loaded);
  if(workflow.kind!==request.kind||workflow.activePartyId!==request.partyId||
   workflow.message.id!==request.messageId||workflow.rosterRevision!==request.rosterRevision||
   workflow.currentSourceRevision!==request.sourceRevision)fail('stale_scope');
  if(workflow.kind==='role_swap'){
   if(workflow.proposal.proposalId!==request.sourceId)fail('source_mismatch');
   const view=projectPartySwapChatV104({...workflow,viewerAccountId:actor},true);
   if(!((request.action==='accept'&&view.showAccept)||(request.action==='decline'&&view.showDecline)))fail('action_not_allowed');
  }else{
   if(workflow.card.kind!==request.kind||workflow.card.sourceId!==request.sourceId)fail('source_mismatch');
   const view=projectPartyChatCardV105({...workflow,viewerAccountId:actor},true);
   if(!view.actions.includes(request.action))fail('action_not_allowed');
   if(request.action==='vote'){
    if(view.kind!=='contract_vote'&&view.kind!=='event_vote')throw Error('party_chat_tx_v106_invalid_option');
    if(!view.options.some(o=>o.id===request.optionId))fail('invalid_option');
   }
  }
  const effect=await tx.dispatch({actorAccountId:actor,request,workflowDigest:digest(workflow)});
  checkEffect(effect,request,actor,requestDigest);
  const persisted=await tx.readEffect(effect.effectId);
  if(persisted===null||digest(persisted)!==digest(effect))fail('missing_effect_readback');
  const receipt:PartyChatReceiptV106={key,requestDigest,partyId:request.partyId,
   actorAccountId:actor,effect:structuredClone(effect),qaOnly:true,canGrantRewards:false};
  await tx.insertReceipt(receipt);
  const readback=await tx.readReceipt(key);
  if(readback===null)throw Error('party_chat_tx_v106_missing_receipt_readback');
  if(digest(readback)!==digest(receipt))fail('incorrect_receipt_readback');
  return {receipt:readback,newlyRecorded:true};
 });
}
