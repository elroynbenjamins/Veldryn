/**
 * Hidden Party Events v25: trusted, non-paying claim reservation.
 *
 * Never treat a prepared claim intent as an entitlement, Inbox delivery,
 * or the exactly-once economy transfer. In v25, the real claim route must
 * fail closed. Quotes are based on SQL's immutable v24 offer/selection
 * and the pinned TS v2 deterministic economy policy.
 */
import {
  PARTY_EVENT_REWARD_MODEL_VERSION,
  type PartyEventRewardBundle,
} from './weekly-party-rewards-v2';

export const PARTY_EVENT_CLAIM_INTENTS_V25_RELEASED=false;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
type ClaimQuoteV25=PartyEventRewardBundle;

export interface PrivateClaimIntentReceiptV25 {
  readonly intentId:string;
  readonly offerId:string;
  readonly replayed:boolean;
  readonly quoteHash?:string;
  readonly claimReady:false;
  readonly claimable:false;
  readonly claimed:false;
  readonly rewardsGranted:false;
}
export interface PrivateClaimIntentInboxV25 {
  readonly items:readonly {
    intentId:string;
    offerId:string;
    reservationId:string;
    rewardKind:'participation'|'warrior'|'artisan'|'companion';
    quoteHash:string;
    state:'blocked_unreleased';
    claimable:false;
    claimed:false;
    rewardsGranted:false;
  }[];
  readonly claimEnabled:false;
  readonly rewardsGranted:false;
  readonly economyTransfers:0;
}
export interface TrustedPrivateClaimIntentsRepositoryV25 {
  /** Server-only identity for account must come from authenticated session. */
  quoteOffer(offerId:string,trustedAccountId:string):Promise<ClaimQuoteV25>;
  reserveIntent(offerId:string,trustedAccountId:string,requestId:string):
    Promise<PrivateClaimIntentReceiptV25>;
  readInbox(trustedAccountId:string):Promise<PrivateClaimIntentInboxV25>;
}
function must(ok:unknown,reason:string):asserts ok {
  if(!ok)throw Error('party_event_v25_'+reason);
}
function validateId(s:string,which:string):void {must(UUID.test(s),'invalid_'+which);}

export async function quotePrivatePartyClaimV25(input:{
  gateEnabled:boolean;offerId:string;trustedAccountId:string;
  repository:TrustedPrivateClaimIntentsRepositoryV25;
}):Promise<ClaimQuoteV25> {
  must(input.gateEnabled,'release_gate_disabled');
  validateId(input.offerId,'offer');
  validateId(input.trustedAccountId,'account');
  const q=await input.repository.quoteOffer(input.offerId,input.trustedAccountId);
  must(q?.version===PARTY_EVENT_REWARD_MODEL_VERSION
    &&['participation','warrior','artisan','companion'].includes(q.kind)
    &&Number.isInteger(q.personalPoints)&&q.personalPoints>=5
    &&q.personalPoints<=60
    &&Number.isInteger(q.performanceBand)&&q.performanceBand>=1
    &&q.performanceBand<=6
    &&q.materials!==null&&typeof q.materials==='object'
    &&!Array.isArray(q.materials),'invalid_quote_identity');
  for(const value of [q.gold,q.combatXp,q.skillXp,q.companionEssence,
    q.bondstones,q.partyRenown,...Object.values(q.materials)]){
    must(Number.isSafeInteger(value)&&value>=0&&value<=1_000_000,
      'invalid_quote_amount');
  }
  must(Object.keys(q.materials).every(key=>key==='GEM_DUST')
    &&Object.values(q.materials).every(value=>value<=999),
    'unapproved_material');
  must((q.kind==='participation'&&q.personalPoints<15)
    ||(q.kind!=='participation'&&q.personalPoints>=15),
    'inconsistent_reward_eligibility');
  return q;
}

/**
 * An account can have only one intent per event/offer. The SQL writer
 * also serializes under public gameplay's 'party-account:' advisory lock
 * and validates character wallet + inventory capacity with row locks.
 *
 * Returns intentionally unclaimable. No route or worker invokes it.
 */
export async function preparePrivatePartyClaimIntentV25(input:{
  gateEnabled:boolean;offerId:string;trustedAccountId:string;
  repository:TrustedPrivateClaimIntentsRepositoryV25;
}):Promise<PrivateClaimIntentReceiptV25> {
  must(input.gateEnabled,'release_gate_disabled');
  validateId(input.offerId,'offer');
  validateId(input.trustedAccountId,'account');
  const receipt=await input.repository.reserveIntent(
    input.offerId,input.trustedAccountId,
    'party-event-v25-intent:'+input.offerId.toLowerCase());
  must(UUID.test(receipt?.intentId)&&receipt.offerId===input.offerId
    &&typeof receipt.replayed==='boolean'
    &&(receipt.quoteHash===undefined||HASH.test(receipt.quoteHash))
    &&receipt.claimReady===false&&receipt.claimable===false
    &&receipt.claimed===false&&receipt.rewardsGranted===false,
    'claim_intent_receipt_not_blocked');
  return receipt;
}
export async function readPrivatePartyClaimInboxV25(input:{
  gateEnabled:boolean;trustedAccountId:string;
  repository:TrustedPrivateClaimIntentsRepositoryV25;
}):Promise<PrivateClaimIntentInboxV25>{
  must(input.gateEnabled,'release_gate_disabled');
  validateId(input.trustedAccountId,'account');
  const inbox=await input.repository.readInbox(input.trustedAccountId);
  must(Array.isArray(inbox?.items)&&inbox.claimEnabled===false
    &&inbox.rewardsGranted===false&&inbox.economyTransfers===0,
    'inbox_claim_flags_enabled');
  const seen=new Set<string>();
  for(const item of inbox.items) {
    must(UUID.test(item.intentId)&&UUID.test(item.offerId)
      &&UUID.test(item.reservationId)&&HASH.test(item.quoteHash)
      &&item.state==='blocked_unreleased'
      &&item.claimable===false&&item.claimed===false
      &&item.rewardsGranted===false
      &&!seen.has(item.offerId),'invalid_claim_intent_item');
    seen.add(item.offerId);
  }
  return inbox;
}
/**
 * Explicitly NOT implemented. Even a privileged caller cannot use this
 * TypeScript function to grant loot until the whole economy/Inbox commit
 * is reviewed and the feature is enabled in a later version.
 */
export async function claimPrivatePartyRewardV25(_input:{
  offerId:string;trustedAccountId:string;
}):Promise<never>{
  throw Error('party_event_v25_payout_not_released');
}
