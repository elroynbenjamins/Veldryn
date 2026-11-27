/** Hidden composition of existing V69/V70 settlement, V103 real wallet
 * and resource/Inbox ports, and V102 immutable gathering mint. No HTTP,
 * public RPC, live feature flag or production deployment.
 * Source ports remain privileged and must implement actual V57/V95 proofs. */
import {createChestRewardSettlementV69,type TrustedChestSourceV69} from './chest-reward-settlement-v69';
import {createChestPostgresStoreV70,type ChestPhysicalPortsV70,type ChestPoolV70,type ChestSqlV70} from './chest-postgres-store-v70';
import {createWorldBossRealRewardPortsV103} from './world-boss-real-reward-ports-v103';
import {issueWorldBossGatheringMintV102} from './world-boss-gathering-mint-v102';
import {worldBossChestLootTableV96} from '../combat/world-boss-chest-policy-v96';
import {WORLD_BOSS_GATHERING_SETS_V64} from '../combat/world-boss-gathering-loot-v64';
import {gatheringSnapshotDigestV100} from '../combat/world-boss-gathering-snapshot-v100';
export const WORLD_BOSS_CHEST_OPENING_V103_LIVE=false as const;
export type WorldBossV103SourcePorts=Pick<ChestPhysicalPortsV70,'assertSourceWriteOpen'|'readCanonicalSource'|'isOwnedCharacter'>&{
 verifyLockedSource:(tx:ChestSqlV70,accountId:string,sourceKey:string)=>Promise<boolean>;
};
export function createWorldBossChestOpeningV103(pool:ChestPoolV70,source:WorldBossV103SourcePorts,authority:{
 chestSecret:Uint8Array;mintSecret:Uint8Array;entropyVersion:string;
},qaEnabled=false){
 return async(request:{authenticatedAccountId:string;sourceKey:string})=>{
  if(!qaEnabled||WORLD_BOSS_CHEST_OPENING_V103_LIVE||process.env.NODE_ENV==='production'||
   typeof source.assertSourceWriteOpen!=='function'||typeof source.verifyLockedSource!=='function'||
   !/^world-boss:[0-9a-f-]{36}:[0-9a-f-]{36}:(donations_goal|three_attempts|community_damage_goal|damage:[1-9][0-9]*)$/.test(request.sourceKey))
   throw Error('world_boss_v103_unreleased_or_invalid_source');
  let bossId:string|undefined;
  const physical=createWorldBossRealRewardPortsV103(true);
  const mint=(tx:ChestSqlV70,receipt:{accountId:string;sourceKey:string},requireExisting:boolean)=>issueWorldBossGatheringMintV102(tx,{
   accountId:receipt.accountId,sourceKey:receipt.sourceKey,entropyVersion:authority.entropyVersion,
   secret:authority.mintSecret,verifyLockedSource:source.verifyLockedSource,requireExisting,
  },true);
  const ports:ChestPhysicalPortsV70={
   ...physical,assertSourceWriteOpen:source.assertSourceWriteOpen,isOwnedCharacter:source.isOwnedCharacter,
   readApprovedEquipmentContext:async()=>{throw Error('world_boss_v103_other_equipment_blocked');},
   readCanonicalSource:async(tx,accountId,key):Promise<TrustedChestSourceV69>=>{
    const row=await source.readCanonicalSource(tx,accountId,key);
    const set=WORLD_BOSS_GATHERING_SETS_V64.find(x=>row.lootTable.version==='world_boss_v98_unified_'+x.bossId);
    if(!set||row.accountId!==accountId||row.sourceKey!==key||row.earned!==true||
     row.recipientCharacterId!==null||row.equipmentDeliveryMode!=='account_unclaimed'||
     gatheringSnapshotDigestV100(row.lootTable)!==gatheringSnapshotDigestV100(worldBossChestLootTableV96(set.bossId,'donations_goal'))||
     !await source.verifyLockedSource(tx,accountId,key))throw Error('world_boss_v103_unverified_source');
    bossId=set.bossId;return row;
   },
   readAccountOwnedDrops:async(tx,accountId)=>{
    if(!bossId)throw Error('world_boss_v103_missing_boss_scope');
    const rows=(await tx.query<{slot:string}>('SELECT slot FROM private.world_boss_gathering_mints_v102 WHERE account_id=$1::uuid AND boss_id=$2',[accountId,bossId])).rows;
    return [...new Set(rows.map(x=>x.slot))];
   },
   verifyPhysical:async(tx,receipt,legs,phase)=>{
    const drops=legs.filter(x=>x.kind==='drop');
    if(drops.length!==receipt.drops.length||drops.length>1)return false;
    if(!await physical.verifyPhysical(tx,receipt,legs.filter(x=>x.kind!=='drop'),phase))return false;
    if(!drops.length){
     const rows=(await tx.query<{id:string}>('SELECT id::text AS id FROM private.world_boss_gathering_mints_v102 WHERE account_id=$1::uuid AND source_key=$2',[receipt.accountId,receipt.sourceKey])).rows;
     return rows.length===0;
    }
    const original=await mint(tx,receipt,true);
    return original.itemInstanceId===drops[0].itemInstanceId&&original.grantId===drops[0].grantId&&
     drops[0].rewardId===original.copy.roll.slot&&drops[0].quantity===1;
   },
  };
  const store=createChestPostgresStoreV70(pool,ports,true,{grant:async(tx,receipt)=>{
   const result=await mint(tx,receipt,false);
   if(result.replayed)throw Error('world_boss_v103_unexpected_existing_mint');
   return {grantId:result.grantId,itemInstanceId:result.itemInstanceId};
  }});
  return createChestRewardSettlementV69(store,{secret:authority.chestSecret},true)(request);
 };
}
