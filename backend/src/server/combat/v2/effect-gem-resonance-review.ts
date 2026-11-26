/** Private effect gem aggregation; only verified worn-copy review calls
 * this module. Do not mount as combat authority or trust a client payload.
 */
import {findEffectGemReviewV2,findEffectGem,gemItemId,type GemGrade} from '../../equipment/gems/gem-catalog-v1';
export const EFFECT_RESONANCE_REVIEW_V2='effect-resonance-review-v2-20261126' as const;
export interface EffectGemReviewCopyV2{
 instanceId:string;gemId:string;familyId:string;grade:GemGrade;
 rollPercent:number;candidateFraction?:number;runtimeEnabled:false;
}
const round=(x:number)=>Math.round(x*1e9)/1e9;
const fail=(why:string):never=>{throw Error('effect_gem_resonance_review_'+why);};
/** Compare magnitude at a family's authored maximum stack/condition,
 * NOT equivalent combat value, uptime, DPS or actual engine outcome. */
function envelope(family:string,resonance:1|2|3){
 switch(family){
  case 'effect_momentum':return {unit:'damage_fraction',multiplier:resonance>=2?6:5};
  case 'effect_execution':return {unit:'damage_fraction_below_hp_threshold',multiplier:resonance===3?1.25:1};
  case 'effect_opening_strike':return {unit:'damage_fraction_during_window',multiplier:1};
  case 'effect_predator':return {unit:'damage_fraction_vs_eligible_target',multiplier:resonance===3?1.25:1};
  case 'effect_critical_surge':return {unit:'haste_fraction',multiplier:resonance>=2?4:3};
  case 'effect_ruin':return {unit:'damage_fraction',multiplier:resonance>=2?3:2};
  case 'effect_bulwark':case 'effect_last_stand':case 'effect_guardians_gift':return {unit:'damage_reduction_fraction',multiplier:1};
  case 'effect_aegis':return {unit:'barrier_output_fraction',multiplier:1};
  case 'effect_retaliation':case 'effect_opportunist':return {unit:'next_hit_damage_fraction',multiplier:1};
  case 'effect_unyielding':return {unit:'armor_ward_relative_fraction',multiplier:resonance>=2?5:4};
  case 'effect_mercy':return {unit:'overheal_conversion_fraction_before_barrier_cap',multiplier:1};
  case 'effect_benediction':return {unit:'next_heal_or_barrier_fraction',multiplier:1};
  case 'effect_renewal':return {unit:'additional_heal_fraction_per_application',multiplier:resonance>=2?1.2:1};
  case 'effect_shared_resolve':return {unit:'support_output_fraction',multiplier:resonance===3?3:2};
  case 'effect_sustenance':return {unit:'max_hp_restore_fraction_eligible_kill',multiplier:resonance>=2?3:1};
  case 'effect_battle_rhythm':return {unit:'next_opposite_ability_output_fraction',multiplier:1};
  case 'effect_flow':return {unit:'haste_fraction',multiplier:resonance>=2?4:3};
  default:return fail('unknown_family');
 }
}
export function reviewEffectGemResonanceV2(copies:readonly EffectGemReviewCopyV2[],wornIds:readonly string[]){
 if(!Array.isArray(copies)||!Array.isArray(wornIds)||wornIds.length>10||
  new Set(wornIds).size!==wornIds.length||copies.length>wornIds.length)fail('invalid_scope');
 const worn=new Set(wornIds),seen=new Set<string>(),groups=new Map<string,EffectGemReviewCopyV2[]>();
 for(const c of copies){
  const def=findEffectGemReviewV2(c.familyId);
  if(!def||!worn.has(c.instanceId)||seen.has(c.instanceId)||c.runtimeEnabled!==false||
   ![1,2,3,4,5].includes(c.grade)||c.gemId!==gemItemId(c.familyId,c.grade)||
   !Number.isInteger(c.rollPercent)||c.rollPercent<80||c.rollPercent>120||c.rollPercent%5!==0||
   c.candidateFraction!==round(def.values[c.grade]*c.rollPercent/100))fail('invalid_copy');
  seen.add(c.instanceId);
  const rows=groups.get(c.familyId)??[];
  rows.push(c);
  if(rows.length>3)fail('family_copy_cap');
  groups.set(c.familyId,rows);
 }
 const families=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([familyId,rows])=>{
  const def=findEffectGemReviewV2(familyId)!,legacy=findEffectGem(familyId)!;
  const resonance=rows.length as 1|2|3;
  const ordered=[...rows].sort((a,b)=>a.instanceId.localeCompare(b.instanceId));
  const totalValue=round(ordered.reduce((n,c)=>n+c.candidateFraction!,0));
  const legacyTotalValue=round(ordered.reduce((n,c)=>n+round(legacy.values[c.grade]*c.rollPercent/100),0));
  const peak=envelope(familyId,resonance);
  return {familyId,name:def.name,category:def.category,copies:resonance,resonance,totalValue,legacyTotalValue,
   sources:ordered.map(c=>({...c})),peak:{...peak,candidate:round(totalValue*peak.multiplier),
    legacy:round(legacyTotalValue*peak.multiplier)},baseDescription:def.baseDescription,
   unlockedResonance:[...(resonance>=2?[def.resonance2]:[]),...(resonance===3?[def.resonance3]:[])],
   triggerCooldownMs:def.triggerCooldownMs??null,durationMs:def.durationMs??null,
   maxEquippedCopies:def.maxEquippedCopies,runtimeEnabled:false as const};
 });
 return {scope:'VERIFIED_WORN_EFFECT_GEM_RESONANCE_REVIEW_ONLY' as const,
  version:EFFECT_RESONANCE_REVIEW_V2,families,copyCount:copies.length,
  canExecuteEffects:false as const,cpApproved:false as const,releaseEnabled:false as const};
}
