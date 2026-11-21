/**
 * HIDDEN / DESIGN-SOURCE ONLY. One cross-system read-only launch registry,
 * formed from the real Equipment Forge 169-item manifest and the real Combat
 * 2.0 12-family T1-T5 structural set definitions.
 *
 * Launch target is *all 48* T1-T4 tiered set families, not the historical
 * 15 compact Forge sets. Their 204 member IDs are PROPOSED, NOT REGISTERED
 * equipment items; there is no crafted recipe, owned instance, authorized
 * loot grant or active combat threshold for them yet.
 *
 * This file must NEVER be used as an inventory/equip, client UI, reward,
 * crafting, pricing or combat-effect source. A complete signed, persistent
 * member+recipe+drop+effect catalogue and owner review must replace drafts.
 */
import {V2_SERVER_PIECES,V2_SERVER_RECIPES} from '../../equipment/equipment-crafting-v2-manifest';
import {SET_FAMILIES_V2,TIERED_SETS_V2} from './set-catalog';
import type {GearSlotV2,RoleV2} from './build-contract';

export const EQUIPMENT_COMBAT_V2_LAUNCH_SCOPE='eq2-combat2-expanded-48-sets-review-v1' as const;
export type LaunchSetStageV2='UNISSUED_CONCEPT';
export type SetBonusMechanicV2=
  'defense'|'max_hp'|'attack'|'evasion'|'tenacity'|'haste'|'accuracy'|
  'crit_rate'|'crit_damage'|'penetration'|'hex_potency'|'ability_damage'|
  'basic_attack_damage'|'class_healing'|'ward'|'shield_strength'|
  'reflect_direct_hp_loss'|'original_hit_guard'|'party_shield_credited'|
  'basic_attack_tempo'|'magic_dot_credited'|'burst_window_direct_cast'|
  'original_heal_credited'|'ability_tempo_window'|'party_ward_credited'|
  'credited_heal_echo';

export interface LaunchConceptBonusV2 {
 readonly threshold:number;
 readonly mechanic:SetBonusMechanicV2;
 readonly runtime:'unimplemented';
 /** Not approved percentages or proc coefficient promises. */
 readonly coefficients:'unset_pending_benchmark';
}
const familyBonuses:Readonly<Record<string,readonly SetBonusMechanicV2[]>>={
 oathplate:['defense','original_hit_guard'],
 citadel:['max_hp','shield_strength','party_shield_credited'],
 bloodsteel:['attack','reflect_direct_hp_loss'],
 vigilhide:['evasion','tenacity'],
 quickstep:['haste','basic_attack_tempo'],
 horizon:['accuracy','crit_rate'],
 blackscript:['hex_potency','magic_dot_credited'],
 breakerforge:['penetration','ability_damage','burst_window_direct_cast'],
 brightweave:['class_healing','shield_strength'],
 stormthread:['haste','ability_tempo_window'],
 rootshield:['ward','shield_strength','party_ward_credited'],
 echohide:['class_healing','credited_heal_echo'],
};
export interface PlannedSetMemberV2 {
 readonly id:string;
 readonly setId:string;
 readonly familyId:string;
 readonly tier:'T1'|'T2'|'T3'|'T4';
 readonly role:RoleV2;
 readonly slot:GearSlotV2;
 readonly stage:LaunchSetStageV2;
 readonly craftable:false;
 readonly lootEligible:false;
 readonly equippable:false;
 readonly combatReady:false;
}
export interface PlannedTieredSetV2 {
 readonly id:string;
 readonly familyId:string;
 readonly tier:PlannedSetMemberV2['tier'];
 readonly role:RoleV2;
 readonly thresholds:readonly number[];
 readonly memberIds:readonly string[];
 readonly bonusConcepts:readonly LaunchConceptBonusV2[];
 readonly stage:LaunchSetStageV2;
 readonly combatReady:false;
}
const requireExact=<T>(value:T|undefined,reason:string):T=>{
 if(value===undefined)throw Error('equipment_combat_v2_launch_'+reason);
 return value;
};
/** Source-derived, fixed ID format: no external client or RNG input. */
function plannedMemberId(
 tier:PlannedSetMemberV2['tier'],familyId:string,slot:GearSlotV2,
):string{
 return 'EQ2_LAUNCH_'+tier+'_'+familyId.toUpperCase()+'_'+slot.toUpperCase();
}
export const PLANNED_T1_T4_SETS_V2:readonly PlannedTieredSetV2[]=
 TIERED_SETS_V2.filter(x=>x.tier!=='T5').map(set=>{
  const tier=set.tier as PlannedSetMemberV2['tier'];
  const effects=requireExact(familyBonuses[set.familyId],'missing_bonus_theme:'+set.familyId);
  if(effects.length!==set.thresholds.length)
   throw Error('equipment_combat_v2_launch_threshold_theme_mismatch:'+set.id);
  return Object.freeze({
   id:set.id,familyId:set.familyId,tier,role:set.role,
   thresholds:[...set.thresholds],
   memberIds:set.slots.map(slot=>plannedMemberId(tier,set.familyId,slot)),
   bonusConcepts:set.thresholds.map((threshold,i)=>({
    threshold,mechanic:effects[i],runtime:'unimplemented' as const,
    coefficients:'unset_pending_benchmark' as const,
   })),
   stage:'UNISSUED_CONCEPT' as const,combatReady:false as const,
  });
 });
export const PLANNED_T1_T4_MEMBERS_V2:readonly PlannedSetMemberV2[]=
 PLANNED_T1_T4_SETS_V2.flatMap(set=>{
  const structural=requireExact(TIERED_SETS_V2.find(s=>s.id===set.id),
   'missing_structural_set:'+set.id);
  return structural.slots.map(slot=>Object.freeze({
   id:plannedMemberId(set.tier,set.familyId,slot),
   setId:set.id,familyId:set.familyId,tier:set.tier,role:set.role,slot,
   stage:'UNISSUED_CONCEPT' as const,craftable:false as const,
   lootEligible:false as const,equippable:false as const,
   combatReady:false as const,
  }));
 });
export interface UnifiedSetLaunchAuditV2 {
 readonly policy:typeof EQUIPMENT_COMBAT_V2_LAUNCH_SCOPE;
 readonly launchTieredSetConcepts:number;
 readonly futureT5SetConcepts:number;
 readonly launchMemberConcepts:number;
 readonly launchBonusConcepts:number;
 readonly existingForgeItems:number;
 readonly existingForgeRecipes:number;
 readonly existingForgeNamedSets:number;
 readonly existingForgeSetMemberPieces:number;
 readonly existingForgeWithoutSet:number;
 readonly unresolvedCanonicalSetIds:number;
 readonly launchDraftItemIdCollisions:number;
 readonly status:'BLOCKED_UNTIL_ITEM_SOURCES_AND_EFFECTS';
}
/** Throws on drift; returns evidence only, never combat authorization. */
export function auditUnifiedSetLaunchV2():UnifiedSetLaunchAuditV2{
 const ids=new Set(V2_SERVER_PIECES.map(item=>item.id));
 if(ids.size!==V2_SERVER_PIECES.length)
  throw Error('equipment_combat_v2_launch_duplicate_forge_item');
 const recipes=new Set(V2_SERVER_RECIPES.map(recipe=>recipe.id));
 if(recipes.size!==V2_SERVER_RECIPES.length)
  throw Error('equipment_combat_v2_launch_duplicate_forge_recipe');
 if(SET_FAMILIES_V2.length!==Object.keys(familyBonuses).length||
   SET_FAMILIES_V2.some(s=>!Object.prototype.hasOwnProperty.call(familyBonuses,s.id)))
  throw Error('equipment_combat_v2_launch_family_theme_missing');
 const sets=new Set(PLANNED_T1_T4_SETS_V2.map(s=>s.id));
 const members=new Set(PLANNED_T1_T4_MEMBERS_V2.map(x=>x.id));
 if(sets.size!==PLANNED_T1_T4_SETS_V2.length||
   members.size!==PLANNED_T1_T4_MEMBERS_V2.length)
  throw Error('equipment_combat_v2_launch_duplicate_set_or_member');
 for(const set of PLANNED_T1_T4_SETS_V2){
  const structural=requireExact(TIERED_SETS_V2.find(s=>s.id===set.id),
   'unknown_structural_set:'+set.id);
  if(structural.tier!==set.tier||set.role!==structural.role||
     set.memberIds.length!==structural.slots.length||
     set.bonusConcepts.some((b,i)=>b.threshold!==set.thresholds[i]||
       b.runtime!=='unimplemented'||b.coefficients!=='unset_pending_benchmark'))
   throw Error('equipment_combat_v2_launch_set_mismatch:'+set.id);
  for(const memberId of set.memberIds){
   const item=requireExact(PLANNED_T1_T4_MEMBERS_V2.find(m=>m.id===memberId),
    'missing_member:'+memberId);
   if(item.setId!==set.id||item.tier!==set.tier||item.role!==set.role||
      !structural.slots.includes(item.slot)||item.combatReady||
      item.craftable||item.lootEligible||item.equippable)
    throw Error('equipment_combat_v2_launch_member_mismatch:'+memberId);
  }
 }
 const forgeSetPieces=V2_SERVER_PIECES.filter(item=>item.setId);
 const forgeIds=new Set(forgeSetPieces.map(item=>item.setId));
 const collision=PLANNED_T1_T4_MEMBERS_V2.filter(item=>ids.has(item.id)).length;
 return Object.freeze({
  policy:EQUIPMENT_COMBAT_V2_LAUNCH_SCOPE,
  launchTieredSetConcepts:PLANNED_T1_T4_SETS_V2.length,
  futureT5SetConcepts:TIERED_SETS_V2.length-PLANNED_T1_T4_SETS_V2.length,
  launchMemberConcepts:PLANNED_T1_T4_MEMBERS_V2.length,
  launchBonusConcepts:PLANNED_T1_T4_SETS_V2.reduce((n,s)=>n+s.bonusConcepts.length,0),
  existingForgeItems:V2_SERVER_PIECES.length,
  existingForgeRecipes:V2_SERVER_RECIPES.length,
  existingForgeNamedSets:forgeIds.size,
  existingForgeSetMemberPieces:forgeSetPieces.length,
  existingForgeWithoutSet:V2_SERVER_PIECES.length-forgeSetPieces.length,
  unresolvedCanonicalSetIds:PLANNED_T1_T4_SETS_V2.filter(s=>!forgeIds.has(s.id)).length,
  launchDraftItemIdCollisions:collision,
  status:'BLOCKED_UNTIL_ITEM_SOURCES_AND_EFFECTS' as const,
 });
}
