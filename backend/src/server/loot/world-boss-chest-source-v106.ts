/** Hidden persisted damage source handoff. Milestones still use V104.
 * Opening a chest must never generate new earning rolls. Caller retains
 * V57/V70 event/account locks and supplies canonical V2 receipt readback
 * and historical entropy secrets from private server storage. */
import type {ChestSqlV70} from './chest-postgres-store-v70';
import type {WorldBossV103SourcePorts} from './world-boss-chest-opening-v103';
import {createWorldBossChestSourceV104} from './world-boss-chest-source-v104';
import {assertWorldBossChestWriteOpenV73} from './world-boss-chest-pg-source-v73';
import {readEarnedWorldBossDamageSourcesV105,type DamageChestStoreInputV105} from './world-boss-damage-chest-store-v105';
import {worldBossChestLootTableV96} from '../combat/world-boss-chest-policy-v96';
import {gatheringSnapshotDigestV100} from '../combat/world-boss-gathering-snapshot-v100';
export const WORLD_BOSS_CHEST_SOURCE_V106_LIVE=false as const;
const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const DAMAGE=new RegExp('^world-boss:('+UUID+'):('+UUID+'):damage:([1-9][0-9]{0,3})$');
const PROOF='world-boss-v106-persisted-damage' as const;
function identity(accountId:string,key:string){
 const m=DAMAGE.exec(key);
 if(!m||m[2]!==accountId||Number(m[3])>1000)throw Error('world_boss_v106_invalid_damage_source');
 return {eventId:m[1],accountId};
}
const damage=(key:string)=>typeof key==='string'&&key.includes(':damage:');
export function createWorldBossChestSourceV106(deps:Pick<DamageChestStoreInputV105,'readVerifiedCanonicalAttempts'|'readVersionedSecret'>,qaEnabled=false):WorldBossV103SourcePorts{
 const gate=()=>{if(!qaEnabled||WORLD_BOSS_CHEST_SOURCE_V106_LIVE||process.env.NODE_ENV==='production')throw Error('world_boss_v106_unreleased');};
 const milestone=createWorldBossChestSourceV104({readVerifiedCanonicalAttempts:deps.readVerifiedCanonicalAttempts},qaEnabled);
 const readDamage=async(tx:ChestSqlV70,accountId:string,key:string)=>{
  gate();const id=identity(accountId,key);
  const proof=await readEarnedWorldBossDamageSourcesV105(tx,{accountId:id.accountId,eventId:id.eventId,readVerifiedCanonicalAttempts:deps.readVerifiedCanonicalAttempts,readVersionedSecret:deps.readVersionedSecret},true);
  if(!proof.earnedSourceKeys.includes(key))throw Error('world_boss_v106_unearned_damage_chest');
  return {sourceKey:key,accountId,earned:true as const,proofVersion:PROOF,
   recipientCharacterId:null,equipmentDeliveryMode:'account_unclaimed' as const,
   lootTable:worldBossChestLootTableV96(proof.policy.bossId,'personal_damage')};
 };
 return {
  assertSourceWriteOpen:async(tx,accountId,key)=>{
   gate();
   if(!damage(key))return milestone.assertSourceWriteOpen!(tx,accountId,key);
   const id=identity(accountId,key);
   // V73 accepts milestone-shaped keys; the gate checks only the exact
   // event and account. This does not claim or infer donation eligibility.
   await assertWorldBossChestWriteOpenV73(tx,accountId,'world-boss:'+id.eventId+':'+accountId+':donations_goal');
  },
  readCanonicalSource:async(tx,accountId,key)=>{
   gate();return damage(key)?readDamage(tx,accountId,key):milestone.readCanonicalSource(tx,accountId,key);
  },
  verifyLockedSource:async(tx,accountId,key)=>{
   gate();if(!damage(key))return milestone.verifyLockedSource(tx,accountId,key);
   const proof=await readDamage(tx,accountId,key);
   const rows=(await tx.query<{receipt:unknown}>('SELECT receipt FROM private.chest_reward_receipts_v70 WHERE source_key=$1 AND account_id=$2::uuid FOR UPDATE',[key,accountId])).rows;
   if(rows.length===0)return true;
   if(rows.length!==1)return false;
   const raw=rows[0].receipt;
   const r=(typeof raw==='string'?JSON.parse(raw):raw) as {accountId:string;sourceKey:string;proofVersion:string;tableId:string;tableVersion:string;committed:boolean;guaranteed:unknown};
   return r.accountId===accountId&&r.sourceKey===key&&r.committed===true&&r.proofVersion===PROOF&&
    r.tableId===proof.lootTable.tableId&&r.tableVersion===proof.lootTable.version&&
    gatheringSnapshotDigestV100(r.guaranteed)===gatheringSnapshotDigestV100(proof.lootTable.guarantees);
  },
  isOwnedCharacter:async(tx,accountId,id)=>{gate();return milestone.isOwnedCharacter(tx,accountId,id);},
 };
}
