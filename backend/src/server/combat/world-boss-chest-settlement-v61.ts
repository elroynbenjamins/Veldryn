/**
 * World Boss V61 — HIDDEN exactly-once chest grant gateway (UNMOUNTED).
 *
 * Every store operation in withLockedAccountEvent MUST use one private
 * PostgreSQL transaction, ordered account+event locks, and first-write-wins
 * unique source/instance/Inbox grants. A failure rolls back all writes.
 * This file contains NO PostgREST RPC, route, SQL executor or live wallet.
 */
import {
 previewVerifiedWorldBossChestsV58,worldBossChestGuaranteeV58,
 type WorldBossChestKindV58,type VerifiedWorldBossChestEvidenceV58,
 type WorldBossGearSlotV58,
} from './world-boss-chests-v58';
import {
 resolveWorldBossChestEvidenceV59,
 type WorldBossCanonicalChestReadV59,
} from './world-boss-chest-proof-v59';
import {previewResolveWorldBossChestV60} from './world-boss-chest-resolution-v60';
import {
 makeWorldBossEquipmentMintRequestV62,assertWorldBossFrozenItemV62,
 type WorldBossEquipmentMintRequestV62,
 type WorldBossFrozenEquipmentReceiptV62,
 WORLD_BOSS_EQUIPMENT_TIERS_V62,WORLD_BOSS_TO_EQUIPMENT_SLOT_V62,
 WORLD_BOSS_GATHERING_ISSUER_VERSION_V62,
} from './world-boss-gathering-instance-v62';
import {validateWorldBossGatheringRollV65,worldBossGatheringSetV64}
 from './world-boss-gathering-loot-v64';
import type {EquipmentTierIdV33} from '../equipment/equipment-types-v33';

export const WORLD_BOSS_CHEST_GATEWAY_V61_LIVE=false as const;
export const WORLD_BOSS_CHEST_RECEIPT_VERSION_V61='world-boss-chest-receipt-v61' as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KIND:readonly string[]=['donations_goal','three_attempts','community_damage_goal'];
export interface WorldBossChestReceiptV61{
 readonly version:typeof WORLD_BOSS_CHEST_RECEIPT_VERSION_V61;
 readonly status:'committed';
 readonly sourceKey:string;
 readonly eventId:string;
 readonly accountId:string;
 readonly bossId:'hollowroot'|'sunscar'|'frostmarch';
 readonly kind:WorldBossChestKindV58;
 readonly gearHit:boolean;
 readonly frozenGear:WorldBossFrozenEquipmentReceiptV62|null;
 readonly gold:number;readonly gemDust:number;readonly temperingDust:number;
 readonly companionEssence:number;
 /** V28 World Sigils are independent; never minted by a chest. */
 readonly worldSigilsDelta:0;
 readonly inboxSourceKey:string;
}
export interface WorldBossChestTransactionV61{
 /** Query V18 event HP + V27 donations + V26/V28 replay proofs inside lock. */
 readCanonicalEvidence():Promise<WorldBossCanonicalChestReadV59>;
 /** Must include account-owned gear across ALL heroes; not a client collection. */
 readOwnedBossGatheringSlots():Promise<readonly WorldBossGearSlotV58[]>;
 /** Highest approved account unlock / server snapshots only, never client tier. */
 readTrustedEquipmentTier():Promise<EquipmentTierIdV33>;
 /** First-write-wins, never rotate/recompute a committed receipt. */
 readReceipt(sourceKey:string):Promise<WorldBossChestReceiptV61|null>;
 /** Issue exact Equipment 2.0 receipt INSIDE this same transaction. */
 issueExactGatheringItem(
  requested:WorldBossEquipmentMintRequestV62,
 ):Promise<WorldBossFrozenEquipmentReceiptV62>;
 insertReceiptOnce(receipt:WorldBossChestReceiptV61):Promise<void>;
 grantExistingResources(sourceKey:string,resources:{
  readonly gold:number;readonly gemDust:number;readonly temperingDust:number;
  readonly companionEssence:number;
 }):Promise<void>;
 attachIssuedEquipment(sourceKey:string,item:WorldBossFrozenEquipmentReceiptV62):Promise<void>;
 insertInboxOnce(receipt:WorldBossChestReceiptV61):Promise<void>;
}
export interface WorldBossChestPrivateStoreV61{
 /** Must lock the V57 erasure fence, account/event, and source before
  * reading receipts, collection and proof. Rollback if callback throws. */
 withLockedAccountEvent<T>(
  eventId:string,accountId:string,
  work:(tx:WorldBossChestTransactionV61)=>Promise<T>,
 ):Promise<T>;
}
export interface WorldBossChestAuthorityV61{
 authenticate(token:string):Promise<string|null>;
 /** Strong, private secret from server config, not mobile request. */
 secret:Uint8Array;
 store:WorldBossChestPrivateStoreV61;
}
function bad(code:string):never{throw Error('world_boss_v61_'+code);}
function assertExisting(
 row:WorldBossChestReceiptV61,
 expected:{eventId:string;accountId:string;kind:WorldBossChestKindV58;sourceKey:string;bossId:string},
):void{
 const guarantee=worldBossChestGuaranteeV58(expected.kind);
 if(!row||row.version!==WORLD_BOSS_CHEST_RECEIPT_VERSION_V61||
  row.status!=='committed'||row.sourceKey!==expected.sourceKey||
  row.eventId!==expected.eventId||row.accountId!==expected.accountId||
  row.bossId!==expected.bossId||row.kind!==expected.kind||
  row.inboxSourceKey!==row.sourceKey||row.worldSigilsDelta!==0||
  typeof row.gearHit!=='boolean'||row.gearHit!==(row.frozenGear!==null)||
  row.gold!==guarantee.gold||
  row.gemDust!==guarantee.gemDust||
  row.temperingDust!==guarantee.temperingDust||
  row.companionEssence!==guarantee.companionEssence)
  bad('corrupt_existing_receipt');
 if(row.frozenGear){
  const item=row.frozenGear;
  const boss=worldBossGatheringSetV64(row.bossId);
  if(item.sourceKey!==row.sourceKey||item.accountId!==row.accountId||
   item.eventId!==row.eventId||item.bossId!==row.bossId||
   item.custody!=='account_bound_unclaimed_inventory'||
   item.mutable!==false||
   !WORLD_BOSS_EQUIPMENT_TIERS_V62.includes(item.tier)||
   item.issuerVersion!==WORLD_BOSS_GATHERING_ISSUER_VERSION_V62||
   item.acquireSource!=='world_boss_chest'||
   !validateWorldBossGatheringRollV65(item.roll)||
   item.setId!==boss.setId||item.roll.setId!==boss.setId||
   item.roll.skill!==boss.skill||item.pieceId!==item.roll.itemId||
   item.slot!==WORLD_BOSS_TO_EQUIPMENT_SLOT_V62[item.roll.slot])
   bad('corrupt_existing_item');
 }
}
/** Input is ONLY a selection; caller cannot supply character, boss, receipt,
 * damage, HP, stage, tier, random values, collection, account or reward. */
export async function claimWorldBossChestV61(input:{
 readonly token:string;readonly eventId:string;
 readonly kind:WorldBossChestKindV58;
},authority:WorldBossChestAuthorityV61,
 isolatedFixtureEnabled=false):Promise<WorldBossChestReceiptV61>{
 // Constant false in all shipped runtime. Fixture opt-in is test-only.
 if(!isolatedFixtureEnabled||WORLD_BOSS_CHEST_GATEWAY_V61_LIVE)
  bad('hidden_gateway_disabled');
 if(!input||Object.keys(input).some(k=>!['token','eventId','kind'].includes(k))||
  typeof input.token!=='string'||input.token.length<8||
  input.token.length>8192||!UUID.test(input.eventId)||
  !KIND.includes(input.kind)||
  !authority||typeof authority.authenticate!=='function'||
  !(authority.secret instanceof Uint8Array)||authority.secret.length<32||
  !authority.store||typeof authority.store.withLockedAccountEvent!=='function')
  bad('untrusted_request');
 const accountId=await authority.authenticate(input.token);
 if(!accountId||!UUID.test(accountId))bad('auth_required');
 const canonicalAccount=accountId.toLowerCase();
 const canonicalEvent=input.eventId.toLowerCase();
 return authority.store.withLockedAccountEvent(canonicalEvent,canonicalAccount,async tx=>{
  if(!tx||typeof tx.readCanonicalEvidence!=='function'||
   typeof tx.readReceipt!=='function'||typeof tx.readOwnedBossGatheringSlots!=='function'||
   typeof tx.readTrustedEquipmentTier!=='function'||
   typeof tx.issueExactGatheringItem!=='function'||
   typeof tx.insertReceiptOnce!=='function'||
   typeof tx.grantExistingResources!=='function'||
   typeof tx.attachIssuedEquipment!=='function'||
   typeof tx.insertInboxOnce!=='function')bad('private_transaction_required');
  const canonical=await tx.readCanonicalEvidence();
  if(canonical?.eventId?.toLowerCase()!==canonicalEvent||
   canonical?.accountId?.toLowerCase()!==canonicalAccount)
   bad('cross_account_evidence');
  const resolved=resolveWorldBossChestEvidenceV59(canonical);
  const evidence:VerifiedWorldBossChestEvidenceV58={
   ...resolved,eventId:canonicalEvent,accountId:canonicalAccount,
  };
  const sourceKey='world-boss:'+canonicalEvent+':'+canonicalAccount+':'+input.kind;
  const existing=await tx.readReceipt(sourceKey);
  if(existing){
   assertExisting(existing,{eventId:canonicalEvent,accountId:canonicalAccount,
    kind:input.kind,sourceKey,bossId:evidence.bossId});
   return existing; // no new roll, equipment, wallet, or inbox writes on retry
  }
  const earned=previewVerifiedWorldBossChestsV58(evidence)
   .find(p=>p.kind===input.kind);
  if(!earned)bad('not_earned');
  // Keep the two canonical reads ordered on one pinned PostgreSQL
  // transaction client. The account/event lock protects their shared view.
  const ownedSlots=await tx.readOwnedBossGatheringSlots();
  const tier=await tx.readTrustedEquipmentTier();
  const resolution=previewResolveWorldBossChestV60({
   evidence,kind:input.kind,ownedSlots,serverSecret:authority.secret,
  });
  if(resolution.sourceKey!==sourceKey)bad('source_key_mismatch');
  const request=makeWorldBossEquipmentMintRequestV62(resolution,tier);
  let frozenGear:WorldBossFrozenEquipmentReceiptV62|null=null;
  if(request){
   frozenGear=await tx.issueExactGatheringItem(request);
   assertWorldBossFrozenItemV62(request,frozenGear);
  }
  const g=resolution.guaranteed;
  const receipt:WorldBossChestReceiptV61={
   version:WORLD_BOSS_CHEST_RECEIPT_VERSION_V61,
   status:'committed',sourceKey,eventId:canonicalEvent,
   accountId:canonicalAccount,bossId:evidence.bossId,kind:input.kind,
   gearHit:frozenGear!==null,frozenGear,
   gold:g.gold,gemDust:g.gemDust,
   temperingDust:g.temperingDust,companionEssence:g.companionEssence,
   worldSigilsDelta:0,inboxSourceKey:sourceKey,
  };
  // The DB adapter MUST commit all these writes, including exact item
  // custody, within one transaction; each source/id has a unique constraint.
  await tx.insertReceiptOnce(receipt);
  await tx.grantExistingResources(sourceKey,{
   gold:receipt.gold,gemDust:receipt.gemDust,
   temperingDust:receipt.temperingDust,
   companionEssence:receipt.companionEssence,
  });
  if(frozenGear)await tx.attachIssuedEquipment(sourceKey,frozenGear);
  await tx.insertInboxOnce(receipt);
  return receipt;
 });
}
