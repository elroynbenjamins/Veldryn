/**
 * Hidden Party Events v24: private, nonpaying reward-offer orchestration.
 *
 * Never accept Event Points, performance bands, offer amounts or player IDs
 * from a mobile request. The SQL writer resolves those from v14/v15 verified
 * EP, v19 immutable previews and v23 worker replay attestation.
 *
 * This does NOT construct a spendable entitlement or deliver an Inbox item.
 */
import {
  PARTY_EVENT_CACHE_CHOICES,partyEventRewardEligibility,
  type PartyEventCacheChoice,
} from './weekly-party-rewards-v2';

export const PARTY_EVENT_REWARD_OFFERS_V24_RELEASED=false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PartyEventOfferPreviewStatusV24=
  'participation_preview'|'awaiting_choice_preview'|'choice_locked_preview';
export interface PrivatePartyRewardOfferV24 {
  offerId:string;
  eventStartsAt:string;
  reservationId:string;
  eligibility:'full'|'participation';
  personalPoints:number;
  rewardBand:number;
  selectedChoice:PartyEventCacheChoice|null;
  choiceLocked:boolean;
  status:PartyEventOfferPreviewStatusV24;
  claimable:false;
  granted:false;
  entitlement:false;
}
export interface PrivatePartyRewardInboxV24 {
  offers:PrivatePartyRewardOfferV24[];
  claimEnabled:false;
  entitlementsCreated:false;
  rewardsGranted:false;
}
export interface PrivatePartyPreparedOffersV24 {
  replayed:boolean;
  reservationId:string;
  memberCount:number;
  offerCount:number;
  offersPrepared:true;
  entitlementsCreated:false;
  rewardsClaimable:false;
  rewardsGranted:false;
}
export interface PrivatePartyLockedChoiceV24 {
  replayed:boolean;
  offerId:string;
  choice:PartyEventCacheChoice;
  choiceLocked:true;
  rewardsClaimable:false;
  rewardsGranted:false;
}
export interface TrustedPartyRewardOfferRepositoryV24 {
  /** Only callable through an internal service-role database connection. */
  prepareOffers(reservationId:string,requestId:string):
    Promise<PrivatePartyPreparedOffersV24>;
  lockChoice(offerId:string,trustedAccountId:string,
    choice:PartyEventCacheChoice,requestId:string):
    Promise<PrivatePartyLockedChoiceV24>;
  /** Account ID MUST be obtained from authenticated server session. */
  readInboxPreview(trustedAccountId:string):Promise<PrivatePartyRewardInboxV24>;
}

function must(ok:unknown,code:string):asserts ok {
  if(!ok)throw new Error('party_event_v24_'+code);
}
function requireGate(enabled:boolean):void {
  must(enabled,'release_gate_disabled');
}
/** The request id is fixed by the server, never a user-supplied dedupe key. */
export async function preparePrivatePartyRewardOffersV24(input:{
  gateEnabled:boolean;
  reservationId:string;
  repository:TrustedPartyRewardOfferRepositoryV24;
}):Promise<PrivatePartyPreparedOffersV24>{
  requireGate(input.gateEnabled);
  must(UUID.test(input.reservationId),'invalid_reservation');
  const result=await input.repository.prepareOffers(
    input.reservationId,'party-event-v24-offers:'+input.reservationId.toLowerCase());
  must(result.reservationId===input.reservationId
    &&result.offersPrepared===true
    &&result.entitlementsCreated===false
    &&result.rewardsClaimable===false
    &&result.rewardsGranted===false
    &&typeof result.replayed==='boolean'
    &&Number.isInteger(result.memberCount)
    &&result.memberCount>=2&&result.memberCount<=4
    &&Number.isInteger(result.offerCount)
    &&result.offerCount>=0&&result.offerCount<=result.memberCount,
    'invalid_offer_preparation_receipt');
  return result;
}
/**
 * Only a server-authenticated owner may select a reward. This helper has no
 * HTTP route and never trusts client-asserted ownership.
 */
export async function lockPrivatePartyRewardChoiceV24(input:{
  gateEnabled:boolean;
  offerId:string;
  trustedAccountId:string;
  choice:PartyEventCacheChoice;
  repository:TrustedPartyRewardOfferRepositoryV24;
}):Promise<PrivatePartyLockedChoiceV24>{
  requireGate(input.gateEnabled);
  must(UUID.test(input.offerId)&&UUID.test(input.trustedAccountId),
    'invalid_offer_identity');
  must(PARTY_EVENT_CACHE_CHOICES.includes(input.choice),'invalid_choice');
  const result=await input.repository.lockChoice(
    input.offerId,input.trustedAccountId,input.choice,
    'party-event-v24-choice:'+input.offerId.toLowerCase());
  must(result.offerId===input.offerId
    &&result.choice===input.choice
    &&result.choiceLocked===true
    &&typeof result.replayed==='boolean'
    &&result.rewardsClaimable===false&&result.rewardsGranted===false,
    'invalid_choice_lock_receipt');
  return result;
}
/**
 * Private preview reader; it cannot return a spendable reward, regardless of
 * the viewer's EP or selected choice.
 */
export async function readPrivatePartyRewardInboxV24(input:{
  gateEnabled:boolean;
  trustedAccountId:string;
  repository:TrustedPartyRewardOfferRepositoryV24;
}):Promise<PrivatePartyRewardInboxV24>{
  requireGate(input.gateEnabled);
  must(UUID.test(input.trustedAccountId),'invalid_account');
  const inbox=await input.repository.readInboxPreview(input.trustedAccountId);
  must(Array.isArray(inbox?.offers)
    &&inbox.claimEnabled===false
    &&inbox.entitlementsCreated===false
    &&inbox.rewardsGranted===false,'invalid_inbox_flags');
  const seen=new Set<string>();
  for(const row of inbox.offers){
    must(UUID.test(row.offerId)&&UUID.test(row.reservationId)
      &&typeof row.eventStartsAt==='string'
      &&Number.isInteger(row.personalPoints)
      &&row.personalPoints>=5&&row.personalPoints<=60
      &&Number.isInteger(row.rewardBand)
      &&row.rewardBand>=1&&row.rewardBand<=6
      &&row.claimable===false&&row.granted===false&&row.entitlement===false
      &&!seen.has(row.offerId),'invalid_offer_preview');
    seen.add(row.offerId);
    must(partyEventRewardEligibility(row.personalPoints)===row.eligibility,
      'offer_eligibility_mismatch');
    if(row.eligibility==='participation'){
      must(row.status==='participation_preview'
        &&row.selectedChoice===null&&row.choiceLocked===false,
        'invalid_participation_offer');
    }else if(row.choiceLocked){
      must(row.status==='choice_locked_preview'
        &&row.selectedChoice!==null
        &&PARTY_EVENT_CACHE_CHOICES.includes(row.selectedChoice),
        'invalid_locked_choice_offer');
    }else {
      must(row.status==='awaiting_choice_preview'
        &&row.selectedChoice===null,'invalid_awaiting_choice_offer');
    }
  }
  return inbox;
}
