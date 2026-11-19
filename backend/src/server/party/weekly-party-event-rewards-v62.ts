/**
 * V62 private Party Event reward read model (QA only).
 * Caller must authenticate the account and fetch evidence + inventory + V61
 * receipts + existing Sigil wallet in ONE repeatable, consistent DB snapshot.
 * This module neither queries the DB nor creates a claim/write capability.
 */
import {
 deriveVerifiedPartyChestEvidenceV61,type PrivatePartyRewardProofV61,
} from './weekly-party-event-proof-v61';
import {
 PARTY_EVENT_CHESTS_V51,partyChestGearChanceV51,
 previewVerifiedPartyChestsV51,
 type PartyEventChestKindV51,
} from './weekly-party-event-chests-v51';
import {
 PARTY_EVENT_GEAR_PIECES_V51,partyEventGearForFamilyV51,
 partyEventSetsForFamilyV51,
} from './weekly-party-event-gear-v51';
import type {PartyEventRewardReceiptV60} from './weekly-party-event-claim-v60';

export const PARTY_EVENT_REWARD_READ_V62_RELEASED=false;
export const PARTY_EVENT_REWARD_READ_V62_SCHEMA='party-event-reward-readonly-v62' as const;
export type PartyChestReadStateV62='locked'|'earned'|'claimed';
export interface PartyRewardReadOnlyV62{
 readonly schema:typeof PARTY_EVENT_REWARD_READ_V62_SCHEMA;
 readonly accountId:string;
 readonly eventStartsAtUtcMs:number;
 readonly serverTimeUtcMs:number;
 readonly family:string;
 readonly difficulty:'standard'|'veteran'|'heroic';
 readonly chests:readonly {
  kind:PartyEventChestKindV51;title:string;
  state:PartyChestReadStateV62;gearChanceBps:number;
  unlockHint:string;canClaim:false;canOpen:false;
 }[];
 readonly sets:readonly {
  id:string;name:string;size:2|3;
  pieces:readonly {id:string;slot:string;owned:boolean}[];
  collected:number;
 }[];
 readonly partySigilsBalance:number;
 readonly exchangeCost:60;
 readonly exchangeAvailable:false;
 readonly settlementClaimAvailable:false;
 readonly previewOnly:true;
 readonly rewardsGrantedByThisRead:0;
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const labels:Readonly<Record<PartyEventChestKindV51,string>>={
 participation:'Earn 15 verified personal Event Points',
 preparation:'Contribute to preparation and complete the optional goal',
 finale:'Win the verified Party Event finale',
};
export function buildPrivatePartyRewardReadV62(input:{
 readonly trustedAccountId:string;
 readonly proof:PrivatePartyRewardProofV61;
 readonly sourceReceipts:readonly PartyEventRewardReceiptV60[];
 readonly ownedPieceIds:readonly string[];
 readonly trustedSigilsBalance:number;
 readonly serverTimeUtcMs:number;
}):PartyRewardReadOnlyV62{
 const evidence=deriveVerifiedPartyChestEvidenceV61(input.proof,input.trustedAccountId);
 if(!Number.isSafeInteger(input.serverTimeUtcMs)||
  input.serverTimeUtcMs<input.proof.week.settledAtUtcMs||
  input.serverTimeUtcMs>8640000000000000||
  !Number.isSafeInteger(input.trustedSigilsBalance)||input.trustedSigilsBalance<0||
  !Array.isArray(input.sourceReceipts)||input.sourceReceipts.length>4||
  !Array.isArray(input.ownedPieceIds)||input.ownedPieceIds.length>20)
  throw Error('party_event_v62_invalid_authoritative_read');
 const approved=new Set(PARTY_EVENT_GEAR_PIECES_V51.map(p=>p.id));
 if(new Set(input.ownedPieceIds).size!==input.ownedPieceIds.length||
  input.ownedPieceIds.some(id=>!approved.has(id)))
  throw Error('party_event_v62_invalid_collection');
 const earned=previewVerifiedPartyChestsV51(evidence);
 const earnedKinds=new Set(earned.map(ch=>ch.kind));
 const claimed=new Set<string>();
 for(const receipt of input.sourceReceipts){
  const source='party-event:'+evidence.eventStartsAtUtcMs+':'+evidence.accountId+':';
  if(!receipt||receipt.sourceKey!==source+(receipt.origin==='chest'?receipt.chestKind:'exchange')||
   receipt.accountId!==evidence.accountId||
   receipt.weekStartMs!==evidence.eventStartsAtUtcMs||
   receipt.rulesVersion!=='party-event-reward-v60'||
   (receipt.origin!=='chest'&&receipt.origin!=='exchange')||
   (receipt.origin==='chest'&&!earnedKinds.has(receipt.chestKind!))||
   (receipt.origin==='exchange'&&!!receipt.chestKind)||
   (receipt.origin==='chest'&&(
    receipt.partySigilsDelta!==PARTY_EVENT_CHESTS_V51.find(x=>x.kind===receipt.chestKind)?.partySigils||
    receipt.gold!==PARTY_EVENT_CHESTS_V51.find(x=>x.kind===receipt.chestKind)?.gold||
    receipt.gemDust!==PARTY_EVENT_CHESTS_V51.find(x=>x.kind===receipt.chestKind)?.gemDust||
    receipt.companionEssence!==PARTY_EVENT_CHESTS_V51.find(x=>x.kind===receipt.chestKind)?.companionEssence
   ))||
   (receipt.origin==='exchange'&&(
    receipt.partySigilsDelta!==-60||receipt.gold!==0||
    receipt.gemDust!==0||receipt.companionEssence!==0))||
   (receipt.pieceId!==null&&
    !partyEventGearForFamilyV51(evidence.family).some(p=>p.id===receipt.pieceId))||
   (receipt.pieceId===null&&receipt.frozenGear!==null)||
   (receipt.frozenGear!==null&&(
    !UUID.test(receipt.frozenGear.itemInstanceId)||
    receipt.frozenGear.pieceId!==receipt.pieceId||
    receipt.frozenGear.tier!==evidence.eligibleGearTier))||
   (receipt.origin==='exchange'&&(!receipt.pieceId||!receipt.frozenGear))||
   claimed.has(receipt.sourceKey))
   throw Error('party_event_v62_invalid_claim_receipt');
  claimed.add(receipt.sourceKey);
 }
 const pool=partyEventGearForFamilyV51(evidence.family);
 return {
  schema:PARTY_EVENT_REWARD_READ_V62_SCHEMA,
  accountId:evidence.accountId,eventStartsAtUtcMs:evidence.eventStartsAtUtcMs,
  serverTimeUtcMs:input.serverTimeUtcMs,
  family:evidence.family,difficulty:evidence.difficulty,
  chests:PARTY_EVENT_CHESTS_V51.map(def=>{
   const source='party-event:'+evidence.eventStartsAtUtcMs+':'+
     evidence.accountId+':'+def.kind;
   return {kind:def.kind,title:def.name,
    state:claimed.has(source)?'claimed' as const:
      earnedKinds.has(def.kind)?'earned' as const:'locked' as const,
    gearChanceBps:partyChestGearChanceV51(def.kind,evidence.difficulty),
    unlockHint:labels[def.kind],canClaim:false as const,canOpen:false as const};
  }),
  sets:partyEventSetsForFamilyV51(evidence.family).map(set=>{
   const pieces=pool.filter(piece=>piece.setId===set.id).map(piece=>({
    id:piece.id,slot:piece.slot,owned:input.ownedPieceIds.includes(piece.id),
   }));
   return {id:set.id,name:set.name,size:set.size,
    collected:pieces.filter(piece=>piece.owned).length,pieces};
  }),
  partySigilsBalance:input.trustedSigilsBalance,
  exchangeCost:60 as const,exchangeAvailable:false as const,
  settlementClaimAvailable:false as const,previewOnly:true as const,
  rewardsGrantedByThisRead:0 as const,
 };
}
