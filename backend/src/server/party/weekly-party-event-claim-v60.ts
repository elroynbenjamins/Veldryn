/**
 * Party Events V60 — UNMOUNTED transactional reward gateway.
 *
 * Integration seam, NOT a production grant. A future DB adapter must provide
 * one SERIALIZABLE transaction locking the canonical account+week row, with
 * durable uniqueness on chestId, exchangeId and all downstream grant sources.
 * The transaction must roll back receipts, currency and inventory together.
 *
 * No client-provided entitlement, tier, RNG, wallet or collection is accepted.
 */
import {
 previewVerifiedPartyChestsV51,resolvePartyChestGearDraftV51,
 quotePartyGearExchangeV51,
 type PartyEventChestKindV51,type VerifiedPartyChestEvidenceV51,
 type PartyChestTierV51,
} from './weekly-party-event-chests-v51';
import {partyEventGearPieceV51,type PartyGearPieceV51} from './weekly-party-event-gear-v51';
import {deriveServerChestRollsV1} from '../loot/event-chest-server-roll-v1';

export const PARTY_EVENT_REWARD_GATEWAY_V60_RELEASED=false;
export const PARTY_EVENT_REWARD_GATEWAY_V60_VERSION='party-event-reward-v60' as const;
export type PartyEventRewardOriginV60='chest'|'exchange';
export interface FrozenPartyGearGrantV60{
 readonly itemInstanceId:string;
 readonly pieceId:string;
 readonly tier:PartyChestTierV51;
 /** Immutable, verified result from the final Equipment 2.0 server issuer. */
 readonly exactItemReceiptVersion:string;
}
export interface PartyEventRewardReceiptV60{
 readonly sourceKey:string;
 readonly accountId:string;
 readonly weekStartMs:number;
 readonly origin:PartyEventRewardOriginV60;
 readonly chestKind?:PartyEventChestKindV51;
 readonly pieceId:string|null;
 readonly frozenGear:FrozenPartyGearGrantV60|null;
 readonly partySigilsDelta:number;
 readonly gold:number;
 readonly gemDust:number;
 readonly companionEssence:number;
 readonly rulesVersion:typeof PARTY_EVENT_REWARD_GATEWAY_V60_VERSION;
}
export interface PartyEventRewardTransactionV60{
 /** All values are loaded within the lock from durable, canonical game tables. */
 readVerifiedEvidence():Promise<VerifiedPartyChestEvidenceV51>;
 readOwnedPartyGearPieceIds():Promise<readonly string[]>;
 readPartySigilsBalance():Promise<number>;
 readReceipt(sourceKey:string):Promise<PartyEventRewardReceiptV60|null>;
 /** The final 2.0 mint service, called only inside this DB transaction. */
 mintExactEquipmentV2(input:{
  readonly sourceKey:string;readonly piece:PartyGearPieceV51;
  readonly tier:PartyChestTierV51;
 }):Promise<FrozenPartyGearGrantV60>;
 /** Must insert first-write-wins unique sourceKey, never UPSERT/rewrite rolls. */
 insertReceiptOnce(receipt:PartyEventRewardReceiptV60):Promise<void>;
 /** Apply to existing Party currency, not a new currency or double payout. */
 applyPartySigilsDelta(sourceKey:string,delta:number):Promise<void>;
 grantExistingResources(sourceKey:string,input:{
  readonly gold:number;readonly gemDust:number;readonly companionEssence:number;
 }):Promise<void>;
 /** Same frozen instance ID must never be inserted twice (incl. retry). */
 grantFrozenEquipment(sourceKey:string,item:FrozenPartyGearGrantV60):Promise<void>;
}
export interface PartyEventRewardStoreV60{
 /** Must bind account+week to an authenticated service-side actor and use a
  * DB transaction; concurrent attempts wait on the same account/week lock. */
 withLockedAccountWeek<T>(
  accountId:string,weekStartMs:number,
  work:(tx:PartyEventRewardTransactionV60)=>Promise<T>,
 ):Promise<T>;
}
export interface ServerPartyRewardAuthorityV60{
 readonly accountId:string;
 readonly eventStartsAtUtcMs:number;
 readonly secret:Uint8Array;
 /** Supplied only by trusted server secrets manager, not mobile. */
 readonly source:'private_service_worker';
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function assertAuthority(authority:ServerPartyRewardAuthorityV60):void{
 if(!authority||authority.source!=='private_service_worker'||
  !UUID.test(authority.accountId)||
  !Number.isSafeInteger(authority.eventStartsAtUtcMs)||
  authority.eventStartsAtUtcMs<0||
  !(authority.secret instanceof Uint8Array)||authority.secret.length<32)
  throw Error('party_event_v60_unverified_authority');
}
function assertEvidence(
 authority:ServerPartyRewardAuthorityV60,evidence:VerifiedPartyChestEvidenceV51,
):void{
 if(evidence.accountId.toLowerCase()!==authority.accountId.toLowerCase()||
  evidence.eventStartsAtUtcMs!==authority.eventStartsAtUtcMs)
  throw Error('party_event_v60_evidence_identity_mismatch');
}
function validateExisting(
 receipt:PartyEventRewardReceiptV60,sourceKey:string,
 authority:ServerPartyRewardAuthorityV60,origin:PartyEventRewardOriginV60,
):void{
 if(receipt.sourceKey!==sourceKey||receipt.origin!==origin||
  receipt.accountId.toLowerCase()!==authority.accountId.toLowerCase()||
  receipt.weekStartMs!==authority.eventStartsAtUtcMs||
  receipt.rulesVersion!==PARTY_EVENT_REWARD_GATEWAY_V60_VERSION)
  throw Error('party_event_v60_corrupt_replay_receipt');
}
function assertMinted(item:FrozenPartyGearGrantV60,piece:PartyGearPieceV51,tier:PartyChestTierV51){
 if(!item||!UUID.test(item.itemInstanceId)||item.pieceId!==piece.id||
  item.tier!==tier||typeof item.exactItemReceiptVersion!=='string'||
  item.exactItemReceiptVersion.length<3)
  throw Error('party_event_v60_unverified_equipment_mint');
}
function makeReceipt(input:Omit<PartyEventRewardReceiptV60,'rulesVersion'>):PartyEventRewardReceiptV60{
 return {...input,rulesVersion:PARTY_EVENT_REWARD_GATEWAY_V60_VERSION};
}
export async function claimPartyEventChestV60(input:{
 authority:ServerPartyRewardAuthorityV60;
 kind:PartyEventChestKindV51;
 store:PartyEventRewardStoreV60;
},serverEnabled=false):Promise<PartyEventRewardReceiptV60>{
 if(!serverEnabled||PARTY_EVENT_REWARD_GATEWAY_V60_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('party_event_v60_hidden_gateway_disabled');
 assertAuthority(input.authority);
 if(!['participation','preparation','finale'].includes(input.kind))
  throw Error('party_event_v60_unknown_chest');
 return input.store.withLockedAccountWeek(input.authority.accountId,
  input.authority.eventStartsAtUtcMs,async tx=>{
   const evidence=await tx.readVerifiedEvidence();
   assertEvidence(input.authority,evidence);
   const preview=previewVerifiedPartyChestsV51(evidence).find(x=>x.kind===input.kind);
   if(!preview)throw Error('party_event_v60_chest_not_earned');
   const existing=await tx.readReceipt(preview.chestId);
   if(existing){
    validateExisting(existing,preview.chestId,input.authority,'chest');
    if(existing.chestKind!==input.kind)throw Error('party_event_v60_corrupt_chest_kind');
    return existing; // No re-roll, re-mint, or repeated ledger increment.
   }
   const rolls=deriveServerChestRollsV1({
    domain:'party_event_v51',secret:input.authority.secret,
    committedChestKey:preview.chestId,
   });
   const owned=await tx.readOwnedPartyGearPieceIds();
   const draft=resolvePartyChestGearDraftV51(preview,{
    gearRoll:rolls.hitRoll,pieceRoll:rolls.pieceRoll,ownedPieceIds:owned,
   });
   const frozen=draft.piece?await tx.mintExactEquipmentV2({
    sourceKey:preview.chestId,piece:draft.piece,tier:draft.gearTier,
   }):null;
   if(frozen&&draft.piece)assertMinted(frozen,draft.piece,draft.gearTier);
   const guaranteed=preview.guaranteed;
   const receipt=makeReceipt({
    sourceKey:preview.chestId,accountId:input.authority.accountId.toLowerCase(),
    weekStartMs:input.authority.eventStartsAtUtcMs,
    origin:'chest',chestKind:input.kind,
    pieceId:draft.piece?.id??null,frozenGear:frozen,
    partySigilsDelta:guaranteed.partySigils,gold:guaranteed.gold,
    gemDust:guaranteed.gemDust,companionEssence:guaranteed.companionEssence,
   });
   await tx.insertReceiptOnce(receipt);
   await tx.applyPartySigilsDelta(receipt.sourceKey,receipt.partySigilsDelta);
   await tx.grantExistingResources(receipt.sourceKey,guaranteed);
   if(frozen)await tx.grantFrozenEquipment(receipt.sourceKey,frozen);
   return receipt;
  });
}
export async function exchangePartyEventGearV60(input:{
 authority:ServerPartyRewardAuthorityV60;
 requestedPieceId:string;
 store:PartyEventRewardStoreV60;
},serverEnabled=false):Promise<PartyEventRewardReceiptV60>{
 if(!serverEnabled||PARTY_EVENT_REWARD_GATEWAY_V60_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('party_event_v60_hidden_gateway_disabled');
 assertAuthority(input.authority);
 if(!partyEventGearPieceV51(input.requestedPieceId))
  throw Error('party_event_v60_unknown_piece');
 return input.store.withLockedAccountWeek(input.authority.accountId,
  input.authority.eventStartsAtUtcMs,async tx=>{
   const evidence=await tx.readVerifiedEvidence();
   assertEvidence(input.authority,evidence);
   // Exchange only for earned participation; no speculative item grant.
   if(!previewVerifiedPartyChestsV51(evidence).some(x=>x.kind==='participation'))
    throw Error('party_event_v60_account_not_eligible');
   const sourceKey='party-event:'+evidence.eventStartsAtUtcMs+':'+
    evidence.accountId.toLowerCase()+':exchange';
   const existing=await tx.readReceipt(sourceKey);
   if(existing){
    validateExisting(existing,sourceKey,input.authority,'exchange');
    if(existing.pieceId!==input.requestedPieceId)
     throw Error('party_event_v60_already_exchanged_other_piece');
    return existing;
   }
   const owned=await tx.readOwnedPartyGearPieceIds();
   const balance=await tx.readPartySigilsBalance();
   const quote=quotePartyGearExchangeV51({
    family:evidence.family,requestedPieceId:input.requestedPieceId,
    trustedBalance:balance,alreadyExchangedThisEvent:false,
    ownedPieceIds:owned,
   });
   if(!quote.available)throw Error('party_event_v60_exchange_unavailable');
   if(!quote.collectionMissing)throw Error('party_event_v60_piece_already_owned');
   const frozen=await tx.mintExactEquipmentV2({
    sourceKey,piece:quote.piece,tier:evidence.eligibleGearTier,
   });
   assertMinted(frozen,quote.piece,evidence.eligibleGearTier);
   const receipt=makeReceipt({
    sourceKey,accountId:input.authority.accountId.toLowerCase(),
    weekStartMs:input.authority.eventStartsAtUtcMs,
    origin:'exchange',pieceId:quote.piece.id,frozenGear:frozen,
    partySigilsDelta:-quote.partySigilsCost,gold:0,gemDust:0,
    companionEssence:0,
   });
   await tx.insertReceiptOnce(receipt);
   await tx.applyPartySigilsDelta(receipt.sourceKey,receipt.partySigilsDelta);
   await tx.grantFrozenEquipment(receipt.sourceKey,frozen);
   return receipt;
  });
}
