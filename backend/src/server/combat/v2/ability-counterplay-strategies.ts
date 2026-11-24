/**
 * HIDDEN / QA ONLY — deterministic, server-compiled Skills 2.0 boss loadouts.
 * Never import into a live route or use this to award player power.
 * Tests compare REAL playable authored variants, not imaginary counter buttons.
 */
import type {AbilityDefinition,CombatantDefinition} from '../types';
import type {ClassIdV2,BuildSelectionV2} from './build-contract';
import {SKILL_IDENTITIES_V2,SKILLS_V2,SPECIALIZATIONS_V2} from './skill-catalog';
import {compileServerSkillBuildV2,type VerifiedSkillBuildV2} from './skill-effects';

export type ReviewSkillStrategyV2='generic'|'targeted'|'alternative';
export type ReviewCounterRouteV2='control'|'cleanse'|'sustain'|'pressure';
export interface ReviewSkillChoiceV2 {
 readonly strategy:ReviewSkillStrategyV2;
 readonly route:ReviewCounterRouteV2;
 readonly activeSkills:BuildSelectionV2['activeSkills'];
 readonly potentialRouteScore:number;
 readonly hasMatchingCounter:boolean;
}

/** Boss identities are test fixtures, never client-supplied encounter switches. */
const bossRoutes:Readonly<Record<string,readonly [ReviewCounterRouteV2,ReviewCounterRouteV2]>>={
 BOSS_EXP_ROOT:['control','pressure'],
 BOSS_EXP_BELL:['cleanse','sustain'],
 BOSS_EXP_SOLAR:['cleanse','sustain'],
 BOSS_EXP_SPHINX:['control','pressure'],
 BOSS_EXP_BELLBEAST:['sustain','control'],
 BOSS_EXP_CANTOR:['cleanse','pressure'],
};
const routes:readonly ReviewCounterRouteV2[]=['control','cleanse','sustain','pressure'];
function routeScore(ability:AbilityDefinition,route:ReviewCounterRouteV2):number{
 const effects=ability.effects;
 const kinds=new Set(effects.map(e=>e.kind));
 const interrupt=kinds.has('interrupt')||ability.target==='interruptible_casting_enemy';
 const cleanse=kinds.has('cleanse');
 const sustain=kinds.has('shield')||kinds.has('heal')||kinds.has('hot');
 const pressure=kinds.has('damage')||kinds.has('dot')||kinds.has('debuff');
 // Independent tactical routes: every class has a viable basic-attack fallback.
 // A role that lacks cleanse/interrupt is never forced to equip another class.
 switch(route){
  case 'control':return (interrupt?10:0)+(kinds.has('debuff')?2:0);
  case 'cleanse':return (cleanse?10:0)+(sustain?2:0);
  case 'sustain':return (sustain?10:0)+(interrupt?2:0);
  case 'pressure':return (pressure?10:0)+(interrupt?2:0);
 }
}
const invalid=(reason:string):never=>{throw Error('combat_v2_counterplay_strategy_'+reason);};

/**
 * Preview real server-authored variant effects, then select two *distinct*
 * unlocked abilities for an honest tactical A/B. All three approaches keep
 * identical actor, specialization, combat level and separately verified gear.
 * This is diagnostic selection, not an AI optimizer or approved class balance.
 */
export function selectReviewSkillLoadoutV2(
 classId:ClassIdV2,specializationId:string,actor:CombatantDefinition,
 bossId:string,strategy:ReviewSkillStrategyV2,
):ReviewSkillChoiceV2{
 const goal=bossRoutes[bossId];
 if(!goal)invalid('unknown_boss');
 if(!['generic','targeted','alternative'].includes(strategy))invalid('unknown_strategy');
 if(!SPECIALIZATIONS_V2.some(s=>s.classId===classId&&s.id===specializationId))
  invalid('invalid_specialization');
 if(actor.team!=='players'||actor.level<20||
   !Number.isSafeInteger(actor.level))invalid('invalid_actor');
 const available=SKILL_IDENTITIES_V2.filter(s=>s.classId===classId&&
  SKILLS_V2.some(row=>row.id===s.id&&row.unlockLevel<=actor.level));
 if(available.length<2)invalid('insufficient_unlocked_skills');
 const build:VerifiedSkillBuildV2={
  actor,verified:{classId,level:actor.level,ownedInstanceIds:new Set()},
  selected:{specializationId,equipment:{},activeSkills:[],talentRanks:{},
   signaturePassiveIds:[],capstoneId:null},
  ownedItemsById:{},setsById:{},
 };
 const route:ReviewCounterRouteV2=strategy==='targeted'?goal![0]:
  strategy==='alternative'?goal![1]:'pressure';
 if(!routes.includes(route))invalid('invalid_route');
 // For generic, retain the actual baseline default variants.
 if(strategy==='generic')return {
  strategy,route,activeSkills:available.slice(0,2).map(s=>({
   skillId:s.id,variantId:s.variants[0].id,
  })),potentialRouteScore:0,hasMatchingCounter:false,
 };
 const candidates=available.flatMap((skill,skillIndex)=>skill.variants.map((variant,variantIndex)=>{
  const ability=compileServerSkillBuildV2(true,{
   ...build,selected:{...build.selected,activeSkills:[{
    skillId:skill.id,variantId:variant.id,
   }]},
  }).abilities[0];
  return {skillId:skill.id,variantId:variant.id,
   skillIndex,variantIndex,score:routeScore(ability,route)};
 }));
 candidates.sort((a,b)=>b.score-a.score||a.skillIndex-b.skillIndex||
  a.variantIndex-b.variantIndex||a.variantId.localeCompare(b.variantId));
 const chosen:typeof candidates=[];
 const seen=new Set<string>();
 for(const candidate of candidates){
  if(seen.has(candidate.skillId))continue;
  chosen.push(candidate);seen.add(candidate.skillId);
  if(chosen.length===2)break;
 }
 if(chosen.length!==2)invalid('selection_incomplete');
 return {strategy,route,
  activeSkills:chosen.map(({skillId,variantId})=>({skillId,variantId})),
  potentialRouteScore:chosen.reduce((n,c)=>n+c.score,0),
  hasMatchingCounter:chosen.some(c=>c.score>=10),
 };
}
