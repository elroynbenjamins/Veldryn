/**
 * Equipment 2.0 authoritative 1- or 2-stat base-gear resolver.
 *
 * This compiler intentionally requires a class-only actor. Supplying an
 * existing live actor whose stats already include legacy equipment is a hard
 * error, preventing accidental double-counting during the 2.0 rollout.
 *
 * Tier base stats, rarity and quality multipliers are all supplied by the
 * approved SERVER catalogue. This module does not invent stat scaling,
 * quality curves, item rolls, rewards or character power contribution.
 */
import type {CombatantDefinition,CombatStats} from '../types';
import type {ClassIdV2,GearSlotV2,BuildValidationV2} from './build-contract';
import {CLASS_NAMES_V2} from './skill-catalog';

export type EquipmentBaseStatKeyV2=keyof CombatStats;
export interface EquipmentBaseDefinitionV2{
  readonly itemId:string;
  readonly tier:'T1'|'T2'|'T3'|'T4'|'T5';
  readonly slot:GearSlotV2;
  /**
   * Unscaled authored base stats only. A frozen crafting receipt that already
   * contains its own rarity/quality multipliers CANNOT enter this resolver.
   * Omitted marker is allowed for historical synthetic fixtures, not proof
   * that a live crafted item is safe to import.
   */
  readonly statSource?:'authored-unscaled-v2'|'craft-frozen-pre-scaled-v2';
  readonly rarityAndQualityAlreadyApplied?:boolean;
  readonly sourceSchema?:string;
  /** Already includes the tier, not any rarity/quality bonuses. */
  readonly primaryStats:Readonly<Partial<Record<EquipmentBaseStatKeyV2,number>>>;
}
export interface StoredEquipmentInstanceV2{
  readonly id:string;
  readonly itemId:string;
  readonly tier:string;
  readonly rarity:string;
  readonly quality:number;
  readonly ownerCharacterId:string;
}
export interface ApprovedEquipmentBasePolicyV2{
  /** Explicit approved multiplier for each rarity; do not infer from labels. */
  readonly rarityMultipliers:Readonly<Record<string,number>>;
  /** Server-owned 0..100 quality curve, guaranteed pure and deterministic. */
  readonly qualityMultiplier:(quality:number)=>number;
  /** Final ceilings after *all* equipment passes, no silent clamping. */
  readonly ceilings:Readonly<Record<EquipmentBaseStatKeyV2,number>>;
}
export interface BaseEquipmentSourceV2{
  readonly instanceId:string;
  readonly itemId:string;
  readonly tier:string;
  readonly rarity:string;
  readonly quality:number;
  readonly scaledStats:Readonly<Partial<Record<EquipmentBaseStatKeyV2,number>>>;
}
export interface BaseEquipmentCompilationV2{
  readonly actor:CombatantDefinition;
  readonly sources:readonly BaseEquipmentSourceV2[];
  readonly classLevelStats:CombatStats;
  readonly equipmentStats:Readonly<Partial<CombatStats>>;
}
const keys:readonly EquipmentBaseStatKeyV2[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion','critChance','critMultiplier','haste',
];
const round=(n:number)=>Math.round(n*1e6)/1e6;
const validNumber=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
function allowedStats(record:Readonly<Partial<Record<EquipmentBaseStatKeyV2,number>>>):EquipmentBaseStatKeyV2[]{
  if(!record||typeof record!=='object'||Array.isArray(record))
    throw Error('combat_v2_invalid_item_primary_stats');
  const selected=Object.keys(record);
  if(selected.length<1||selected.length>2||selected.some(k=>!keys.includes(k as EquipmentBaseStatKeyV2))||
    selected.some(k=>!validNumber(record[k as EquipmentBaseStatKeyV2])||
      (record[k as EquipmentBaseStatKeyV2]??0)<=0))
    throw Error('combat_v2_item_must_have_one_or_two_positive_base_stats');
  return selected as EquipmentBaseStatKeyV2[];
}
function assertActor(actor:CombatantDefinition,classId:ClassIdV2){
  if(actor.team!=='players'||!actor.combatV2||
    !actor.tags?.includes('combat-v2-class-base-only')||
    actor.tags.includes('combat-v2-gear-base-resolved')||
    (actor.classId!==CLASS_NAMES_V2[classId]&&actor.classId!==classId))
    throw Error('combat_v2_class_only_actor_required');
  if(keys.some(key=>!validNumber(actor.stats[key])||actor.stats[key]<0)||
    actor.stats.maxHp<=0||actor.stats.critMultiplier<1)
    throw Error('combat_v2_invalid_class_stat_baseline');
}
/** Pure additive base-stats pass; does not mutate an actor or instance. */
export function resolveVerifiedEquipmentBaseV2(
 actor:CombatantDefinition,
 classId:ClassIdV2,
 characterId:string,
 requestedBySlot:Readonly<Partial<Record<GearSlotV2,string>>>,
 validated:BuildValidationV2,
 instances:Readonly<Record<string,StoredEquipmentInstanceV2>>,
 definitions:Readonly<Record<string,EquipmentBaseDefinitionV2>>,
 policy:ApprovedEquipmentBasePolicyV2,
 serverEnabled=false,
):BaseEquipmentCompilationV2{
 if(!serverEnabled)return {actor,sources:[],classLevelStats:actor.stats,equipmentStats:{}};
 assertActor(actor,classId);
 if(!validated.valid)throw Error('combat_v2_invalid_build_for_gear_base');
 if(!characterId)throw Error('combat_v2_invalid_verified_character');
 for(const key of keys){
  const ceiling=policy.ceilings[key];
  if(!validNumber(ceiling)||ceiling<=0)
    throw Error('combat_v2_missing_approved_base_stat_ceiling:'+key);
 }
 const totals:Partial<CombatStats>={};
 const used=new Set<string>();
 const sources:BaseEquipmentSourceV2[]=[];
 for(const [slot,id] of Object.entries(requestedBySlot) as [GearSlotV2,string][]){
  if(!id||used.has(id))throw Error('combat_v2_duplicate_equipped_instance');
  used.add(id);
  const entry=instances[id];
  if(!entry||entry.id!==id||entry.ownerCharacterId!==characterId)
    throw Error('combat_v2_base_gear_instance_not_owned');
  const def=definitions[entry.itemId];
  if(!def||def.itemId!==entry.itemId||def.slot!==slot||
    def.tier!==entry.tier||!/^T[1-5]$/.test(def.tier))
    throw Error('combat_v2_invalid_authoritative_base_definition');
  // Equipment/Crafting 2.0 may persist FINAL rolled base stats, which this
  // authoritative resolver would otherwise multiply a second time.
  // Never infer the raw authored base from a pre-scaled crafting receipt.
  if(def.statSource==='craft-frozen-pre-scaled-v2'||
     def.rarityAndQualityAlreadyApplied===true||
     def.sourceSchema==='eq2-cv2-exact-source-v1')
    throw Error('combat_v2_crafting_pre_scaled_item_requires_exact_adapter');
  if(def.statSource!==undefined&&def.statSource!=='authored-unscaled-v2'||
     def.rarityAndQualityAlreadyApplied!==undefined&&
       def.rarityAndQualityAlreadyApplied!==false||
     def.sourceSchema!==undefined&&def.sourceSchema!=='authored-unscaled-v2')
    throw Error('combat_v2_unapproved_equipment_source_provenance');

  if(!Number.isSafeInteger(entry.quality)||entry.quality<0||entry.quality>100)
    throw Error('combat_v2_invalid_item_quality');
  const rarity=policy.rarityMultipliers[entry.rarity];
  const quality=policy.qualityMultiplier(entry.quality);
  if(!validNumber(rarity)||rarity<=0||rarity>10||!validNumber(quality)||quality<=0||quality>10)
    throw Error('combat_v2_missing_approved_rarity_quality_multiplier');
  const statKeys=allowedStats(def.primaryStats);
  const scaled:Partial<CombatStats>={};
  for(const key of statKeys){
    const increase=round(def.primaryStats[key]!*rarity*quality);
    if(!validNumber(increase)||increase<=0)
      throw Error('combat_v2_invalid_scaled_equipment_stat');
    scaled[key]=increase;
    totals[key]=round((totals[key]??0)+increase);
  }
  sources.push({
    instanceId:id,itemId:entry.itemId,tier:entry.tier,rarity:entry.rarity,
    quality:entry.quality,scaledStats:scaled,
  });
 }
 const stats={...actor.stats};
 for(const key of keys){
   const value=round(actor.stats[key]+(totals[key]??0));
   if(!validNumber(value)||value>policy.ceilings[key])
     throw Error('combat_v2_base_equipment_exceeds_approved_stat_ceiling:'+key);
   stats[key]=value;
 }
 return {
  actor:{...actor,stats,tags:[...actor.tags!,'combat-v2-gear-base-resolved']},
  sources,classLevelStats:{...actor.stats},equipmentStats:totals,
 };
}
