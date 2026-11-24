/**
 * Equipment 2.0 source-owned percentage affix contract.
 *
 * No new RNG, rerolls, rarity counts, or invented stat ranges here.
 * Authoritative item snapshots and the final approved rarity/tier policy
 * MUST be supplied by the server; this module never trusts client values.
 *
 * Roll values and ranges are fractional: .025 = 2.5% or 2.5 percentage
 * points depending on the stat. Advanced effects require explicit server caps.
 */
import type {CombatantDefinition,CombatStats,CombatV2EquipmentEffects} from '../types';
import type {GearSlotV2} from './build-contract';
import {v2ServerPiece,v2ServerRecipeAndPiece} from '../../equipment/equipment-crafting-v2-manifest';
import {v2ServerCreateExactTemplate,v2ServerExactTemplateConsistent,
 type V2ExactEquipmentTemplate} from '../../equipment/equipment-crafting-v2-instances';
import {V2_SERVER_AFFIX_RANGES,type V2Affix} from '../../equipment/equipment-crafting-v2-rolls';
import type {V2DraftItem} from '../../equipment/equipment-crafting-v2-transaction';
export type EquipmentAffixIdV2=
 'attack_pct'|'defense_pct'|'max_hp_pct'|'haste_pp'|
 'crit_rate_pp'|'crit_damage_pct'|'accuracy_pp'|'evasion_pp'|
 'penetration_pp'|'ward_pp'|'shield_strength_pct'|
 'class_healing_pct'|'hex_potency_pct'|'tenacity_pp'|'ability_damage_pct'|'forge_healing_power_pct';
/** Exact ORIGINAL Forge roll identities only. Potency stays unmapped until
 * its unambiguous mechanic is authored; NEVER convert it to Hex/Pure Damage. */
export const ORIGINAL_FORGE_COMBAT_AFFIX_MAP_V2:
 Readonly<Partial<Record<V2Affix,EquipmentAffixIdV2>>>={
 armor:'defense_pct',maxHp:'max_hp_pct',ward:'ward_pp',
 critRate:'crit_rate_pp',critDamage:'crit_damage_pct',
 haste:'haste_pp',penetration:'penetration_pp',accuracy:'accuracy_pp',
 tenacity:'tenacity_pp',abilityDamage:'ability_damage_pct',
 healingPower:'forge_healing_power_pct',
};

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
 accuracy_pp:{id:'accuracy_pp',unit:'percentage_points',slots:['weapon','gloves','amulet','cape'],runtime:'supported'},
 evasion_pp:{id:'evasion_pp',unit:'percentage_points',slots:['helmet','gloves','boots','cape'],runtime:'supported'},
 penetration_pp:{id:'penetration_pp',unit:'percentage_points',slots:['weapon','gloves','amulet','ring'],runtime:'supported'},
 ward_pp:{id:'ward_pp',unit:'percentage_points',slots:['helmet','chest','cape','offhand'],runtime:'supported'},
 shield_strength_pct:{id:'shield_strength_pct',unit:'relative_percent',slots:['chest','gloves','cape','offhand'],runtime:'supported'},
 class_healing_pct:{id:'class_healing_pct',unit:'relative_percent',slots:['weapon','chest','amulet','offhand'],runtime:'supported'},
 hex_potency_pct:{id:'hex_potency_pct',unit:'relative_percent',slots:['weapon','amulet','ring','cape'],runtime:'supported'},
  // Original Forge 2.0 roll identities; generic Potency is deliberately NOT mapped.
  tenacity_pp:{id:'tenacity_pp',unit:'percentage_points',slots:['helmet','chest','legs','boots','offhand'],runtime:'supported'},
  ability_damage_pct:{id:'ability_damage_pct',unit:'relative_percent',slots:['weapon','gloves','amulet','ring'],runtime:'supported'},
  forge_healing_power_pct:{id:'forge_healing_power_pct',unit:'relative_percent',slots:['weapon','chest','amulet','offhand'],runtime:'supported'},
};
export interface AuthoredRollLimitV2{readonly min:number;readonly max:number}
/** Must originate from finalized, server-owned Equipment 2.0 roll policy. */
type OriginalCombatAffixIdV2=Exclude<EquipmentAffixIdV2,
 'tenacity_pp'|'ability_damage_pct'|'forge_healing_power_pct'>;
type ExtraForgeAffixIdV2=Exclude<EquipmentAffixIdV2,OriginalCombatAffixIdV2>;
export interface ServerAffixPolicyV2{
 // Keep the thirteen original Combat 2.0 policy entries mandatory, while
 // requiring a NEW Forge range only for an equipped source channel.
 readonly limits:Readonly<Record<OriginalCombatAffixIdV2,AuthoredRollLimitV2>&
   Partial<Record<ExtraForgeAffixIdV2,AuthoredRollLimitV2>>>;
 readonly countsByTierRarity:Readonly<Record<string,number>>;
 /** Approved server caps, NEVER arbitrary transport defaults. */
 readonly maxFinalHaste:number;
 readonly maxFinalCritChance:number;
 readonly maxFinalCritMultiplier:number;
 /** Mandatory server-owned totals when any advanced affix is equipped.
  * Do not substitute invented caps or silently truncate earned rolls. */
 readonly maxAdvancedEffects?:Readonly<CombatV2EquipmentEffects>;
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
function validateAffixesWithSourcePolicy(
 item:TrustedEquipmentItemAffixesV2,policy:ServerAffixPolicyV2,
 originalForgeVerified=false,
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
   // The ORIGINAL Forge roller selects from role weights and only favors
   // slot-specific stats 70% of the time. A legitimate original item can
   // therefore have a valid affix outside synthetic Combat slot preferences.
   // Only the separately verified exact-mint entrypoint below can request
   // this source-specific compatibility. Generic Combat snapshots cannot.
   if(!originalForgeVerified&&!definition.slots.includes(item.slot))
     throw Error('combat_v2_affix_slot_ineligible');
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
/** Generic synthetic/other-item validation retains strict slot policy. */
export function validateTrustedAffixesV2(
 item:TrustedEquipmentItemAffixesV2,policy:ServerAffixPolicyV2,
):readonly TrustedPersistedAffixV2[]{
 return validateAffixesWithSourcePolicy(item,policy,false);
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
 * This is an opt-in advanced-effect bridge, not the final rarity/quality formula.
 */
function compileAffixesWithSourcePolicy(
 actor:CombatantDefinition,
 items:readonly TrustedEquipmentItemAffixesV2[],
 policy:ServerAffixPolicyV2,
 serverEnabled=false,
 originalForgeVerified=false,
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
   for(const affix of validateAffixesWithSourcePolicy(
    item,policy,originalForgeVerified)){
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
 if(!finite(policy.maxFinalHaste)||!finite(policy.maxFinalCritChance)||
   !finite(policy.maxFinalCritMultiplier)||policy.maxFinalHaste<0||
   policy.maxFinalCritChance<0||policy.maxFinalCritMultiplier<1)
   throw Error('combat_v2_missing_approved_stat_caps');
 const stats:CombatStats={
   ...source,
   attackPower:percent(source.attackPower*(1+get('attack_pct'))),
   defense:percent(source.defense*(1+get('defense_pct'))),
   maxHp:percent(source.maxHp*(1+get('max_hp_pct'))),
   healingPower:percent(source.healingPower*(1+get('class_healing_pct'))),
   haste:percent(source.haste+get('haste_pp')),
   critChance:percent(source.critChance+get('crit_rate_pp')),
   critMultiplier:percent(source.critMultiplier*(1+get('crit_damage_pct'))),
 };
 const advanced:CombatV2EquipmentEffects={
   accuracyPp:percent(get('accuracy_pp')),
   evasionPp:percent(get('evasion_pp')),
   penetrationPp:percent(get('penetration_pp')),
   wardPp:percent(get('ward_pp')),
   shieldStrengthPct:percent(get('shield_strength_pct')),
   hexPotencyPct:percent(get('hex_potency_pct')),
   tenacityPp:percent(get('tenacity_pp')),
   abilityDamagePct:percent(get('ability_damage_pct')),
   forgeHealingPowerPct:percent(get('forge_healing_power_pct')),
 };
 const hasAdvanced=Object.values(advanced).some(value=>value>0);
 if(hasAdvanced){
   const caps=policy.maxAdvancedEffects;
   if(!caps)throw Error('combat_v2_missing_approved_advanced_affix_caps');
   for(const key of Object.keys(advanced) as (keyof CombatV2EquipmentEffects)[]){
     const actual=advanced[key]??0;
     // Old synthetic policies are permitted to omit NEW channels only
     // when those channels are exactly zero. An active Forge effect
     // absolutely requires an explicit server-authored cap.
     if(actual===0)continue;
     const cap=caps[key];
     if(!finite(cap)||cap<0||cap>1)
       throw Error('combat_v2_invalid_approved_advanced_affix_cap:'+key);
     if(actual>cap+1e-9)
       throw Error('combat_v2_advanced_affix_exceeds_approved_cap:'+key);
   }
 }
 if(stats.haste>policy.maxFinalHaste||stats.critChance>policy.maxFinalCritChance||
   stats.critMultiplier>policy.maxFinalCritMultiplier)
   throw Error('combat_v2_affix_exceeds_approved_stat_caps');
 if(!Object.values(stats).every(finite)||stats.maxHp<=0||stats.attackPower<0||stats.defense<0)
   throw Error('combat_v2_affix_invalid_computed_stats');
 return {
   actor:{...actor,tags:[...actor.tags,'combat-v2-affixes-applied'],stats,
     combatV2:{...actor.combatV2,
       equipmentEffects:advanced,
     }},
   sources:all,
 };
}

/** Standard trusted Combat 2.0 items still use original strict slot caps.
 * No generic/legacy item may request the original-Forge exception. */
export function compileTrustedEquipmentAffixesV2(
 actor:CombatantDefinition,items:readonly TrustedEquipmentItemAffixesV2[],
 policy:ServerAffixPolicyV2,serverEnabled=false,
):CompiledEquipmentAffixesV2{
 return compileAffixesWithSourcePolicy(actor,items,policy,serverEnabled,false);
}
export interface OriginalFrozenForgeAffixMintV2{
 readonly mint:V2DraftItem;
 readonly slot:GearSlotV2;
}
/** HIDDEN test-only. Call ONLY AFTER verifying the complete, current original
 * Forge ledger, claims and equipped custody under an authenticated account
 * transaction. This function checks original source recipe/roll again, then
 * permits ONLY its genuine stat/slot identity via the already implemented
 * Combat mechanic. It cannot authorize equipment or grant any items.
 *
 * Generic Potency remains rejected; forged role/slot/piece/rolls are denied.
 */
export function compileOriginalFrozenForgeAffixesV2(
 actor:CombatantDefinition,
 mints:readonly OriginalFrozenForgeAffixMintV2[],
 policy:ServerAffixPolicyV2,serverEnabled=false,
):CompiledEquipmentAffixesV2{
 if(!serverEnabled)throw Error('combat_v2_forge_original_slot_gate_off');
 if(!Array.isArray(mints)||mints.length===0||mints.length>10)
  throw Error('combat_v2_forge_original_mint_count_invalid');
 const rows:TrustedEquipmentItemAffixesV2[]=mints.map(({mint,slot})=>{
  if(!mint||!mint.exactItem||!mint.outcome||
   mint.exactItem.slot!==slot||mint.exactItem.pieceId!==mint.outcome.pieceId||
   !v2ServerExactTemplateConsistent(mint.exactItem))
   throw Error('combat_v2_forge_exact_mint_or_slot_invalid');
  const piece=v2ServerPiece(mint.exactItem.pieceId);
  const recipe=v2ServerRecipeAndPiece(mint.outcome.recipeId);
  if(!piece||!recipe||recipe.piece!==piece||
   piece.slot!==slot||piece.tier!==mint.exactItem.tier||
   JSON.stringify(v2ServerCreateExactTemplate(piece,mint.outcome))!==
    JSON.stringify(mint.exactItem))
   throw Error('combat_v2_forge_original_recipe_or_roll_mismatch');
  const item:V2ExactEquipmentTemplate=mint.exactItem;
  return {instanceId:mint.id,slot:item.slot,tier:'T'+item.tier,
   rarity:item.rarity,quality:item.quality,affixes:item.affixes.map((roll:V2ExactEquipmentTemplate['affixes'][number])=>{
    const mapped=ORIGINAL_FORGE_COMBAT_AFFIX_MAP_V2[roll.stat];
    if(!mapped)throw Error('combat_v2_forge_original_affix_unimplemented:'+roll.stat);
    const range=V2_SERVER_AFFIX_RANGES[roll.stat][item.tier-1];
    if(!range||roll.percent<range[0]-1e-7||
       roll.percent>range[1]+1e-7)
     throw Error('combat_v2_forge_original_affix_range_mismatch');
    return {id:mapped,value:Math.round(roll.percent/100*1e6)/1e6};
   })};
 });
 // Canonical original Forge slot roulette is authenticated separately by
 // its immutable mint/claim provenance. No client-provided "Forge" tag,
 // policy exception or generic affix snapshot can reach this branch.
 return compileAffixesWithSourcePolicy(actor,rows,policy,true,true);
}
