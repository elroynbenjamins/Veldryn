/**
 * V84 PRIVATE EQ2 physical-escrow rehearsal, NOT a wearable player item.
 * Needs real EQ2 inventory/Bank/transfer integration and audited tier policy
 * before V70 can enable any gear-hit payouts. The writer is deliberately
 * unavailable in production and absent from mounted gameplay handlers.
 */
import {createHash} from 'node:crypto';
import type {ChestSqlV70} from './chest-postgres-store-v70';
import type {FrozenChestReceiptV69} from './chest-reward-settlement-v69';
import type {EarnedChestEntitlementV80} from './chest-earned-entitlement-v80';
import {planFrozenEarnedChestGearV82} from './chest-eq2-earned-bridge-v82';
import {
 previewRollWorldBossGatheringSlotV66,validateWorldBossGatheringRollV65,
 worldBossGatheringPiecesV64,type WorldBossGatheringBossV64,
 type WorldBossGatheringRandomV64,type WorldBossGatheringRolledGearV65,
} from '../combat/world-boss-gathering-loot-v64';
import {assertChestEq2PhysicalReadbackV71,
 type ChestEq2PhysicalReadbackV71} from './chest-equipment-bridge-v71';
export const WORLD_BOSS_EQ2_ESCROW_V84_RELEASED=false;
export const WORLD_BOSS_EQ2_ESCROW_V84_VERSION='world-boss-eq2-escrow-v84' as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SOURCE=/^world-boss:([0-9a-f-]{36}):([0-9a-f-]{36}):(donations_goal|three_attempts|community_damage_goal)$/;
const SHA=/^[a-f0-9]{64}$/;
const bosses:readonly WorldBossGatheringBossV64[]=['hollowroot','sunscar','frostmarch'];
interface ReceiptRow extends Record<string,unknown>{receipt:unknown;}
interface EntitlementRow extends Record<string,unknown>{
 source_key:string;account_id:string;family:string;tier:number;
 boss_id:string|null;proof_version:string;table_id:string;
 table_version:string;frozen_loot_table:unknown;
}
interface ManifestRow extends Record<string,unknown>{
 template_key:string;piece_id:string;set_id:string;boss_id:string;
 slot:string;tier:number;stat_family:string;enabled:boolean;
}
interface ItemRow extends Record<string,unknown>{
 id:string;source_key:string;account_id:string;event_id:string;
 drop_index:number;template_key:string;piece_id:string;set_id:string;
 boss_id:string;slot:string;tier:number;rarity:string;quality:number;
 roll:unknown;snapshot_hash:string;custody:string;
}
const receiptSql='SELECT receipt FROM private.chest_reward_receipts_v70 '+
 'WHERE source_key=$1 AND account_id=$2::uuid FOR UPDATE';
const earnedSql='SELECT source_key,account_id::text AS account_id,family,'+
 'tier,boss_id,proof_version,table_id,table_version,frozen_loot_table '+
 'FROM private.chest_earned_entitlements_v80 '+
 'WHERE source_key=$1 AND account_id=$2::uuid FOR UPDATE';
const manifestSql='SELECT template_key,piece_id,set_id,boss_id,slot,tier,'+
 'stat_family,enabled FROM private.world_boss_eq2_event_manifest_v84 '+
 'WHERE template_key=$1 FOR SHARE';
const itemSql='SELECT id::text AS id,source_key,account_id::text AS account_id,'+
 'event_id::text AS event_id,drop_index,template_key,piece_id,set_id,'+
 'boss_id,slot,tier,rarity,quality,roll,snapshot_hash,custody '+
 'FROM private.world_boss_eq2_unclaimed_items_v84 '+
 'WHERE source_key=$1 AND account_id=$2::uuid FOR SHARE';
function decoded<T>(v:unknown):T{
 return (typeof v==='string'?JSON.parse(v):v) as T;
}
function stable(value:unknown):string{
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
 const x=value as Record<string,unknown>;
 return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}';
}
function hash(roll:WorldBossGatheringRolledGearV65):string{
 return createHash('sha256').update(stable(roll)).digest('hex');
}
function gate(qaEnabled:boolean){
 if(!qaEnabled||WORLD_BOSS_EQ2_ESCROW_V84_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('world_boss_v84_unreleased');
}
export interface QuarantinedWorldBossItemV84{
 readonly itemInstanceId:string;
 readonly sourceKey:string;
 readonly accountId:string;
 readonly tier:number;
 readonly templateKey:string;
 readonly pieceId:string;
 readonly roll:WorldBossGatheringRolledGearV65;
 readonly custody:'quarantined_unclaimed';
 readonly claimEnabled:false;
 readonly wearable:false;
 readonly alreadyIssued:boolean;
}
/** Immutable physical row inside SAME V70 SQL transaction. The caller MUST
 * already own the V57 event lock and V70 account fence. The read-back does
 * not connect EQ2 to live inventory or make a chest claimable. */
export async function issueQuarantinedWorldBossGearV84(
 tx:ChestSqlV70,accountId:string,sourceKey:string,
 dropIndex:number,nextInt:WorldBossGatheringRandomV64,
 qaEnabled=false,
):Promise<QuarantinedWorldBossItemV84>{
 gate(qaEnabled);
 const match=SOURCE.exec(sourceKey);
 if(!tx||typeof tx.query!=='function'||!UUID.test(accountId)||
  !match||!UUID.test(match[1]!)||match[2]!==accountId||
  !Number.isInteger(dropIndex)||dropIndex<0||dropIndex>19||
  typeof nextInt!=='function')
  throw Error('world_boss_v84_untrusted_sql_source');
 const rr=(await tx.query<ReceiptRow>(receiptSql,[sourceKey,accountId])).rows;
 const ee=(await tx.query<EntitlementRow>(earnedSql,[sourceKey,accountId])).rows;
 if(rr.length!==1||ee.length!==1)
  throw Error('world_boss_v84_missing_locked_source');
 const receipt=decoded<FrozenChestReceiptV69>(rr[0]!.receipt);
 const er=ee[0]!;
 const earned:EarnedChestEntitlementV80={
  sourceKey:er.source_key,accountId:er.account_id,
  family:'world_boss',tier:Number(er.tier),
  bossId:er.boss_id,proofVersion:er.proof_version,
  tableId:er.table_id,tableVersion:er.table_version,
  frozenLootTable:decoded(er.frozen_loot_table),
  opened:false,paid:false,equipmentRolled:false,claimEnabled:false,
  alreadyEarned:true,
 };
 if(er.family!=='world_boss'||er.account_id!==accountId||
  er.source_key!==sourceKey||!er.boss_id||
  !bosses.includes(er.boss_id as WorldBossGatheringBossV64)||
  earned.tier<1||earned.tier>5)
  throw Error('world_boss_v84_unapproved_tier_or_boss');
 const approved=planFrozenEarnedChestGearV82(receipt,dropIndex,earned);
 if(!approved||approved.item.family!=='world_gathering'||
  approved.phase!=='unissued_t1_to_t5')
  throw Error('world_boss_v84_no_verified_gear_hit');
 const candidate=approved.item;
 const boss=er.boss_id as WorldBossGatheringBossV64;
 const known=worldBossGatheringPiecesV64(boss).find(x=>
  x.itemId===candidate.pieceId&&x.slot===candidate.selectedDropId&&
  x.setId===candidate.setId);
 if(!known||candidate.templateKey!==candidate.pieceId+':T'+earned.tier)
  throw Error('world_boss_v84_unregistered_canonical_piece');
 const manifest=(await tx.query<ManifestRow>(manifestSql,
  [candidate.templateKey])).rows;
 if(manifest.length!==1||manifest[0]!.enabled!==true||
  manifest[0]!.piece_id!==known.itemId||
  manifest[0]!.set_id!==known.setId||
  manifest[0]!.boss_id!==boss||
  manifest[0]!.slot!==known.slot||
  Number(manifest[0]!.tier)!==earned.tier||
  manifest[0]!.stat_family!=='gathering_speed_only')
  throw Error('world_boss_v84_manifest_not_verified');
 const physical=(row:ItemRow,alreadyIssued:boolean):
  QuarantinedWorldBossItemV84=>{
  const roll=decoded<WorldBossGatheringRolledGearV65>(row.roll);
  if(!row||!UUID.test(row.id)||row.id===accountId||
   row.source_key!==sourceKey||row.account_id!==accountId||
   row.event_id!==match[1]||Number(row.drop_index)!==dropIndex||
   row.template_key!==candidate.templateKey||
   row.piece_id!==candidate.pieceId||row.set_id!==candidate.setId||
   row.boss_id!==boss||row.slot!==candidate.slot||
   Number(row.tier)!==earned.tier||
   row.rarity!==roll.rarity||Number(row.quality)!==roll.quality||
   row.custody!=='quarantined_unclaimed'||
   !validateWorldBossGatheringRollV65(roll)||
   roll.itemId!==known.itemId||roll.slot!==known.slot||
   !SHA.test(row.snapshot_hash)||row.snapshot_hash!==hash(roll))
   throw Error('world_boss_v84_invalid_physical_item');
  const check:ChestEq2PhysicalReadbackV71={
   sourceKey,accountId,recipientCharacterId:null,
   storage:'account_unclaimed',itemInstanceId:row.id,
   pieceId:row.piece_id,templateKey:row.template_key,setId:row.set_id,
   slot:row.slot,tier:earned.tier as 1|2|3|4|5,
   rarity:roll.rarity,quality:roll.quality,
   exactStatSnapshotHash:row.snapshot_hash,
   exactItemReceiptVersion:'equipment-v2-event-world-v84',
   statFamily:'gathering_speed_only',grantSourceKey:sourceKey,
   sameTransactionPhysicalReadback:true,
  };
  assertChestEq2PhysicalReadbackV71(candidate,check);
  return {itemInstanceId:row.id,sourceKey,accountId,
   tier:earned.tier,templateKey:row.template_key,pieceId:row.piece_id,
   roll,custody:'quarantined_unclaimed',claimEnabled:false,
   wearable:false,alreadyIssued};
 };
 const previous=(await tx.query<ItemRow>(itemSql,[sourceKey,accountId])).rows;
 if(previous.length>1)throw Error('world_boss_v84_duplicate_physical_items');
 if(previous.length===1)return physical(previous[0]!,true);
 // Entropy is called only AFTER DB receipt, earned source, and manifest
 // match. Replays hit the early return above: no reroll/no extra instance.
 const roll=previewRollWorldBossGatheringSlotV66(
  boss,known.slot,nextInt);
 if(!validateWorldBossGatheringRollV65(roll)||roll.itemId!==known.itemId)
  throw Error('world_boss_v84_noncanonical_item_roll');
 const rows=(await tx.query<ItemRow>(
  'INSERT INTO private.world_boss_eq2_unclaimed_items_v84 '+
  '(source_key,account_id,event_id,drop_index,template_key,piece_id,'+
  'set_id,boss_id,slot,tier,rarity,quality,roll,snapshot_hash) '+
  'VALUES($1,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14) '+
  'RETURNING id::text AS id,source_key,account_id::text AS account_id,'+
  'event_id::text AS event_id,drop_index,template_key,piece_id,set_id,'+
  'boss_id,slot,tier,rarity,quality,roll,snapshot_hash,custody',
  [sourceKey,accountId,match[1],dropIndex,candidate.templateKey,
   candidate.pieceId,candidate.setId,boss,known.slot,earned.tier,
   roll.rarity,roll.quality,JSON.stringify(roll),hash(roll)])).rows;
 if(rows.length!==1)throw Error('world_boss_v84_missing_inserted_instance');
 return physical(rows[0]!,false);
}
