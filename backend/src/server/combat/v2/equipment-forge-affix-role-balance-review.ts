/**
 * HIDDEN SOURCE REVIEW ONLY. Not a loot table, balancing approval, mint,
 * Combat Power calculator, trusted item, signed policy or player-grant path.
 * 
 * Role identity and cap-sensitive 9/10-slot roll concentration analysis using
 * the actual 169 Forge templates, original T1-T4 ranges, Combat's original
 * affix eligibility, and exact Wave 7 weighted subset math.
 */
import {V2_SERVER_PIECES,V2_SERVER_RECIPES}
 from '../../equipment/equipment-crafting-v2-manifest';
import {V2_SERVER_AFFIX_RANGES,V2_SERVER_RARITY_BANDS,
 type V2Affix,type V2Role,type V2Slot,type V2Tier}
 from '../../equipment/equipment-crafting-v2-rolls';
import {CLASS_ROLES_V2,GEAR_SLOTS_V2,type ClassIdV2}
 from './build-contract';
import {reviewProposedForgeRoleSlotAffixesV2}
 from './equipment-forge-affix-pool-reconciliation-review';
import {
 makeForgeAffixSensitivityFixtureV2,reviewExactWeightedAffixDrawV2,
 type ForgeSensitivityScenarioV2,
} from './equipment-forge-affix-probability-review';
import {inspectForgeShadowPolicyRowsV2}
 from './equipment-forge-affix-newmint-shadow';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2}
 from './equipment-frozen-forge-bridge';
import {EQUIPMENT_AFFIXES_V2}
 from './equipment-affixes';
import {auditRealForgeTenSlotsV2}
 from './equipment-frozen-forge-slot-audit';

export type ForgeRoleAffixFitV2='role_core'|'shared_utility'|'role_crossover';
/**
 * THESE are explicit review labels for the current 11 mapped source stats,
 * NOT an engine identity constraint or an approved cross-role loot choice.
 */
const roleCore:Readonly<Record<V2Role,readonly V2Affix[]>>={
 tank:['armor','maxHp','ward','tenacity'],
 damage:['critRate','critDamage','haste','penetration','accuracy','abilityDamage'],
 support:['healingPower','ward','maxHp','tenacity','haste'],
};
const roleUtility:Readonly<Record<V2Role,readonly V2Affix[]>>={
 tank:['haste','accuracy'],
 damage:['maxHp','armor','ward','tenacity'],
 support:['armor','accuracy'],
};
export function classifyForgeRoleAffixFitV2(
 role:V2Role,stat:V2Affix,
):ForgeRoleAffixFitV2{
 if(!['tank','damage','support'].includes(role)||
  !Object.prototype.hasOwnProperty.call(V2_SERVER_AFFIX_RANGES,stat)||
  stat==='potency'||!EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[stat])
  throw Error('eq2_affix_role_review_unknown_or_ambiguous_stat');
 return roleCore[role].includes(stat)?'role_core':
  roleUtility[role].includes(stat)?'shared_utility':'role_crossover';
}
export interface ForgeRoleSlotFitRowV2{
 readonly role:V2Role;
 readonly slot:V2Slot;
 readonly sourceExisting:readonly V2Affix[];
 readonly proposed:readonly V2Affix[];
 readonly roleCore:readonly V2Affix[];
 readonly utility:readonly V2Affix[];
 readonly crossRole:readonly V2Affix[];
 readonly missingRoleCore:boolean;
 readonly highTierMythicForcesCrossover:boolean;
 readonly action:'review_safe_candidate_fit'|'review_defensive_slot_identity'|'requires_role_slot_reauthoring';
 readonly approvalRequired:true;
}
export interface ForgeClassTierStackingV2{
 readonly classId:ClassIdV2;
 readonly role:V2Role;
 readonly tier:V2Tier;
 readonly requiredPhysicalPieces:number;
 readonly actualSourcePieceIds:readonly string[];
 readonly sourceGripsWithNoOffhand:boolean;
 readonly forcedCrossoverHighTierMythicSlots:readonly V2Slot[];
 /** Per-stat mathematical upper bound, not player cap or forecast. */
 readonly looseStatStackMaximumPercent:Readonly<Partial<Record<V2Affix,number>>>;
 readonly alreadyApprovedCaps:false;
}
export interface ForgeRoleScenarioRiskV2{
 readonly scenario:ForgeSensitivityScenarioV2;
 readonly role:V2Role;
 readonly maxSlotSingleRollCrossoverChance:number;
 readonly maxSlotHighTierMythicCrossoverChance:number;
 readonly firstRollCrossoverWeightShares:readonly {
  slot:V2Slot;probability:number;
 }[];
 readonly notAnObservedPlayerDistribution:true;
 readonly weightsApproved:false;
}
export interface ForgeRoleFitRiskReviewV2{
 readonly scope:'EQ2_ROLE_FIT_AND_MAX_STACK_REVIEW_NOT_A_LOOT_POLICY';
 readonly originalSourceTemplates:169;
 readonly sourceRecipes:338;
 readonly roleSlotRows:30;
 readonly physicalClassTierCells:340;
 readonly expectedClassTierLoadouts:36;
 readonly originalNoOffhandReservations:20;
 readonly roleSlotsWithoutCore:number;
 readonly roleSlotsForcingHighTierMythicCrossover:number;
 readonly classTierPhysicalCellsForcingHighTierMythicCrossover:number;
 readonly roleSlotMatrix:readonly ForgeRoleSlotFitRowV2[];
 readonly realSourceLoadouts:readonly ForgeClassTierStackingV2[];
 readonly sensitivity:readonly ForgeRoleScenarioRiskV2[];
 readonly originalSourceAffixValuesUntouched:true;
 readonly noExecutableSetBonuses:true;
 readonly noCPWeightsApproved:true;
 readonly noMintPermission:true;
 readonly releaseReady:false;
}
const tiers=[1,2,3,4] as const;
const roles=['tank','damage','support'] as const;
const round=(x:number)=>Math.round(x*1e10)/1e10;
const fail=(reason:string):never=>{throw Error('eq2_affix_role_review_'+reason);};
export function reviewForgeRoleFitAndStackingV2():ForgeRoleFitRiskReviewV2{
 const audit=auditRealForgeTenSlotsV2();
 if(V2_SERVER_PIECES.length!==169||V2_SERVER_RECIPES.length!==338||
    audit.cells.length!==360||audit.cellsReservedByTwoHandOrPairedWeapon!==20||
    audit.cellsMissingRequiredTemplates!==0)
  fail('source_catalogue_changed');
 const roleSlotMatrix=roles.flatMap(role=>GEAR_SLOTS_V2.map(slot=>{
  const authored=reviewProposedForgeRoleSlotAffixesV2(role,slot);
  const fit=authored.proposedCombatCompatible.map(stat=>({
   stat,fit:classifyForgeRoleAffixFitV2(role,stat),
  }));
  const core=fit.filter(x=>x.fit==='role_core').map(x=>x.stat);
  const utility=fit.filter(x=>x.fit==='shared_utility').map(x=>x.stat);
  const crossover=fit.filter(x=>x.fit==='role_crossover').map(x=>x.stat);
  if(fit.length<3||core.length+utility.length+crossover.length!==fit.length||
   fit.some(x=>!EQUIPMENT_AFFIXES_V2[
    EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[x.stat]!].slots.includes(slot)))
   fail('source_candidate_slot_unreviewable');
  // T3/4 Mythic requires three DISTINCT source stat IDs. If fewer than
  // three core+utility, an off-role roll is unavoidable, regardless of weights.
  const forced=core.length+utility.length<3;
  return {
   role,slot,sourceExisting:authored.originallyCombatCompatible,
   proposed:authored.proposedCombatCompatible,
   roleCore:core,utility,crossRole:crossover,
   missingRoleCore:core.length===0,
   highTierMythicForcesCrossover:forced,
   action:forced?'requires_role_slot_reauthoring' as const:
    core.length===0?'review_defensive_slot_identity' as const:
    'review_safe_candidate_fit' as const,
   approvalRequired:true as const,
  };
 }));
 if(roleSlotMatrix.length!==30)fail('role_slot_matrix_missing');
 const realSourceLoadouts:ForgeClassTierStackingV2[]=[];
 let forcedPhysicalCells=0;
 for(const classId of Object.keys(CLASS_ROLES_V2) as ClassIdV2[]){
  const role=CLASS_ROLES_V2[classId];
  for(const tier of tiers){
   const cells=audit.cells.filter(c=>
    c.classId===classId&&c.tier===tier&&c.sourceCoverage==='present');
   if(cells.length!==9&&cells.length!==10)
    fail('unexpected_actual_physical_equipment_count');
   const forcedSlots=cells.filter(c=>tier>=3&&
    roleSlotMatrix.find(p=>p.role===role&&p.slot===c.slot)!
     .highTierMythicForcesCrossover).map(c=>c.slot);
   forcedPhysicalCells+=forcedSlots.length;
   // The bound treats every physical slot as independently able to hit
   // its maximum for one named stat. Distinct-within-one-item is preserved
   // by taking one occurrence of a given stat per actual physical slot.
   const statBounds:Partial<Record<V2Affix,number>>={};
   for(const cell of cells){
    const policy=roleSlotMatrix.find(x=>x.role===role&&x.slot===cell.slot);
    if(!policy)throw Error('eq2_affix_role_review_missing_class_slot_policy');
    for(const stat of policy.proposed){
     const max=V2_SERVER_AFFIX_RANGES[stat][tier-1][1];
     statBounds[stat]=(statBounds[stat]??0)+max;
    }
   }
   const sourceIds=cells.map(c=>c.eligibleSourcePieceIds[0]);
   if(sourceIds.some(id=>!V2_SERVER_PIECES.some(p=>p.id===id)))
    fail('source_copy_template_missing');
   const noOffhand=cells.length===9;
   realSourceLoadouts.push({
    classId,role,tier,
    requiredPhysicalPieces:cells.length,
    actualSourcePieceIds:sourceIds,
    sourceGripsWithNoOffhand:noOffhand,
    forcedCrossoverHighTierMythicSlots:forcedSlots,
    looseStatStackMaximumPercent:Object.fromEntries(
     Object.entries(statBounds).map(([stat,pct])=>[stat,round(pct)])),
    alreadyApprovedCaps:false,
   });
  }
 }
 if(realSourceLoadouts.length!==36||
  realSourceLoadouts.reduce((n,r)=>n+r.requiredPhysicalPieces,0)!==340||
  realSourceLoadouts.filter(r=>r.sourceGripsWithNoOffhand).length!==20)
  fail('class_tier_readiness_mismatch');
 const sensitivity:ForgeRoleScenarioRiskV2[]=[];
 for(const scenario of [
  'EQUAL_WEIGHT_SENSITIVITY_ONLY',
  'ORIGINAL_ROLE_CONTINUITY_SENSITIVITY_ONLY',
 ] as const){
  const fixture=makeForgeAffixSensitivityFixtureV2(scenario);
  const validated=inspectForgeShadowPolicyRowsV2(fixture);
  for(const role of roles){
   const rows=validated.filter(r=>r.role===role);
   if(rows.length!==10)fail('scenario_role_slot_count_mismatch');
   const firstRollCrossoverWeightShares=rows.map(row=>{
    const result=reviewExactWeightedAffixDrawV2(row.candidates,1);
    return {slot:row.slot,probability:round(result.firstDraw.filter(x=>
     classifyForgeRoleAffixFitV2(role,x.stat)==='role_crossover')
     .reduce((n,x)=>n+x.probability,0))};
   });
   const single=Math.max(...firstRollCrossoverWeightShares.map(x=>x.probability));
   const mythic=Math.max(...rows.map(row=>{
    const result=reviewExactWeightedAffixDrawV2(row.candidates,3);
    return result.subsets.filter(s=>s.stats.some(stat=>
     classifyForgeRoleAffixFitV2(role,stat)==='role_crossover'))
     .reduce((n,s)=>n+s.probability,0);
   }));
   sensitivity.push({
    scenario,role,maxSlotSingleRollCrossoverChance:round(single),
    maxSlotHighTierMythicCrossoverChance:round(mythic),
    firstRollCrossoverWeightShares,
    notAnObservedPlayerDistribution:true,weightsApproved:false,
   });
  }
 }
 return {
  scope:'EQ2_ROLE_FIT_AND_MAX_STACK_REVIEW_NOT_A_LOOT_POLICY',
  originalSourceTemplates:169,sourceRecipes:338,
  roleSlotRows:30,physicalClassTierCells:340,
  expectedClassTierLoadouts:36,originalNoOffhandReservations:20,
  roleSlotsWithoutCore:roleSlotMatrix.filter(x=>x.missingRoleCore).length,
  roleSlotsForcingHighTierMythicCrossover:
   roleSlotMatrix.filter(x=>x.highTierMythicForcesCrossover).length,
  classTierPhysicalCellsForcingHighTierMythicCrossover:forcedPhysicalCells,
  roleSlotMatrix,realSourceLoadouts,sensitivity,
  originalSourceAffixValuesUntouched:true,
  noExecutableSetBonuses:true,noCPWeightsApproved:true,
  noMintPermission:true,releaseReady:false,
 };
}
