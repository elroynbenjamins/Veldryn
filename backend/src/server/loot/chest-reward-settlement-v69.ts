/**
 * V69: UNMOUNTED shared server-authoritative chest settlement orchestration.
 *
 * Only table definitions differ for Party Events, World Bosses, future
 * seasonal events, dungeons, guild events, quests, etc. This layer handles
 * one canonical account/source, first-resolution persistence, all guaranteed
 * rewards + each independent rolled pool, replay and custody verification.
 *
 * ALL tx methods MUST use the same serializable SQL connection and take
 * an ACCOUNT inventory lock (shared across every chest source) before the
 * per-source unique receipt lock. Different chests for one account must not
 * race on the missing-piece collection snapshot. Failed grants MUST roll
 * back the receipt,
 * ledger and physical account inventory together. This is NOT a live route
 * and must not receive entitlement proof, RNG or loot tables from clients.
 */
import {
 defineChestLootTableV67,deriveChestGroupRollsV67,resolveChestLootV67,
 type ChestLootTableV67,type ChestGroupRollV67,
 type ChestLootResolutionV67,
} from './chest-loot-engine-v67';
import {deriveServerChestRollsV1} from './event-chest-server-roll-v1';

export const CHEST_REWARD_SETTLEMENT_V69_RELEASED=false;
export const CHEST_REWARD_SETTLEMENT_VERSION_V69='chest-settlement-v69' as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE=/^[a-z0-9:_-]{20,220}$/;

export interface TrustedChestSourceV69{
 readonly sourceKey:string;
 readonly accountId:string;
 readonly proofVersion:string;
 readonly earned:true;
 readonly lootTable:ChestLootTableV67;
}
export interface FrozenChestReceiptV69{
 readonly rulesVersion:typeof CHEST_REWARD_SETTLEMENT_VERSION_V69;
 readonly sourceKey:string;
 readonly accountId:string;
 readonly proofVersion:string;
 readonly tableId:string;
 readonly tableVersion:string;
 readonly guaranteed:ChestLootResolutionV67['guarantees'];
 readonly groups:ChestLootResolutionV67['groups'];
 readonly drops:ChestLootResolutionV67['drops'];
 readonly committed:true;
}
export interface ChestGrantTransactionV69{
 /** Read only: receipt was made immutable in an earlier COMMITTED claim. */
 readCommittedReceipt(sourceKey:string):Promise<FrozenChestReceiptV69|null>;
 /** Read persisted official event/quest provenance and the approved table. */
 readTrustedSource(accountId:string,sourceKey:string):Promise<TrustedChestSourceV69>;
 /** Live physical account inventory and pet/cosmetic collection, not a mobile list. */
 readOwnedDropIds(accountId:string):Promise<readonly string[]>;
 /** Immutable UNIQUE receipt insert; never cache or only insert after payout. */
 insertFrozenReceipt(receipt:FrozenChestReceiptV69):Promise<void>;
 /** Must credit ALL guaranteed rewards from the receipt through same tx. */
 creditGuaranteed(receipt:FrozenChestReceiptV69):Promise<void>;
 /** Must actually mint, own and validate each selected drop in the same tx.
  * If Equipment 2.0 event templates/custody are missing, throw to rollback. */
 grantDrop(receipt:FrozenChestReceiptV69,dropIndex:number):Promise<void>;
 /** Verify physical custody and guarantees from persistent tx rows, not memory. */
 verifyExactlyGranted(receipt:FrozenChestReceiptV69):Promise<boolean>;
}
export interface ChestGrantStoreV69{
 /** Includes DB BEGIN SERIALIZABLE, canonical ACCOUNT inventory lock
  * shared across different chest keys, UNIQUE source receipt, commit/rollback.
  * If concurrent item/currency writers cannot share this lock, reject the
  * deployment rather than trusting the prefer_unowned collection snapshot. */
 withLockedAccountSource<T>(
  accountId:string,sourceKey:string,
  work:(tx:ChestGrantTransactionV69)=>Promise<T>,
 ):Promise<T>;
}
export interface ChestGrantAuthorityV69{
 /** Stable private server secret. May rotate for NEW receipts only. */
 readonly secret:Uint8Array;
}
export interface ChestOpenRequestV69{
 /** This ID MUST have been bound from server auth, not request body. */
 readonly authenticatedAccountId:string;
 readonly sourceKey:string;
}
export interface ChestOpenResultV69{
 readonly replayed:boolean;
 readonly receipt:FrozenChestReceiptV69;
}
function checkedIdentity(accountId:string,sourceKey:string):void{
 if(typeof accountId!=='string'||!UUID.test(accountId)||
  accountId!==accountId.toLowerCase()||
  typeof sourceKey!=='string'||!SOURCE.test(sourceKey)||
  sourceKey.split(':'+accountId+':').length!==2)
  throw Error('chest_v69_invalid_authenticated_source');
}
function checkedReceipt(receipt:FrozenChestReceiptV69,
 accountId:string,sourceKey:string):void{
 if(!receipt||receipt.rulesVersion!==CHEST_REWARD_SETTLEMENT_VERSION_V69||
  receipt.accountId!==accountId||receipt.sourceKey!==sourceKey||
  receipt.committed!==true||
  !receipt.proofVersion||!receipt.tableId||!receipt.tableVersion||
  !Array.isArray(receipt.guaranteed)||!Array.isArray(receipt.groups)||
  !Array.isArray(receipt.drops))
  throw Error('chest_v69_corrupt_committed_receipt');
}
/** V1 HMAC is a compatibility contract for previously authored chests.
 * All new table kinds use domain-separated V67 entropy with separate
 * per-group channels; the selection core is identical for both. */
export function deriveChestSettlementRollsV69(
 table:ChestLootTableV67,sourceKey:string,secret:Uint8Array,
 ownedDropIds:readonly string[]=[],
):readonly ChestGroupRollV67[]{
 const frozen=defineChestLootTableV67(table);
 const legacyDomain=frozen.tableId==='party_event_chest'?
  'party_event_v51':frozen.tableId==='world_boss_chest'?
   'world_boss_v58':null;
 if(!legacyDomain)return deriveChestGroupRollsV67({
  table:frozen,sourceKey,secret,ownedDropIds,
 });
 if(frozen.groups.length!==1||frozen.groups[0]!.id!=='equipment')
  throw Error('chest_v69_unapproved_legacy_table_shape');
 const old=deriveServerChestRollsV1({
  secret,domain:legacyDomain,committedChestKey:sourceKey,
 });
 return [{groupId:'equipment',hitRoll:old.hitRoll,
  selectionRoll:old.pieceRoll}];
}
export function createChestRewardSettlementV69(
 store:ChestGrantStoreV69,authority:ChestGrantAuthorityV69,
 qaEnabled=false,
):(request:ChestOpenRequestV69)=>Promise<ChestOpenResultV69>{
 return async request=>{
  if(!qaEnabled||CHEST_REWARD_SETTLEMENT_V69_RELEASED||
   process.env.NODE_ENV==='production')
   throw Error('chest_v69_unreleased');
  checkedIdentity(request?.authenticatedAccountId,request?.sourceKey);
  if(!(authority?.secret instanceof Uint8Array)||
   authority.secret.byteLength<32||authority.secret.byteLength>512)
   throw Error('chest_v69_missing_server_entropy');
  const accountId=request.authenticatedAccountId;
  const sourceKey=request.sourceKey;
  return store.withLockedAccountSource(accountId,sourceKey,async tx=>{
   // Receipt FIRST, before table version/rate changes or RNG key rotation.
   const existing=await tx.readCommittedReceipt(sourceKey);
   if(existing!==null){
    checkedReceipt(existing,accountId,sourceKey);
    if(!await tx.verifyExactlyGranted(existing))
     throw Error('chest_v69_replay_missing_physical_grants');
    return {replayed:true,receipt:existing};
   }
   const trusted=await tx.readTrustedSource(accountId,sourceKey);
   if(!trusted||trusted.earned!==true||
    trusted.accountId!==accountId||trusted.sourceKey!==sourceKey||
    typeof trusted.proofVersion!=='string'||trusted.proofVersion.length<3)
    throw Error('chest_v69_unearned_or_foreign_source');
   const table=defineChestLootTableV67(trusted.lootTable);
   const owned=await tx.readOwnedDropIds(accountId);
   const rolls=deriveChestSettlementRollsV69(
    table,sourceKey,authority.secret,owned,
   );
   const resolved=resolveChestLootV67(table,{
    rolls,ownedDropIds:owned,
   });
   const receipt:FrozenChestReceiptV69={
    rulesVersion:CHEST_REWARD_SETTLEMENT_VERSION_V69,
    sourceKey,accountId,proofVersion:trusted.proofVersion,
    tableId:resolved.tableId,tableVersion:resolved.tableVersion,
    guaranteed:resolved.guarantees,
    groups:resolved.groups,drops:resolved.drops,committed:true,
   };
   checkedReceipt(receipt,accountId,sourceKey);
   await tx.insertFrozenReceipt(receipt);
   await tx.creditGuaranteed(receipt);
   for(let i=0;i<receipt.drops.length;i++)
    await tx.grantDrop(receipt,i);
   if(!await tx.verifyExactlyGranted(receipt))
    throw Error('chest_v69_incomplete_physical_reward');
   return {replayed:false,receipt};
  });
 };
}
