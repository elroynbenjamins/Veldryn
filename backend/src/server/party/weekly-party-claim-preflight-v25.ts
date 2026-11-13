/**
 * Hidden Party Events v25: trusted, non-paying claim preflight.
 *
 * Inputs are ONLY the previously issued reward offer ID and account/character
 * IDs resolved by server authentication. The database determines EP/eligibility,
 * choice, performance band, difficulty, inventory revision and reward amounts.
 *
 * DO NOT expose as a player claim or credit money/XP/materials here.
 */
import {
  PARTY_EVENT_REWARD_MODEL_VERSION,partyEventRewardBundle,
  type PartyEventRewardBundle,type PartyEventCacheChoice,
} from './weekly-party-rewards-v2';
import type {WeeklyPartyDifficulty} from './weekly-party-events-v2';

export const PARTY_EVENT_CLAIM_PREFLIGHT_V25_RELEASED=false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX64=/^[a-f0-9]{64}$/;
function must(value:unknown,reason:string):asserts value {
  if(!value)throw new Error('party_event_v25_'+reason);
}
function record(value:unknown):value is Record<string,unknown> {
  return !!value&&typeof value==='object'&&!Array.isArray(value);
}

export interface PrivatePartyClaimPreflightV25 {
  replayed:boolean;
  offerId:string;
  accountId:string;
  characterId:string;
  difficulty:WeeklyPartyDifficulty;
  rewardHash:string;
  reward:PartyEventRewardBundle;
  inventoryRevision:number;
  conservativeSlotsNeeded:0|1;
  needsSkillTarget:boolean;
  needsCombatXpRouter:boolean;
  needsCompanionRouter:boolean;
  preflightRecorded:true;
  payoutAuthorized:false;
  claimable:false;
  claimed:false;
  rewardsGranted:false;
}
export interface TrustedPartyClaimPreflightRepositoryV25 {
  /** SQL service-only: no client supplied EP, band, choice, amount or skills. */
  prepareClaimPreflight(input:{
    offerId:string;
    accountId:string;
    characterId:string;
    requestId:string;
  }):Promise<PrivatePartyClaimPreflightV25>;
}

export function verifyServerPartyEventQuoteV25(
  difficulty:WeeklyPartyDifficulty,received:unknown,
):asserts received is PartyEventRewardBundle {
  must(record(received),'invalid_reward_record');
  must(received.version===PARTY_EVENT_REWARD_MODEL_VERSION
    &&(received.kind==='participation'||received.kind==='warrior'
      ||received.kind==='artisan'||received.kind==='companion')
    &&Number.isSafeInteger(received.performanceBand)
    &&Number.isSafeInteger(received.personalPoints)
    &&record(received.materials),'invalid_reward_model');
  const kind=received.kind as PartyEventRewardBundle['kind'];
  const expected=partyEventRewardBundle({
    difficulty,performanceBand:received.performanceBand as number,
    personalPoints:received.personalPoints as number,
    choice:kind==='participation'?undefined:kind as PartyEventCacheChoice,
  });
  const expectedKeys=Object.keys(expected).sort();
  must(Object.keys(received).sort().join('|')===expectedKeys.join('|'),
    'reward_shape_mismatch');
  for(const key of expectedKeys){
    if(key==='materials')continue;
    must(received[key]===expected[key as keyof PartyEventRewardBundle],
      'reward_formula_mismatch:'+key);
  }
  const expectedMaterials=expected.materials;
  const actualMaterials=received.materials as Record<string,unknown>;
  const keys=Object.keys(expectedMaterials).sort();
  must(Object.keys(actualMaterials).sort().join('|')===keys.join('|'),
    'reward_materials_mismatch');
  for(const key of keys){
    must(actualMaterials[key]===expectedMaterials[key],
      'reward_material_quantity_mismatch:'+key);
  }
}

/**
 * Returns an immutable DRY-RUN receipt, not an economic grant, inventory
 * reservation, claimable entitlement or an Inbox message.
 *
 * A future payout must recheck the inventory at actual atomic commit time.
 */
export async function preparePrivatePartyClaimPreflightV25(input:{
  gateEnabled:boolean;
  offerId:string;
  trustedAccountId:string;
  trustedCharacterId:string;
  repository:TrustedPartyClaimPreflightRepositoryV25;
}):Promise<PrivatePartyClaimPreflightV25> {
  must(input.gateEnabled,'release_gate_disabled');
  must(UUID.test(input.offerId)&&UUID.test(input.trustedAccountId)
    &&UUID.test(input.trustedCharacterId),'invalid_claim_identity');
  // The same offer can never generate two idempotency identities.
  const requestId='party-event-v25-preflight:'+input.offerId.toLowerCase();
  const receipt=await input.repository.prepareClaimPreflight({
    offerId:input.offerId,accountId:input.trustedAccountId,
    characterId:input.trustedCharacterId,requestId,
  });
  must(record(receipt)
    &&receipt.offerId===input.offerId
    &&receipt.accountId===input.trustedAccountId
    &&receipt.characterId===input.trustedCharacterId
    &&HEX64.test(receipt.rewardHash)
    &&(receipt.difficulty==='standard'||receipt.difficulty==='veteran'
      ||receipt.difficulty==='heroic')
    &&Number.isSafeInteger(receipt.inventoryRevision)
    &&receipt.inventoryRevision>=0
    &&(receipt.conservativeSlotsNeeded===0||receipt.conservativeSlotsNeeded===1)
    &&typeof receipt.replayed==='boolean'
    &&receipt.preflightRecorded===true
    &&receipt.payoutAuthorized===false
    &&receipt.claimable===false&&receipt.claimed===false
    &&receipt.rewardsGranted===false,'invalid_nonpaying_receipt');
  verifyServerPartyEventQuoteV25(receipt.difficulty,receipt.reward);
  const kind=receipt.reward.kind;
  must(receipt.needsSkillTarget===(kind==='artisan')
    &&receipt.needsCombatXpRouter===(kind==='warrior')
    &&receipt.needsCompanionRouter===(kind==='companion')
    &&receipt.conservativeSlotsNeeded===
      (Object.values(receipt.reward.materials).some(v=>v>0)?1:0),
    'invalid_reward_routing');
  return Object.freeze(receipt);
}

/** Explicit fail-closed function until economy + Inbox claim is audited. */
export function claimPrivatePartyEventRewardV25():never {
  throw new Error('party_event_v25_claim_disabled_pending_economy_audit');
}
