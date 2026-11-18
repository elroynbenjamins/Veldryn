/**
 * Equipment 2.0 source-owned percentage affix contract.
 *
 * No new RNG, rerolls, rarity counts, or invented stat ranges here.
 * Authoritative item snapshots and the final approved rarity/tier policy
 * MUST be supplied by the server; this module never trusts client values.
 *
 * Roll values and ranges are fractional: .025 = 2.5% or 2.5 percentage
 * points depending on the stat. Unimplemented effect types fail closed.
 */
import type {CombatantDefinition,CombatStats} from '../types';
import type {GearSlotV2} from './build-contract';
export type EquipmentAffixIdV2=
 'attack_pct'|'defense_pct'|'max_hp_pct'|'haste_pp'|
 'crit_rate_pp'|'crit_damage_pct'|'accuracy_pp'|'evasion_pp'|
 'penetration_pp'|'ward_pp'|'shield_strength_pct'|
 'class_healing_pct'|'hex_potency_pct';
export interface EquipmentAffixDefinitionV2{
 readonly id:EquipmentAffixIdV2;
 readonly unit:'relative_percent'|'percentage_points';
 readonly slots:readonly GearSlotV2[];
 readonly runtime:'supported'|'pending_engine_extension';
}
export const EQUIPMENT_AFFIXES_V2:Readonly<Record<EquipmentAffixIdV2,EquipmentAffixDefinitionV2>>={
 attack_pct:{id:'attack_pct',unit:'relative_percent',slots:['weapon','gloves','amulet','ring'],runtime:'supported'},
 defense_pct:{id:'defense_pct',unit:'relative_percent',slots:['helmet','chest','legs','boots','offhand'],runtime:'supported'},
 max_hp_pct:{id:'max_hp_pct',unit:'relative_percent',slots:['helmet','chest','legs','cape','ring'],runtime:'supported'},
 haste_pp:{id:'haste_pp',unit:'percentage_points',slots:['gloves','boots','cape','ring','weapon'],runtime:'supported'},
 crit_rate_pp:{id:'crit_rate_pp',unit:'percentage_points',slots:['weapon','gloves','amulet','ring'],runtime:'supported'},
 crit_damage_pct:{id:'crit_damage_pct',unit:'relative_percent',slots:['weapon','amulet','ring'],runtime:'supported'},
 accuracy_pp:{id:'accuracy_pp',unit:'percentage_points',slots:['weapon','gloves','amulet','cape'],runtime:'pending_engine_extension'},
 evasion_pp:{id:'evasion_pp',unit:'percentage_points',slots:['helmet','gloves','boots','cape'],runtime:'pending_engine_extension'},
 penetration_pp:{id:'penetration_pp',unit:'percentage_points',slots:['weapon','gloves','amulet','ring'],runtime:'pending_engine_extension'},
 ward_pp:{id:'ward_pp',unit:'percentage_points',slots:['helmet','chest','cape','offhand'],runtime:'pending_engine_extension'},
 shield_strength_pct:{id:'shield_strength_pct',unit:'relative_percent',slots:['chest','gloves','cape','offhand'],runtime:'pending_engine_extension'},
 class_healing_pct:{id:'class_healing_pct',unit:'relative_percent',slots:['weapon','chest','amulet','offhand'],runtime:'supported'},
 hex_potency_pct:{id:'hex_potency_pct',unit:'relative_percent',slots:['weapon','amulet','ring','cape'],runtime:'pending_engine_extension'},
};
export interface AuthoredRollLimitV2{readonly min:number;readonly max:number}
/** Must originate from finalized, server-owned Equipment 2.0 roll policy. */
export interface ServerAffixPolicyV2{
 readonly limits:Readonly<Record<EquipmentAffixIdV2,AuthoredRollLimitV2>>;
 readonly countsByTierRarity:Readonly<Record<string,number>>;
}
export interface TrustedPersistedAffixV2{
 readonly id:EquipmentAffixIdV2;
 readonly value:number;
}
export interface TrustedEquipmentItemAffixesV2{
 readonly instanceId:string;
 readonly slot:GearSlotV2;
 readonly tier:string;
 readonly rarity:string;
 readonly quality:number;
 readonly affixes:readonly TrustedPersistedAffixV2[];
}
const isObject=(o:unknown):o is Record<string,unknown>=>Boolean(o)&&typeof o==='object'&&!Array.isArray(o);
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const percent=(n:number)=>Math.round(n*100000)/100000;
const limit=(id:EquipmentAffixIdV2,policy:ServerAffixPolicyV2)=>{
 const range=policy.limits[id];
 if(!range||!finite(range.min)||!finite(range.max)||range.min<0||range.max>1||
   range.min>range.max)throw Error('combat_v2_missing_approved_roll_limit:'+id);
 return range;
};
export function validateTrustedAffixesV2(
 item:TrustedEquipmentItemAffixesV2,policy:ServerAffixPolicyV2,
):readonly TrustedPersistedAffixV2[]{
 if(!item.instanceId||!Number.isInteger(item.quality)||item.quality<0||item.quality>100||
    !/^T[1-5]$/.test(item.tier)||!item.rarity||!Array.isArray(item.affixes))
   throw Error('combat_v2_invalid_authoritative_item');
 const authored=policy.countsByTierRarity[item.tier+':'+item.rarity];
 if(!Number.isSafeInteger(authored)||authored<0||authored>5)
   throw Error('combat_v2_missing_approved_roll_count');
 if(item.affixes.length>authored)
   throw Error('combat_v2_too_many_affix_rolls');
 const ids=new Set<string>();
 return item.affixes.map(row=>{
   if(!isObject(row)||typeof row.id!=='string'||!Object.prototype.hasOwnProperty.call(EQUIPMENT_AFFIXES_V2,row.id))
     throw Error('combat_v2_unknown_affix');
   const id=row.id as EquipmentAffixIdV2,definition=EQUIPMENT_AFFIXES_V2[id];
   if(!definition.slots.includes(item.slot))throw Error('combat_v2_affix_slot_ineligible');
   if(ids.has(id))throw Error('combat_v2_duplicate_item_affix');
   ids.add(id);
   if(!finite(row.value))throw Error('combat_v2_invalid_roll_value');
   const bounds=limit(id,policy);
   if(row.value<bounds.min-1e-9||row.value>bounds.max+1e-9)
     throw Error('combat_v2_roll_outside_approved_range');
   // The values are copied; callers cannot mutate source item snapshots.
   return {id,value:percent(row.value)};
 });
}
export interface AppliedEquipmentAffixV2{
 readonly instanceId:string;readonly id:EquipmentAffixIdV2;
 readonly value:number;readonly unit:'relative_percent'|'percentage_points';
}
export interface CompiledEquipmentAffixesV2{
 readonly actor:CombatantDefinition;
 readonly sources:readonly AppliedEquipmentAffixV2[];
}
/**
 * Apply after approved tier/quality/rarity BASE gear stats have already been
 * included in actor.stats. Cannot double-apply: needs a trusted explicit tag.
 * This is an internal partial bridge, NOT the final Equipment 2.0 formula.
 */
export function compileTrustedEquipmentAffixesV2(
 actor:CombatantDefinition,
 items:readonly TrustedEquipmentItemAffixesV2[],
 policy:ServerAffixPolicyV2,
 serverEnabled=false,
):CompiledEquipmentAffixesV2{
 if(!serverEnabled)return {actor,sources:[]};
 if(actor.team!=='players'||!actor.combatV2||!actor.tags?.includes('combat-v2-gear-base-resolved')||
   actor.tags.includes('combat-v2-affixes-applied'))
   throw Error('combat_v2_affix_actor_not_ready');
 const ids=new Set<string>(),slots=new Set<GearSlotV2>();
 const all:AppliedEquipmentAffixV2[]=[];
 for(const item of items){
   if(ids.has(item.instanceId)||slots.has(item.slot))
     throw Error('combat_v2_affix_item_duplicate');
   ids.add(item.instanceId);slots.add(item.slot);
   for(const affix of validateTrustedAffixesV2(item,policy)){
     const definition=EQUIPMENT_AFFIXES_V2[affix.id];
     if(definition.runtime!=='supported')
       throw Error('combat_v2_affix_effect_unimplemented:'+affix.id);
     all.push({instanceId:item.instanceId,id:affix.id,value:affix.value,unit:definition.unit});
   }
 }
 // Sum percentage-point affixes additively; relative %-rolls multiply the
 // final authoritative base+equipment stats ONCE (not repeated per item).
 const get=(id:EquipmentAffixIdV2)=>all.filter(a=>a.id===id).reduce((n,a)=>n+a.value,0);
 const source=actor.stats;
 const stats:CombatStats={
   ...source,
   attackPower:percent(source.attackPower*(1+get('attack_pct'))),
   defense:percent(source.defense*(1+get('defense_pct'))),
   maxHp:percent(source.maxHp*(1+get('max_hp_pct'))),
   healingPower:percent(source.healingPower*(1+get('class_healing_pct'))),
   haste:Math.min(.75,percent(source.haste+get('haste_pp'))),
   critChance:Math.min(.85,percent(source.critChance+get('crit_rate_pp'))),
   critMultiplier:Math.min(3.5,percent(source.critMultiplier*(1+get('crit_damage_pct')))),
 };
 if(!Object.values(stats).every(finite)||stats.maxHp<=0||stats.attackPower<0||stats.defense<0)
   throw Error('combat_v2_affix_invalid_computed_stats');
 return {
   actor:{...actor,tags:[...actor.tags,'combat-v2-affixes-applied'],stats},
   sources:all,
 };
}
