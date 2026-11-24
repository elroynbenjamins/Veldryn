/**
 * Equipment/Class 2.0 contribution diagnostic — NOT a replacement CP formula.
 *
 * Final CP weights are not yet approved, so every single weight must come
 * from an explicit authoritative balance policy. When missing, no percentage
 * is emitted. This reports weighted class/level share after v2 stat assembly,
 * not individual player CP, rewards or live rankings.
 */
import type {CombatStats} from '../types';
export interface ApprovedPowerCompositionPolicyV2{
 /** Explicit trained class/level -> full-item contribution target. */
 readonly targetClassShare:{readonly min:number;readonly max:number};
 /** Authoritative metric weights: 0 excludes a stat. No default guesses. */
 readonly weights:Readonly<Record<keyof CombatStats,number>>;
 readonly requiredEquipmentSlots:number;
}
export interface PowerCompositionDiagnosticV2{
 readonly classLevelWeighted:number;
 readonly totalWeighted:number;
 readonly classShare:number;
 readonly otherShare:number;
 readonly equippedSlots:number;
 readonly targetApplicable:boolean;
 readonly withinTarget:boolean|null;
 readonly differenceFromTarget:number|null;
}
const statKeys:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion','critChance','critMultiplier','haste',
];
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const round=(n:number)=>Math.round(n*1e6)/1e6;
export function evaluatePowerCompositionV2(
 classLevel:CombatStats,full:CombatStats,
 equippedSlots:number,policy:ApprovedPowerCompositionPolicyV2,
):PowerCompositionDiagnosticV2{
 if(!Number.isSafeInteger(equippedSlots)||equippedSlots<0||equippedSlots>10||
    !Number.isSafeInteger(policy.requiredEquipmentSlots)||
    policy.requiredEquipmentSlots<1||policy.requiredEquipmentSlots>10||
    !finite(policy.targetClassShare.min)||!finite(policy.targetClassShare.max)||
    policy.targetClassShare.min<=0||policy.targetClassShare.max>=1||
    policy.targetClassShare.min>policy.targetClassShare.max)
   throw Error('combat_v2_invalid_composition_policy');
 let included=0;
 let base=0,final=0;
 for(const key of statKeys){
  const weight=policy.weights[key];
  if(!finite(weight)||weight<0)throw Error('combat_v2_missing_approved_cp_weight:'+key);
  const a=classLevel[key],b=full[key];
  if(!finite(a)||a<0||!finite(b)||b<0)
   throw Error('combat_v2_invalid_power_composition_stat:'+key);
  if(weight>0){
    included++;
    base+=a*weight;
    final+=b*weight;
  }
 }
 if(!included||!finite(base)||!finite(final)||base<=0||final<=0)
   throw Error('combat_v2_invalid_weighted_composition');
 if(final+1e-9<base)
   throw Error('combat_v2_invalid_equipment_power_regression');
 const classShare=base/final;
 const targetApplicable=equippedSlots>=policy.requiredEquipmentSlots;
 const min=policy.targetClassShare.min,max=policy.targetClassShare.max;
 const difference=classShare<min?classShare-min:classShare>max?classShare-max:0;
 return {
  classLevelWeighted:round(base),totalWeighted:round(final),
  classShare:round(classShare),otherShare:round(1-classShare),
  equippedSlots,targetApplicable,
  withinTarget:targetApplicable?difference===0:null,
  differenceFromTarget:targetApplicable?round(difference):null,
 };
}

/** Stage-aware candidate rating attribution. Uses exactly one explicit
 * policy across all stages; never equates class or spec comparisons to
 * final equal CP. Conditional and unpriced sources cannot authorize entry. */
export interface PowerAttributionStagesV2{
 readonly classOnly:CombatStats;
 readonly afterSkills:CombatStats;
 readonly afterItemBase:CombatStats;
 readonly afterSets:CombatStats;
 readonly afterAffixes:CombatStats;
}
export function reviewPowerAttributionV2(
 stages:PowerAttributionStagesV2,equippedSlots:number,policy:ApprovedPowerCompositionPolicyV2,
){
 // The existing composition target is trained class+skill baseline.
 const composition=evaluatePowerCompositionV2(stages.afterSkills,stages.afterAffixes,equippedSlots,policy);
 const score=(stats:CombatStats)=>{
  let total=0;
  for(const key of statKeys){
   const value=stats[key];
   if(!finite(value)||value<0)throw Error('combat_v2_invalid_attribution_stat:'+key);
   total+=value*policy.weights[key];
  }
  if(!finite(total)||total<0)throw Error('combat_v2_invalid_attribution_score');
  return total;
 };
 const classOnly=score(stages.classOnly),afterSkills=score(stages.afterSkills),
  afterBase=score(stages.afterItemBase),afterSets=score(stages.afterSets),
  afterAffixes=score(stages.afterAffixes);
 // Marginal differences may be negative for genuine specialization tradeoffs.
 // Round stages before subtraction so the displayed breakdown telescopes.
 const rows=[
  {source:'class_only',value:round(classOnly)},
  {source:'skills',value:round(round(afterSkills)-round(classOnly))},
  {source:'item_base',value:round(round(afterBase)-round(afterSkills))},
  {source:'set_stats',value:round(round(afterSets)-round(afterBase))},
  {source:'random_affix_stats',value:round(round(afterAffixes)-round(afterSets))},
 ];
 return {rows,partialWeightedTotal:round(afterAffixes),composition,
  scope:'WEIGHTED_PERSONAL_STAT_REVIEW_ONLY' as const,
  unpricedDomains:['advanced_affix_effects','unreconciled_innates','gems','companions',
   'conditional_traits','skill_utility','encounter_and_party_modifiers'] as const,
  cpApproved:false as const,canGateContent:false as const,canCompareEqualCP:false as const,
  releaseEnabled:false as const};
}
