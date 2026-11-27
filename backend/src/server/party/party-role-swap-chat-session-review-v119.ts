/** Hidden role-swap connection between the typed chat projection and V106.
 * The caller is a server-private verified session; never a public endpoint.
 * Only the real transaction port may commit a role change. This adapter does
 * not authorize production, notification delivery or any reward.
 */
import {projectPartySwapChatV104} from './party-role-swap-chat-review-v104';
import {reviewPartyChatActionTransactionV106,type PartyChatStoreV106,type PartyChatRequestV106,
 type PartyChatWorkflowV106} from './party-chat-action-transaction-review-v106';
export const PARTY_SWAP_CHAT_SESSION_V119_RELEASED=false;
type SwapWorkflow=Extract<PartyChatWorkflowV106,{kind:'role_swap'}>;
interface Session{readonly accountId:string;readonly partyId:string}
const valid=(s:unknown):s is string=>typeof s==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(s);
function fail(s:string):never{throw Error('party_swap_session_v119_'+s);}
function gate(qaEnabled:boolean){
 if(!qaEnabled||PARTY_SWAP_CHAT_SESSION_V119_RELEASED||process.env.NODE_ENV==='production')fail('unreleased');
}
export function readPartyRoleSwapCardV119(input:{
 readonly session:Session;readonly workflow:SwapWorkflow;
 readonly snapshotRevision:number;
 /** Names from authenticated party social-name projection, never chat text. */
 readonly names:Readonly<Record<string,string>>;
 readonly title:string;readonly summary:string;
},qaEnabled=false){
 gate(qaEnabled);
 const {session,workflow}=input;
 if(!session||!valid(session.accountId)||!valid(session.partyId)||
  workflow.activePartyId!==session.partyId||workflow.proposal.partyId!==session.partyId||
  !Number.isSafeInteger(input.snapshotRevision)||input.snapshotRevision<1||
  !Number.isSafeInteger(workflow.currentSourceRevision)||workflow.currentSourceRevision<1)
  fail('scope_mismatch');
 const view=projectPartySwapChatV104({...workflow,viewerAccountId:session.accountId},true);
 const actions:('accept'|'decline')[]=[];
 if(view.showAccept)actions.push('accept');
 if(view.showDecline)actions.push('decline');
 const card=Object.freeze({
  kind:'role_swap' as const,id:view.proposalId,partyId:view.partyId,messageId:view.messageId,
  title:input.title,summary:input.summary,status:view.status,expiresAtMs:view.expiresAtMs,
  allowedActions:Object.freeze(actions),
  members:Object.freeze(view.members.map(m=>{
   const name=Object.prototype.hasOwnProperty.call(input.names,m.accountId)?input.names[m.accountId]:undefined;
   if(typeof name!=='string'||!name.trim()||name.length>100)throw Error('party_swap_session_v119_missing_social_name');
   return Object.freeze({id:m.accountId,name,fromRole:m.fromRole,toRole:m.toRole,accepted:m.accepted});
  })),
 });
 return Object.freeze({card,activeSnapshot:Object.freeze({
  accountId:session.accountId,partyId:session.partyId,snapshotRevision:input.snapshotRevision,
  rosterRevision:workflow.rosterRevision,serverNowMs:workflow.serverNowMs,
  requests:Object.freeze(view.status==='pending'?[Object.freeze({card,sourceRevision:workflow.currentSourceRevision})]:[]),
 }),releaseEnabled:false as const});
}
export async function respondPartyRoleSwapCardV119(input:{
 readonly session:Session;readonly body:unknown;readonly store:PartyChatStoreV106;
},qaEnabled=false){
 gate(qaEnabled);
 const {session,body}=input;
 if(!session||!valid(session.accountId)||!valid(session.partyId)||!body||typeof body!=='object'||Array.isArray(body))
  fail('invalid_request');
 const b=body as Record<string,unknown>;
 if(Object.keys(b).some(k=>!['requestId','cardId','partyId','messageId','action','rosterRevision','sourceRevision'].includes(k))||
  !valid(b.requestId)||!valid(b.cardId)||b.partyId!==session.partyId||!valid(b.messageId)||
  (b.action!=='accept'&&b.action!=='decline')||
  typeof b.rosterRevision!=='number'||typeof b.sourceRevision!=='number')
  throw Error('party_swap_session_v119_invalid_request');
 const request:PartyChatRequestV106={requestId:b.requestId,partyId:session.partyId,messageId:b.messageId,
  sourceId:b.cardId,rosterRevision:b.rosterRevision,sourceRevision:b.sourceRevision,kind:'role_swap',action:b.action};
 // Server-derived actor always wins; reject actor/account/kind from body.
 return reviewPartyChatActionTransactionV106({actorAccountId:session.accountId,request,store:input.store},true);
}
