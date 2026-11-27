/** Hidden role-swap notification planning from committed private records.
 * No push, device tokens, public grants, network or live outbox writer.
 * Host must load receipt, effect and after-state in one trusted read;
 * enqueue on the same mutation transaction for actual delivery later.
 */
import {enemyV2SnapshotDigest as digest} from '../combat/v2/enemy-engine-authority';
import {projectPartySwapChatV104} from './party-role-swap-chat-review-v104';
import type {PartyChatReceiptV106,PartyChatEffectV106,PartyChatWorkflowV106} from './party-chat-action-transaction-review-v106';
export const PARTY_SWAP_NOTIFICATION_V120_RELEASED=false;
type Workflow=Extract<PartyChatWorkflowV106,{kind:'role_swap'}>;
const valid=(s:unknown):s is string=>typeof s==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(s);
function fail(s:string):never{throw Error('party_swap_notification_v120_'+s);}
export function planRoleSwapRefreshNoticesV120(input:{
 readonly workflow:Workflow;readonly receipt:PartyChatReceiptV106;readonly persistedEffect:PartyChatEffectV106;
},qaEnabled=false){
 if(!qaEnabled||PARTY_SWAP_NOTIFICATION_V120_RELEASED||process.env.NODE_ENV==='production')fail('unreleased');
 const {workflow:w,receipt:r,persistedEffect:e}=input;
 if(!w||!r||!e||r.qaOnly!==true||r.canGrantRewards!==false||
  !valid(e.effectId)||!valid(r.actorAccountId)||r.partyId!==w.activePartyId||
  e.sourceId!==w.proposal.proposalId||r.actorAccountId!==e.actorAccountId||
  r.requestDigest!==e.requestDigest||digest(r.effect)!==digest(e))
  fail('receipt_scope_mismatch');
 const view=projectPartySwapChatV104({...w,viewerAccountId:r.actorAccountId},true);
 const actor=view.members.find(m=>m.accountId===r.actorAccountId);
 if(!actor)throw Error('party_swap_notification_v120_actor_not_participant');
 const terminal=e.status==='workflow_completed'||e.status==='workflow_declined';
 const rosterChanged=e.status==='workflow_completed';
 if((e.status==='workflow_completed'&&(view.status!=='completed'||!actor.accepted||
     w.proposal.committedRevision!==w.rosterRevision))||
  (e.status==='workflow_declined'&&(view.status!=='declined'||actor.accepted))||
  (e.status==='response_recorded'&&(view.status!=='pending'||!actor.accepted))||
  !['workflow_completed','workflow_declined','response_recorded'].includes(e.status))
  fail('effect_state_mismatch');
 // Generic scoped invalidation only: no player names, character IDs, chat
 // body, full proposal, rewards or device information in notifications.
 const notices=w.activeAccountIds.map(accountId=>{
  const memberView=projectPartySwapChatV104({...w,viewerAccountId:accountId},true);
  return Object.freeze({accountId,partyId:w.activePartyId,
   eventId:digest({kind:'role_swap',partyId:w.activePartyId,effectId:e.effectId,accountId}),
   kind:'role_swap' as const,terminal,rosterChanged,
   needsResponse:memberView.showAccept,delivery:'in_app_refresh_only' as const,
   releaseEnabled:false as const,canDeliver:false as const});
 });
 return Object.freeze(notices);
}
