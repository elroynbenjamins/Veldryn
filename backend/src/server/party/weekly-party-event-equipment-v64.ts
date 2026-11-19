/**
 * V64: deliberately unregistered Party Event -> Equipment 2.0 issuer contract.
 * The current EQ2 draft accepts only EQ2_ craft-recipe pieces at T1–T4.
 * Every PE_ set piece and T5–T9 require a new audited canonical manifest,
 * item stat roller, tier mapping, custody and level rules. This module MUST
 * NOT synthesize EQ2_ gear from a Party Event chest.
 */
import {partyEventGearPieceV51,type PartyGearPieceV51} from './weekly-party-event-gear-v51';
import type {PartyChestTierV51} from './weekly-party-event-chests-v51';
import type {FrozenPartyGearGrantV60} from './weekly-party-event-claim-v60';

export const PARTY_EVENT_EQUIPMENT_BRIDGE_V64_RELEASED=false;
export const PARTY_EVENT_EQUIPMENT_BRIDGE_V64_VERSION='party-event-equipment-v64' as const;
export const EQUIPMENT_V2_CURRENT_DRAFT_MAX_TIER_V64=4 as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[0-9a-f]{64}$/;
const validUuid=(v:unknown):v is string=>typeof v==='string'&&UUID.test(v);
export interface PartyEventItemIssuanceRequestV64 {
 readonly source:'trusted_party_reward_transaction';
 readonly sourceKey:string;
 readonly accountId:string;
 readonly ownerCharacterId:string;
 readonly eventStartsAtUtcMs:number;
 readonly piece:PartyGearPieceV51;
 readonly tier:PartyChestTierV51;
 /** No class/role restriction; any class may wear event gear. */
 readonly classRestriction:null;
 readonly rollPolicy:'equipment_v2_authoritative_quality_rarity_affixes';
 readonly custodyPolicy:'same_account_transaction_or_rollback';
 readonly sourceCatalogVersion:'party-event-gear-v51';
}
export interface PartyEventItemIssuancePlanV64{
 readonly contract:PartyEventItemIssuanceRequestV64;
 readonly blockers:readonly (
  'party_event_template_not_in_eq2_manifest'|
  'eq2_t5_to_t9_not_implemented'|
  'eq2_physical_custody_unverified'
 )[];
 readonly readyForIssuance:false;
}
export interface PartyEventIssuerOutputV64 {
 readonly itemInstanceId:string;
 readonly pieceId:string;
 readonly setId:string;
 readonly slot:PartyGearPieceV51['slot'];
 readonly family:PartyGearPieceV51['family'];
 readonly tier:PartyChestTierV51;
 readonly accountId:string;
 readonly ownerCharacterId:string;
 readonly eventStartsAtUtcMs:number;
 readonly sourceKey:string;
 readonly classRestriction:null;
 readonly rarity:'common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic';
 readonly quality:number;
 readonly exactStatSnapshotHash:string;
 readonly exactItemReceiptVersion:string;
 readonly canonicalLedgerValidated:true;
 readonly sameTransactionCustodyCommitted:true;
 readonly gemSockets:readonly [];
}
export function planPartyEventEquipmentIssuanceV64(
 input:PartyEventItemIssuanceRequestV64,
):PartyEventItemIssuancePlanV64{
 const canonical=partyEventGearPieceV51(input?.piece?.id);
 const key='party-event:'+input?.eventStartsAtUtcMs+':'+
  input?.accountId?.toLowerCase()+':';
 const suffix=typeof input?.sourceKey==='string'&&input.sourceKey.startsWith(key)
  ?input.sourceKey.slice(key.length):'';
 if(!input||input.source!=='trusted_party_reward_transaction'||
  !canonical||input.piece!==canonical||
  !validUuid(input.accountId)||input.accountId!==input.accountId.toLowerCase()||
  !validUuid(input.ownerCharacterId)||
  !Number.isSafeInteger(input.eventStartsAtUtcMs)||
  input.eventStartsAtUtcMs<0||input.eventStartsAtUtcMs%86400000!==0||
  new Date(input.eventStartsAtUtcMs).getUTCDay()!==1||
  !['participation','preparation','finale','exchange'].includes(suffix)||
  ![1,2,3,4,5,6,7,8,9].includes(input.tier)||
  input.classRestriction!==null||
  input.rollPolicy!=='equipment_v2_authoritative_quality_rarity_affixes'||
  input.custodyPolicy!=='same_account_transaction_or_rollback'||
  input.sourceCatalogVersion!=='party-event-gear-v51')
  throw Error('party_event_v64_unverified_issuer_request');
 const blockers:PartyEventItemIssuancePlanV64['blockers'][number][]=[
  'party_event_template_not_in_eq2_manifest',
  'eq2_physical_custody_unverified',
 ];
 if(input.tier>EQUIPMENT_V2_CURRENT_DRAFT_MAX_TIER_V64)
  blockers.push('eq2_t5_to_t9_not_implemented');
 return {contract:input,blockers,readyForIssuance:false};
}
/**
 * Structural cross-system receipt validation — never a replacement for the
 * final EQ2 exact-stats and physical inventory/CAS verification. The issuer
 * must prove hash/rarity/affixes against its own canonical DB ledger, and
 * author V2 event templates before this can be mounted.
 */
export function verifyPartyEventIssuedGearV64(
 request:PartyEventItemIssuanceRequestV64,
 output:PartyEventIssuerOutputV64,
):FrozenPartyGearGrantV60{
 planPartyEventEquipmentIssuanceV64(request);
 if(!output||!validUuid(output.itemInstanceId)||
  output.pieceId!==request.piece.id||output.setId!==request.piece.setId||
  output.slot!==request.piece.slot||output.family!==request.piece.family||
  output.tier!==request.tier||
  output.accountId!==request.accountId||
  output.ownerCharacterId!==request.ownerCharacterId||
  output.eventStartsAtUtcMs!==request.eventStartsAtUtcMs||
  output.sourceKey!==request.sourceKey||
  output.classRestriction!==null||
  !['common','uncommon','rare','epic','legendary','mythic'].includes(output.rarity)||
  !Number.isSafeInteger(output.quality)||output.quality<0||output.quality>100||
  !SHA.test(output.exactStatSnapshotHash)||
  typeof output.exactItemReceiptVersion!=='string'||
  !/^equipment-v2-event-[a-z0-9-]{6,70}$/.test(output.exactItemReceiptVersion)||
  output.canonicalLedgerValidated!==true||
  output.sameTransactionCustodyCommitted!==true||
  !Array.isArray(output.gemSockets)||output.gemSockets.length!==0)
  throw Error('party_event_v64_forged_or_incomplete_item_receipt');
 return {itemInstanceId:output.itemInstanceId,pieceId:output.pieceId,
  tier:output.tier,exactItemReceiptVersion:output.exactItemReceiptVersion};
}
