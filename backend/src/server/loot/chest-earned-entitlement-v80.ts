/**
 * V80 HIDDEN: Save a verified earned chest BEFORE the eventual Equipment 2.0
 * issuer/Inbox/Gold ports are approved. EARNING IS NOT OPENING.
 *
 * The caller owns a READ COMMITTED (World Boss) / SERIALIZABLE (Party) SQL
 * transaction and MUST derive accountId from real Auth. All operations use
 * the same pinned client, V57 preflight and V70 account lock. This module
 * never rolls RNG, credits a wallet, sends Inbox or issues equipment.
 */
import type {ChestSqlV70} from './chest-postgres-store-v70';
import type {TrustedChestSourceV69} from './chest-reward-settlement-v69';
import type {ChestEq2ServerContextV71} from './chest-equipment-bridge-v71';
import {defineChestLootTableV67} from './chest-loot-engine-v67';

export const CHEST_EARNED_ENTITLEMENT_V80_RELEASED=false;
export const CHEST_EARNED_ENTITLEMENT_V80_VERSION='chest-earned-v80' as const;
const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const UID=new RegExp('^'+UUID+'$');
const WB=new RegExp('^world-boss:('+UUID+'):('+UUID+'):'+
 '(donations_goal|three_attempts|community_damage_goal)$');
const PE=new RegExp('^party-event:([0-9]{13}):('+UUID+'):'+
 '(participation|preparation|finale)$');
const BOSSES=['hollowroot','sunscar','frostmarch'] as const;
type Family='party_event'|'world_boss';
interface Identity{readonly sourceKey:string;readonly accountId:string;readonly family:Family;}
export interface EarnedChestEntitlementV80{
 readonly sourceKey:string;
 readonly accountId:string;
 readonly family:Family;
 readonly tier:number;
 readonly bossId:string|null;
 readonly proofVersion:string;
 readonly tableId:string;
 readonly tableVersion:string;
 readonly frozenLootTable:ReturnType<typeof defineChestLootTableV67>;
 readonly opened:false;
 readonly paid:false;
 readonly equipmentRolled:false;
 readonly claimEnabled:false;
 readonly alreadyEarned:boolean;
}
export interface ChestEarnedReadPortsV80 {
 /** World Boss: lock V17 event and assert V57 erasure BEFORE account lock. */
 assertWorldBossWriteOpen?(tx:ChestSqlV70,accountId:string,
  sourceKey:string):Promise<void>;
 /** Auth-bound private proof, not a client projection. V73 for World Boss,
  * V77 + future pinned V61 SQL proof loader for Party Events. */
 readCanonicalSource(tx:ChestSqlV70,accountId:string,sourceKey:string):
  Promise<TrustedChestSourceV69>;
 /** T1-T9 frozen from authoritative server equipment eligibility. No
  * player-configured tier or guessed boss may be read here. */
 readApprovedEquipmentContext(tx:ChestSqlV70,source:TrustedChestSourceV69):
  Promise<ChestEq2ServerContextV71>;
}
function identity(accountId:string,sourceKey:string):Identity{
 if(typeof accountId!=='string'||!UID.test(accountId)||
  typeof sourceKey!=='string')
  throw Error('chest_v80_untrusted_authenticated_identity');
 const world=WB.exec(sourceKey);
 if(world&&world[2]===accountId)return {accountId,sourceKey,family:'world_boss'};
 const party=PE.exec(sourceKey);
 if(party&&party[2]===accountId){
  const week=Number(party[1]);
  if(!Number.isSafeInteger(week)||week%86400000!==0||
   new Date(week).getUTCDay()!==1)
   throw Error('chest_v80_invalid_week');
  return {accountId,sourceKey,family:'party_event'};
 }
 throw Error('chest_v80_cross_account_or_invalid_source');
}
interface EntitlementRow{
 source_key:string;account_id:string;family:Family;tier:number;
 boss_id:string|null;proof_version:string;table_id:string;
 table_version:string;frozen_loot_table:unknown;
}
function mapRow(row:EntitlementRow,expected:Identity,alreadyEarned:boolean):
 EarnedChestEntitlementV80{
 if(!row||row.source_key!==expected.sourceKey||
  row.account_id!==expected.accountId||
  row.family!==expected.family||
  !Number.isSafeInteger(row.tier)||row.tier<1||row.tier>9||
  (row.family==='party_event'&&row.boss_id!==null)||
  (row.family==='world_boss'&&
   !BOSSES.includes(row.boss_id as typeof BOSSES[number]))||
  typeof row.proof_version!=='string'||row.proof_version.length<3||
  row.table_id!==(row.family==='world_boss'?
   'world_boss_chest':'party_event_chest')||
  typeof row.table_version!=='string')
  throw Error('chest_v80_corrupt_frozen_entitlement');
 const table=defineChestLootTableV67(
  (typeof row.frozen_loot_table==='string'?
   JSON.parse(row.frozen_loot_table):row.frozen_loot_table) as
   ReturnType<typeof defineChestLootTableV67>);
 if(row.table_id!==table.tableId||row.table_version!==table.version||
  (row.family==='world_boss'&&
   !row.table_version.startsWith('world_boss_v58_'+row.boss_id+'_')))
  throw Error('chest_v80_frozen_table_mismatch');
 return {sourceKey:expected.sourceKey,accountId:expected.accountId,
  family:row.family,tier:row.tier,bossId:row.boss_id,
  proofVersion:row.proof_version,tableId:row.table_id,
  tableVersion:row.table_version,frozenLootTable:table,
  opened:false,paid:false,equipmentRolled:false,
  claimEnabled:false,alreadyEarned};
}
const readSql='SELECT source_key,account_id::text AS account_id,'+
 'family,tier,boss_id,proof_version,table_id,table_version,frozen_loot_table '+
 'FROM private.chest_earned_entitlements_v80 '+
 'WHERE source_key=$1 AND account_id=$2::uuid FOR UPDATE';
export async function recordEarnedChestEntitlementV80(
 input:{readonly authenticatedAccountId:string;readonly sourceKey:string},
 tx:ChestSqlV70,ports:ChestEarnedReadPortsV80,
 qaEnabled=false,
):Promise<EarnedChestEntitlementV80>{
 if(!qaEnabled||CHEST_EARNED_ENTITLEMENT_V80_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('chest_v80_unreleased');
 const id=identity(input?.authenticatedAccountId,input?.sourceKey);
 if(!tx||typeof tx.query!=='function'||!ports||
  typeof ports.readCanonicalSource!=='function'||
  typeof ports.readApprovedEquipmentContext!=='function')
  throw Error('chest_v80_unverified_sql_ports');
 if(id.family==='world_boss'){
  if(typeof ports.assertWorldBossWriteOpen!=='function')
   throw Error('chest_v80_v57_erasure_gate_required');
  await ports.assertWorldBossWriteOpen(tx,id.accountId,id.sourceKey);
 }
 // This is exactly the V70 per-account receipt inventory row; no per-source
 // mutex that would allow two chests to select the same missing piece later.
 await tx.query(
  'INSERT INTO private.chest_account_fence_v70(account_id) '+
  'SELECT id FROM auth.users WHERE id=$1::uuid ON CONFLICT DO NOTHING',
  [id.accountId]);
 const locks=(await tx.query<{account_id:string}>(
  'SELECT account_id::text AS account_id FROM '+
  'private.chest_account_fence_v70 WHERE account_id=$1::uuid FOR UPDATE',
  [id.accountId])).rows;
 if(locks.length!==1||locks[0]!.account_id!==id.accountId)
  throw Error('chest_v80_account_unregistered');
 const existing=(await tx.query<EntitlementRow>(
  readSql,[id.sourceKey,id.accountId])).rows;
 if(existing.length>1)throw Error('chest_v80_duplicate_source_rows');
 if(existing.length===1)return mapRow(existing[0]!,id,true);
 const source=await ports.readCanonicalSource(tx,id.accountId,id.sourceKey);
 if(!source||source.earned!==true||
  source.accountId!==id.accountId||source.sourceKey!==id.sourceKey)
  throw Error('chest_v80_unearned_source');
 const table=defineChestLootTableV67(source.lootTable);
 if(table.tableId!==(id.family==='world_boss'?
  'world_boss_chest':'party_event_chest'))
  throw Error('chest_v80_wrong_source_table');
 const context=await ports.readApprovedEquipmentContext(tx,source);
 if(!context||!Number.isSafeInteger(context.tier)||
  context.tier<1||context.tier>9)
  throw Error('chest_v80_unverified_tier');
 const boss=id.family==='world_boss'?context.bossId:null;
 if((id.family==='world_boss'&&
   (!boss||!BOSSES.includes(boss)|| 
    !table.version.startsWith('world_boss_v58_'+boss+'_')))||
  (id.family==='party_event'&&context.bossId!==undefined))
  throw Error('chest_v80_boss_or_table_mismatch');
 if(typeof source.proofVersion!=='string'||
  source.proofVersion.length<3||source.proofVersion.length>100)
  throw Error('chest_v80_untrusted_proof_version');
 await tx.query(
  'INSERT INTO private.chest_earned_entitlements_v80 '+
  '(source_key,account_id,family,tier,boss_id,proof_version,'+
  'table_id,table_version,frozen_loot_table) '+
  'VALUES($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT DO NOTHING',
  [id.sourceKey,id.accountId,id.family,context.tier,boss,
   source.proofVersion,table.tableId,table.version,JSON.stringify(table)]);
 const rows=(await tx.query<EntitlementRow>(
  readSql,[id.sourceKey,id.accountId])).rows;
 if(rows.length!==1)throw Error('chest_v80_failed_entitlement_readback');
 const result=mapRow(rows[0]!,id,false);
 if(result.tier!==context.tier||result.bossId!==boss||
  result.tableVersion!==table.version||
  JSON.stringify(result.frozenLootTable)!==JSON.stringify(table))
  throw Error('chest_v80_conflicting_frozen_source');
 return result;
}
