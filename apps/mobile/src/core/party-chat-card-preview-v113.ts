/** Local developer-preview display model ONLY. No online transport, no
 * client authority and no user chat-body parsing. Future live adapter must
 * consume authenticated server projections and enforce its own revision gate.
 */
export const PARTY_CHAT_CARDS_V113_RELEASED=false;
export type PartyChatPreviewAction='accept'|'decline'|'ready'|'not_ready'|'vote';
export type PartyChatPreviewRole='tank'|'damage'|'support';
export type PartyChatPreviewStatus='pending'|'completed'|'declined'|'cancelled'|'expired'|'stale'|'announcement';
interface Base{
 readonly id:string;readonly partyId:string;readonly messageId:string;
 readonly status:PartyChatPreviewStatus;
 readonly title:string;readonly summary:string;
 readonly expiresAtMs?:number;
 readonly allowedActions:readonly PartyChatPreviewAction[];
}
export type PartyChatPreviewCardV113=Base&(
 {readonly kind:'role_swap';readonly members:readonly {id:string;name:string;fromRole:PartyChatPreviewRole;toRole:PartyChatPreviewRole;accepted:boolean}[]}|
 {readonly kind:'contract_vote'|'event_vote';readonly options:readonly {id:string;label:string;votes:number}[];readonly eligibleCount:number;readonly myVote?:string|null}|
 {readonly kind:'group_readiness';readonly members:readonly {id:string;name:string;ready:boolean|null}[]}|
 {readonly kind:'recruitment_request';readonly applicantName?:string}|
 {readonly kind:'shared_achievement'}
);
export interface PartyChatPreviewIntentV113{
 readonly cardId:string;readonly partyId:string;readonly messageId:string;
 readonly action:PartyChatPreviewAction;readonly optionId?:string;
}
export function partyChatPreviewPresentationV113(card:PartyChatPreviewCardV113,nowMs:number,qaPreview=false){
 const pending=card.status==='pending'&&typeof card.expiresAtMs==='number'&&Number.isFinite(card.expiresAtMs)&&Number.isFinite(nowMs)&&nowMs<card.expiresAtMs;
 const allowed:readonly PartyChatPreviewAction[]=card.kind==='role_swap'||card.kind==='recruitment_request'?['accept','decline']:
  card.kind==='group_readiness'?['ready','not_ready']:card.kind==='contract_vote'||card.kind==='event_vote'?['vote']:[];
 const actions=pending?[...new Set(card.allowedActions.filter(action=>allowed.includes(action)))]:[];
 return {collapsed:!pending||card.kind==='shared_achievement',
  status:card.status==='pending'&&!pending?'expired' as const:card.status,
  remainingSeconds:pending?Math.max(0,Math.ceil((card.expiresAtMs!-nowMs)/1000)):0,
  actions,canPreviewRespond:qaPreview&&pending&&actions.length>0,releaseEnabled:false as const};
}
export function partyChatPreviewIntentV113(card:PartyChatPreviewCardV113,nowMs:number,action:PartyChatPreviewAction,optionId?:string,qaPreview=false):PartyChatPreviewIntentV113|null{
 const view=partyChatPreviewPresentationV113(card,nowMs,qaPreview);
 if(!view.canPreviewRespond||!view.actions.includes(action))return null;
 if(action==='vote'){
  if(card.kind!=='contract_vote'&&card.kind!=='event_vote')return null;
  if(card.myVote||!card.options.some(option=>option.id===optionId))return null;
 }else if(optionId!==undefined)return null;
 return Object.freeze({cardId:card.id,partyId:card.partyId,messageId:card.messageId,action,...(optionId===undefined?{}:{optionId})});
}
export function partyChatPreviewVotePercentV113(votes:number,eligibleCount:number){
 if(!Number.isSafeInteger(votes)||!Number.isSafeInteger(eligibleCount)||votes<0||eligibleCount<1)return 0;
 return Math.min(100,Math.round(votes/eligibleCount*100));
}
