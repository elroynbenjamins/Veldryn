/** Private V104 earned-source adapter for the hidden V103 opener.
 * Uses actual V73/V59 milestone SQL and requires canonical Combat2 V95
 * readback for attack-based rewards. Damage chest producer remains absent.
 * No HTTP, migration, payout or user-supplied progress. */
import type {ChestSqlV70} from './chest-postgres-store-v70';
import type {WorldBossV103SourcePorts} from './world-boss-chest-opening-v103';
import {assertWorldBossChestWriteOpenV73,readCanonicalWorldBossChestV73} from './world-boss-chest-pg-source-v73';
import {resolveWorldBossChestEvidenceV59,type WorldBossCanonicalChestReadV59} from '../combat/world-boss-chest-proof-v59';
import {previewVerifiedWorldBossChestsV58,type WorldBossChestKindV58} from '../combat/world-boss-chests-v58';
import {reviewWorldBossRewardHandoffV95,type WorldBossV95SettledAttemptReview} from '../combat/world-boss-v95-reward-handoff-review';
import {worldBossChestLootTableV96} from '../combat/world-boss-chest-policy-v96';
import {gatheringSnapshotDigestV100} from '../combat/world-boss-gathering-snapshot-v100';
export const WORLD_BOSS_CHEST_SOURCE_V104_LIVE=false as const;
const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const SOURCE=new RegExp('^world-boss:('+UUID+'):('+UUID+'):(donations_goal|three_attempts|community_damage_goal|damage:[1-9][0-9]*)$');
function identity(accountId:string,key:string){
 const m=SOURCE.exec(key);
 if(!m||m[2]!==accountId)throw Error('world_boss_v104_invalid_identity');
 if(m[3].startsWith('damage:'))throw Error('world_boss_v104_damage_producer_not_ready');
 return {eventId:m[1],kind:m[3] as WorldBossChestKindV58};
}
export function createWorldBossChestSourceV104(deps:{
 /** Must read actual canonical V2 settlement and replay receipts from this
  * pinned SQL connection; V28 legacy proof alone is not V2 evidence. */
 readVerifiedCanonicalAttempts?:(tx:ChestSqlV70,eventId:string,accountId:string)=>Promise<readonly WorldBossV95SettledAttemptReview[]>;
},qaEnabled=false):WorldBossV103SourcePorts{
 const gate=()=>{if(!qaEnabled||WORLD_BOSS_CHEST_SOURCE_V104_LIVE||process.env.NODE_ENV==='production')throw Error('world_boss_v104_unreleased');};
 const legacyGuard=async(tx:ChestSqlV70,key:string,accountId:string)=>{
  // Refuse to reinterpret previously earned or paid legacy sources.
  // Missing legacy tables are a migration blocker rather than a silent pass.
  for(const name of ['world_boss_chest_receipts_v61','chest_earned_entitlements_v80']){
   const rows=(await tx.query('SELECT source_key FROM private.'+name+' WHERE source_key=$1 AND account_id=$2::uuid FOR SHARE',[key,accountId])).rows;
   if(rows.length)throw Error('world_boss_v104_legacy_source_requires_reconciliation');
  }
 };
 const read=async(tx:ChestSqlV70,accountId:string,key:string)=>{
  gate();const {eventId,kind}=identity(accountId,key);
  await legacyGuard(tx,key,accountId);
  const canonical=await readCanonicalWorldBossChestV73(tx,eventId,accountId);
  if(canonical.eventId!==eventId||canonical.accountId!==accountId)throw Error('world_boss_v104_foreign_evidence');
  const earned=previewVerifiedWorldBossChestsV58(resolveWorldBossChestEvidenceV59(canonical)).find(x=>x.chestId===key&&x.kind===kind);
  if(!earned)throw Error('world_boss_v104_unearned_chest');
  if(kind!=='donations_goal'){
   if(!deps.readVerifiedCanonicalAttempts)throw Error('world_boss_v104_canonical_attempts_not_ready');
   const verified=await deps.readVerifiedCanonicalAttempts(tx,eventId,accountId);
   // Independent privileged readback defines exact receipt set; do not
   // turn a local combat rehearsal into a paid attack.
   const hashes=new Set(verified.map(x=>gatheringSnapshotDigestV100(x)));
   reviewWorldBossRewardHandoffV95(canonical,verified,row=>hashes.has(gatheringSnapshotDigestV100(row)));
  }
  return {sourceKey:key,accountId,earned:true as const,proofVersion:'world-boss-v104-canonical-milestone',
   recipientCharacterId:null,equipmentDeliveryMode:'account_unclaimed' as const,lootTable:worldBossChestLootTableV96(earned.bossId,kind)};
 };
 return {
  assertSourceWriteOpen:async(tx,accountId,key)=>{gate();identity(accountId,key);await assertWorldBossChestWriteOpenV73(tx,accountId,key);},
  readCanonicalSource:read,
  verifyLockedSource:async(tx,accountId,key)=>{
   gate();identity(accountId,key);await legacyGuard(tx,key,accountId);
   // Replay: immutable V70 receipt is historical; avoid requiring current
   // contribution evidence after legitimate event closure. The surrounding
   // opener separately verifies every physical grant and the V57 fence.
   const rows=(await tx.query<{receipt:unknown}>('SELECT receipt FROM private.chest_reward_receipts_v70 WHERE source_key=$1 AND account_id=$2::uuid FOR UPDATE',[key,accountId])).rows;
   if(rows.length===1){
    const raw=rows[0].receipt;
    const r=(typeof raw==='string'?JSON.parse(raw):raw) as {accountId:string;sourceKey:string;proofVersion:string;tableVersion:string;committed:boolean};
    return r.accountId===accountId&&r.sourceKey===key&&r.committed===true&&r.proofVersion==='world-boss-v104-canonical-milestone'&&
     /^world_boss_v98_unified_(hollowroot|sunscar|frostmarch)$/.test(r.tableVersion);
   }
   if(rows.length!==0)return false;
   return (await read(tx,accountId,key)).earned===true;
  },
  isOwnedCharacter:async(tx,accountId,id)=>{
   gate();return (await tx.query('SELECT id FROM public.characters WHERE id=$1::uuid AND account_id=$2::uuid FOR KEY SHARE',[id,accountId])).rows.length===1;
  },
 };
}
