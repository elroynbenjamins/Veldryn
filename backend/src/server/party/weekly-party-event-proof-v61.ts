/**
 * Party Events V61: immutable DB-source evidence boundary for V51/V60.
 *
 * No public route, query runner, rewards or currency writes. A future private
 * worker must SELECT all these sources inside the SAME locked account/week
 * transaction, not assemble them from a mobile request or a stale cache.
 * Neither week status 'settled' nor 3 stage completion proves boss victory.
 */
import type {VerifiedPartyChestEvidenceV51} from './weekly-party-event-chests-v51';
import {previewVerifiedPartyChestsV51} from './weekly-party-event-chests-v51';

export const PARTY_EVENT_PROOF_V61_RELEASED=false;
export const PARTY_EVENT_PROOF_V61_VERSION='party-event-proof-v61' as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const families=['broken_caravan','nightfall_hunt','broken_wards','lost_reliquary'] as const;
const difficulties=['standard','veteran','heroic'] as const;
const weekMs=604800000;
const dayMs=86400000;
const validId=(x:unknown):x is string=>typeof x==='string'&&UUID.test(x);
const safe=(x:unknown):x is number=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0;
type Family=(typeof families)[number];
type Difficulty=(typeof difficulties)[number];
interface SourceIdentityV61{
 readonly partyId:string;readonly accountId:string;readonly eventStartsAtUtcMs:number;
}
interface PartySourceV61 {
 readonly partyId:string;readonly eventStartsAtUtcMs:number;
}
export interface PrivatePartyRewardProofV61 {
 readonly source:'private_party_event_settlement_join_v61';
 readonly week:PartySourceV61&{
  readonly eventEndsAtUtcMs:number;
  readonly settledAtUtcMs:number;
  readonly status:'settled';
  readonly family:Family;
  readonly difficulty:Difficulty;
 };
 readonly roster:SourceIdentityV61&{
  readonly rosterSize:2|3|4;
  readonly frozenCharacterId:string;
 };
 readonly activity:SourceIdentityV61&{
  /** V14's source-committed 0–40 recurring activity EP, not client totals. */
  readonly activityPoints:number;
  readonly sourceVersion:'party_event_member_progress_v14';
 };
 readonly preparation: (SourceIdentityV61&{
  readonly committedDonationId:string;
  readonly optionalSupplyGoalReceiptId:string|null;
  readonly optionalGoalFrozen:boolean;
 })|null;
 readonly finale:(PartySourceV61&{
  readonly canonicalFinaleReceiptId:string;
  readonly serverVerifiedVictory:boolean;
 })|null;
 readonly tier:SourceIdentityV61&{
  readonly eligibleGearTier:1|2|3|4|5|6|7|8|9;
  readonly sourceVersion:'server_level_snapshot_v2';
 };
}
function assertIdentity(row:SourceIdentityV61,partyId:string,accountId:string,at:number){
 if(!row||row.partyId!==partyId||row.accountId?.toLowerCase()!==accountId||
  row.eventStartsAtUtcMs!==at)
  throw Error('party_event_v61_cross_source_identity');
}
function assertParty(row:PartySourceV61,partyId:string,at:number){
 if(!row||row.partyId!==partyId||row.eventStartsAtUtcMs!==at)
  throw Error('party_event_v61_cross_party_evidence');
}
/** Strict projection only. Claim gateway still requires actual DB transaction. */
export function deriveVerifiedPartyChestEvidenceV61(
 proof:PrivatePartyRewardProofV61,
 trustedAccountId:string,
):VerifiedPartyChestEvidenceV51{
 if(!proof||proof.source!=='private_party_event_settlement_join_v61'||
  !validId(trustedAccountId)||!validId(proof.week?.partyId)||
  !safe(proof.week.eventStartsAtUtcMs)||
  proof.week.eventStartsAtUtcMs%dayMs!==0||
  new Date(proof.week.eventStartsAtUtcMs).getUTCDay()!==1||
  !safe(proof.week.eventEndsAtUtcMs)||
  proof.week.eventEndsAtUtcMs-proof.week.eventStartsAtUtcMs!==weekMs||
  !safe(proof.week.settledAtUtcMs)||
  proof.week.settledAtUtcMs<proof.week.eventEndsAtUtcMs+3600000||
  proof.week.status!=='settled'||
  !families.includes(proof.week.family)||!difficulties.includes(proof.week.difficulty)||
  !validId(proof.roster?.frozenCharacterId)||
  !proof.roster||![2,3,4].includes(proof.roster.rosterSize)||
  proof.activity?.sourceVersion!=='party_event_member_progress_v14'||
  !safe(proof.activity.activityPoints)||proof.activity.activityPoints>40||
  proof.tier?.sourceVersion!=='server_level_snapshot_v2'||
  ![1,2,3,4,5,6,7,8,9].includes(proof.tier.eligibleGearTier))
  throw Error('party_event_v61_unverified_settlement_sources');
 const account=trustedAccountId.toLowerCase(),partyId=proof.week.partyId,at=proof.week.eventStartsAtUtcMs;
 assertIdentity(proof.roster,partyId,account,at);
 assertIdentity(proof.activity,partyId,account,at);
 assertIdentity(proof.tier,partyId,account,at);
 let contributed=false,optional=false,won=false;
 if(proof.preparation!==null){
  assertIdentity(proof.preparation,partyId,account,at);
  if(!validId(proof.preparation.committedDonationId)||
   (proof.preparation.optionalSupplyGoalReceiptId!==null&&
    !validId(proof.preparation.optionalSupplyGoalReceiptId))||
   typeof proof.preparation.optionalGoalFrozen!=='boolean'||
   (proof.preparation.optionalGoalFrozen&&
    proof.preparation.optionalSupplyGoalReceiptId===null))
   throw Error('party_event_v61_invalid_preparation_proof');
  contributed=true;
  optional=proof.preparation.optionalGoalFrozen&&
   proof.preparation.optionalSupplyGoalReceiptId!==null;
 }
 if(proof.finale!==null){
  assertParty(proof.finale,partyId,at);
  if(!validId(proof.finale.canonicalFinaleReceiptId)||
   typeof proof.finale.serverVerifiedVictory!=='boolean')
   throw Error('party_event_v61_invalid_finale_proof');
  won=proof.finale.serverVerifiedVictory;
 }
 const result:VerifiedPartyChestEvidenceV51={
  accountId:account,eventStartsAtUtcMs:at,
  family:proof.week.family,difficulty:proof.week.difficulty,
  personalPoints:proof.activity.activityPoints,
  contributedToPreparation:contributed,
  optionalPreparationGoalCompleted:optional,
  verifiedFinaleVictory:won,eligibleGearTier:proof.tier.eligibleGearTier,
 };
 // Reuse V51's stricter contract before a private server consumes this data.
 previewVerifiedPartyChestsV51(result);
 return result;
}
