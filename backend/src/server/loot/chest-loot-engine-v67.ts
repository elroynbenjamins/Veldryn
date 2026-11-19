/**
 * Hidden V67 generic server-only loot-table core.
 *
 * New chest families are DATA (a versioned table with guarantees, independent
 * drop groups, weights and duplicate rules), not another resolver class.
 * The caller MUST prove an earned source and load a committed receipt FIRST,
 * before generating entropy or checking canonical account inventory. This
 * pure engine never creates entitlements, pays currency, or mints items.
 *
 * For older Party Event/World Boss chests, callers pass the existing V1
 * HMAC hit/piece rolls. This preserves all 12/16/24% (plus difficulty)
 * and 1% probabilities and the exact prior piece ordering/modulo behavior.
 */
import {createHmac} from 'node:crypto';

export const CHEST_LOOT_ENGINE_V67_RELEASED=false;
export const CHEST_ROLL_MODULUS_V67=10000 as const;
export const CHEST_LOOT_ENGINE_V67_VERSION='chest-loot-v67' as const;
const SAFE_ID=/^[a-z][a-z0-9:_-]{1,100}$/;
const SAFE_KEY=/^[a-z0-9:_-]{20,220}$/;
const isBps=(n:unknown):n is number=>
 typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=10000;
const safeQuantity=(n:unknown):n is number=>
 typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=2147483647;
export type ChestDropTypeV67=
 'equipment'|'material'|'consumable'|'pet'|'companion'|'cosmetic'|'currency';
export type ChestDuplicatePolicyV67=
 'allow_duplicates'|'prefer_unowned'|'unique_only';
export interface ChestRewardAmountV67{
 readonly id:string;readonly quantity:number;
}
export interface ChestWeightedEntryV67{
 readonly id:string;readonly weight:number;
}
export interface ChestDropGroupV67{
 readonly id:string;
 readonly type:ChestDropTypeV67;
 readonly chanceBps:number;
 readonly duplicatePolicy:ChestDuplicatePolicyV67;
 readonly entries:readonly ChestWeightedEntryV67[];
}
export interface ChestLootTableV67{
 readonly tableId:string;
 /** Version MUST change when odds, guarantees or entry weights change. */
 readonly version:string;
 readonly guarantees:readonly ChestRewardAmountV67[];
 readonly groups:readonly ChestDropGroupV67[];
}
export interface ChestGroupRollV67{
 readonly groupId:string;
 /** 0..9,999, from a trusted server, never the player. */
 readonly hitRoll:number;
 readonly selectionRoll:number;
}
export interface ChestGroupResultV67{
 readonly groupId:string;
 readonly type:ChestDropTypeV67;
 readonly chanceBps:number;
 readonly hit:boolean;
 /** A successful hit may still be empty under unique_only when exhausted. */
 readonly entryId:string|null;
}
export interface ChestLootResolutionV67{
 readonly tableId:string;
 readonly tableVersion:string;
 readonly guarantees:readonly ChestRewardAmountV67[];
 readonly groups:readonly ChestGroupResultV67[];
 readonly drops:readonly {groupId:string;type:ChestDropTypeV67;entryId:string}[];
}
/** Validated and recursively frozen configuration for server-authored tables. */
export function defineChestLootTableV67(raw:ChestLootTableV67):ChestLootTableV67{
 if(!raw||typeof raw.tableId!=='string'||!SAFE_ID.test(raw.tableId)||
  typeof raw.version!=='string'||!SAFE_ID.test(raw.version)||
  !Array.isArray(raw.guarantees)||!Array.isArray(raw.groups)||
  raw.guarantees.length>40||raw.groups.length>20)
  throw Error('chest_v67_invalid_table');
 const seenGuarantees=new Set<string>();
 const guarantees=raw.guarantees.map(g=>{
  if(!g||typeof g.id!=='string'||!SAFE_ID.test(g.id)||
   !safeQuantity(g.quantity)||seenGuarantees.has(g.id))
   throw Error('chest_v67_invalid_guarantee');
  seenGuarantees.add(g.id);
  return Object.freeze({id:g.id,quantity:g.quantity});
 });
 const groupIds=new Set<string>();
 const types:readonly ChestDropTypeV67[]=[
  'equipment','material','consumable','pet','companion','cosmetic','currency',
 ];
 const policies:readonly ChestDuplicatePolicyV67[]=[
  'allow_duplicates','prefer_unowned','unique_only',
 ];
 const groups=raw.groups.map(g=>{
  if(!g||typeof g.id!=='string'||!SAFE_ID.test(g.id)||
   groupIds.has(g.id)||!types.includes(g.type)||
   !policies.includes(g.duplicatePolicy)||!isBps(g.chanceBps)||
   !Array.isArray(g.entries)||g.entries.length<1||g.entries.length>1000)
   throw Error('chest_v67_invalid_group');
  groupIds.add(g.id);
  let weightSum=0;
  const ids=new Set<string>();
  const entries=g.entries.map(e=>{
   if(!e||typeof e.id!=='string'||!SAFE_ID.test(e.id)||
    ids.has(e.id)||!Number.isSafeInteger(e.weight)||e.weight<1||
    e.weight>CHEST_ROLL_MODULUS_V67)
    throw Error('chest_v67_invalid_entry');
   ids.add(e.id);weightSum+=e.weight;
   if(weightSum>CHEST_ROLL_MODULUS_V67)
    throw Error('chest_v67_weight_budget_exceeded');
   return Object.freeze({id:e.id,weight:e.weight});
  });
  return Object.freeze({
   id:g.id,type:g.type,chanceBps:g.chanceBps,
   duplicatePolicy:g.duplicatePolicy,
   entries:Object.freeze(entries),
  });
 });
 return Object.freeze({
  tableId:raw.tableId,version:raw.version,
  guarantees:Object.freeze(guarantees),groups:Object.freeze(groups),
 });
}
function checkedRoll(n:unknown):n is number{
 return typeof n==='number'&&Number.isInteger(n)&&
  n>=0&&n<CHEST_ROLL_MODULUS_V67;
}
/** Pure, reproducible resolution; drop-table data is the only variable. */
export function resolveChestLootV67(table:ChestLootTableV67,input:{
 readonly rolls:readonly ChestGroupRollV67[];
 /** DB-derived account-wide inventory keys; never accept from client. */
 readonly ownedDropIds:readonly string[];
}):ChestLootResolutionV67{
 // Revalidation prevents mutable caller-created, forged or corrupt tables.
 const def=defineChestLootTableV67(table);
 if(!input||!Array.isArray(input.rolls)||
  !Array.isArray(input.ownedDropIds)||
  input.rolls.length!==def.groups.length||
  input.ownedDropIds.some(x=>typeof x!=='string'||!SAFE_ID.test(x)))
  throw Error('chest_v67_invalid_server_context');
 const byId=new Map<string,ChestGroupRollV67>();
 for(const roll of input.rolls){
  if(!roll||typeof roll.groupId!=='string'||byId.has(roll.groupId)||
   !def.groups.some(g=>g.id===roll.groupId)||
   !checkedRoll(roll.hitRoll)||!checkedRoll(roll.selectionRoll))
   throw Error('chest_v67_invalid_roll');
  byId.set(roll.groupId,roll);
 }
 const owned=new Set(input.ownedDropIds);
 const groups=def.groups.map(group=>{
  const roll=byId.get(group.id);
  if(!roll)throw Error('chest_v67_missing_group_roll');
  const hit=roll.hitRoll<group.chanceBps;
  if(!hit)return {
   groupId:group.id,type:group.type,chanceBps:group.chanceBps,
   hit:false,entryId:null,
  };
  let pool=group.entries;
  if(group.duplicatePolicy!=='allow_duplicates'){
   const missing=group.entries.filter(e=>!owned.has(e.id));
   if(missing.length)pool=missing;
   else if(group.duplicatePolicy==='unique_only')pool=[];
  }
  let entryId:string|null=null;
  if(pool.length){
   const total=pool.reduce((sum,item)=>sum+item.weight,0);
   const selection=roll.selectionRoll%total;
   let cursor=0;
   for(const item of pool){
    cursor+=item.weight;
    if(selection<cursor){entryId=item.id;break;}
   }
   if(entryId===null)throw Error('chest_v67_invalid_weight_selection');
  }
  return {
   groupId:group.id,type:group.type,chanceBps:group.chanceBps,
   hit:true,entryId,
  };
 });
 return {
  tableId:def.tableId,tableVersion:def.version,
  guarantees:def.guarantees,groups,
  drops:groups.filter(g=>g.entryId!==null).map(g=>({
   groupId:g.groupId,type:g.type,entryId:g.entryId!,
  })),
 };
}
const WORD_RANGE=0x100000000;
/** Optional independent RNG for *future* table-defined chest families.
 * Do not substitute for old V1 HMAC when opening an existing source. */
export function deriveChestGroupRollsV67(input:{
 readonly table:ChestLootTableV67;
 readonly sourceKey:string;
 readonly secret:Uint8Array;
}):readonly ChestGroupRollV67[]{
 const table=defineChestLootTableV67(input?.table);
 if(!(input?.secret instanceof Uint8Array)||
  input.secret.byteLength<32||input.secret.byteLength>512||
  typeof input.sourceKey!=='string'||!SAFE_KEY.test(input.sourceKey))
  throw Error('chest_v67_invalid_server_entropy_contract');
 const bound=Math.floor(WORD_RANGE/CHEST_ROLL_MODULUS_V67)*
  CHEST_ROLL_MODULUS_V67;
 const draw=(groupId:string,label:'hit'|'select'):number=>{
  for(let counter=0;counter<64;counter++){
   const word=createHmac('sha256',Buffer.from(input.secret) as unknown as string)
    .update('veldryn:chest-loot:v67\0')
    .update(table.tableId).update('\0')
    .update(table.version).update('\0')
    .update(input.sourceKey).update('\0')
    .update(groupId).update('\0')
    .update(label).update('\0')
    .update(String(counter)).digest().readUInt32BE(0);
   if(word<bound)return word%CHEST_ROLL_MODULUS_V67;
  }
  throw Error('chest_v67_entropy_unavailable');
 };
 return table.groups.map(group=>({
  groupId:group.id,hitRoll:draw(group.id,'hit'),
  selectionRoll:draw(group.id,'select'),
 }));
}
