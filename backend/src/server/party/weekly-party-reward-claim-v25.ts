/**
 * Hidden Party Events v25: nonpaying, account-bound reward claim QUOTES.
 *
 * The only input identifiers must be obtained from the trusted authenticated
 * server workflow. Never pass a client-provided account/character identity or
 * reward amount to this repository. No claim/credit function is exposed.
 */
import {
  partyEventRewardBundle, type PartyEventRewardBundle,
  type PartyEventCacheChoice,
} from './weekly-party-rewards-v2';
import type {WeeklyPartyDifficulty} from './weekly-party-events-v2';

export const PARTY_EVENT_REWARD_CLAIM_V25_RELEASED=false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX=/^[0-9a-f]{64}$/;
const DIFFICULTIES:readonly WeeklyPartyDifficulty[]=['standard','veteran','heroic'];

export interface PartyRewardClaimQuoteV25 {
  replayed:boolean;
  offerId:string;
  accountId:string;
  characterId:string;
  difficulty:WeeklyPartyDifficulty;
  quote:PartyEventRewardBundle;
  quoteHash:string;
  storageShapeVerified:true;
  inventoryCapacityVerified:false;
  claimEnabled:false;
  claimed:false;
  entitlementsCreated:false;
  economyApplied:false;
  inboxDelivered:false;
}
export interface PartyRewardQuoteInboxV25 {
  claimsEnabled:false;
  economyApplied:false;
  entitlementsCreated:false;
  quoteCount:number;
  quotes:readonly {
    offerId:string;
    characterId:string;
    eventStartsAt:string;
    rewardKind:string;
    difficulty:WeeklyPartyDifficulty;
    rewardBand:number;
    quote:PartyEventRewardBundle;
    quoteHash:string;
    status:'blocked_economy_not_audited';
    claimable:false;
    claimed:false;
    inboxDelivered:false;
  }[];
}
export interface TrustedPartyRewardClaimQuoteRepositoryV25 {
  /** All arguments are server-resolved. Recheck identity in the SQL function. */
  prepareClaimQuote(
    offerId:string, trustedAccountId:string,
    frozenCharacterId:string, requestId:string,
  ):Promise<PartyRewardClaimQuoteV25>;
  readClaimQuoteInbox(trustedAccountId:string):Promise<PartyRewardQuoteInboxV25>;
}
function assert(ok:unknown,code:string):asserts ok {
  if(!ok)throw new Error('party_event_v25_'+code);
}
function exactMaterialMap(left:Record<string,number>,right:Record<string,number>) {
  const names=Object.keys(left).sort();
  const other=Object.keys(right).sort();
  return JSON.stringify(names)===JSON.stringify(other)
    &&names.every(name=>left[name]===right[name]);
}
function checkQuoteModel(
  quote:PartyEventRewardBundle,difficulty:WeeklyPartyDifficulty,
):void {
  assert(quote?.version==='party-event-rewards-v2'
    &&Number.isInteger(quote.personalPoints)
    &&Number.isInteger(quote.performanceBand)
    &&quote.personalPoints>=5&&quote.personalPoints<=60
    &&quote.performanceBand>=1&&quote.performanceBand<=6
    &&quote.materials!==null&&typeof quote.materials==='object'
    &&!Array.isArray(quote.materials),'invalid_quote_fields');
  const choice=quote.kind==='participation'?undefined:
    quote.kind as PartyEventCacheChoice;
  let expected:PartyEventRewardBundle;
  try {
    expected=partyEventRewardBundle({
      difficulty,performanceBand:quote.performanceBand,
      personalPoints:quote.personalPoints,choice,
    });
  } catch {
    throw new Error('party_event_v25_invalid_quote_model');
  }
  assert(
    quote.kind===expected.kind
    &&quote.gold===expected.gold
    &&quote.combatXp===expected.combatXp
    &&quote.skillXp===expected.skillXp
    &&quote.companionEssence===expected.companionEssence
    &&quote.bondstones===expected.bondstones
    &&quote.partyRenown===expected.partyRenown
    &&exactMaterialMap(quote.materials,expected.materials),
    'quote_model_mismatch',
  );
}

/** Prepares an immutable quote; does not claim anything. */
export async function preparePrivatePartyClaimQuoteV25(input:{
  gateEnabled:boolean;offerId:string;trustedAccountId:string;
  frozenCharacterId:string;
  repository:TrustedPartyRewardClaimQuoteRepositoryV25;
}):Promise<PartyRewardClaimQuoteV25>{
  assert(input.gateEnabled,'release_gate_disabled');
  assert(UUID.test(input.offerId)&&UUID.test(input.trustedAccountId)
    &&UUID.test(input.frozenCharacterId),'invalid_quote_identity');
  const response=await input.repository.prepareClaimQuote(
    input.offerId,input.trustedAccountId,input.frozenCharacterId,
    'party-event-v25-quote:'+input.offerId.toLowerCase());
  assert(response.offerId===input.offerId
    &&response.accountId===input.trustedAccountId
    &&response.characterId===input.frozenCharacterId
    &&DIFFICULTIES.includes(response.difficulty)
    &&HEX.test(response.quoteHash)
    &&typeof response.replayed==='boolean'
    &&response.storageShapeVerified===true
    &&response.inventoryCapacityVerified===false
    &&response.claimEnabled===false
    &&response.claimed===false
    &&response.entitlementsCreated===false
    &&response.economyApplied===false
    &&response.inboxDelivered===false,'invalid_quote_receipt');
  checkQuoteModel(response.quote,response.difficulty);
  return response;
}

/** Pure private Inbox PREVIEW. Its entire status remains nonclaimable. */
export async function readPrivatePartyClaimQuoteInboxV25(input:{
  gateEnabled:boolean;trustedAccountId:string;
  repository:TrustedPartyRewardClaimQuoteRepositoryV25;
}):Promise<PartyRewardQuoteInboxV25>{
  assert(input.gateEnabled,'release_gate_disabled');
  assert(UUID.test(input.trustedAccountId),'invalid_account');
  const inbox=await input.repository.readClaimQuoteInbox(input.trustedAccountId);
  assert(inbox?.claimsEnabled===false
    &&inbox.economyApplied===false
    &&inbox.entitlementsCreated===false
    &&Array.isArray(inbox.quotes)
    &&Number.isInteger(inbox.quoteCount)
    &&inbox.quoteCount===inbox.quotes.length,
    'invalid_quote_inbox_flags');
  const seen=new Set<string>();
  for(const row of inbox.quotes){
    assert(UUID.test(row.offerId)&&UUID.test(row.characterId)
      &&typeof row.eventStartsAt==='string'
      &&HEX.test(row.quoteHash)
      &&row.rewardKind===row.quote.kind
      &&row.rewardBand===row.quote.performanceBand
      &&DIFFICULTIES.includes(row.difficulty)
      &&row.status==='blocked_economy_not_audited'
      &&row.claimable===false
      &&row.claimed===false
      &&row.inboxDelivered===false
      &&!seen.has(row.offerId),
      'invalid_quote_inbox_row');
    checkQuoteModel(row.quote,row.difficulty);
    seen.add(row.offerId);
  }
  return inbox;
}
