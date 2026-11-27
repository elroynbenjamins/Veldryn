/** Private solo loadout selection, never an auto-equip rule.
 * Score authored legal variants before seeing encounter outcomes.
 * Separate slot-count effect from choosing offensive and counter abilities. */
import type {AbilityDefinition,CombatantDefinition} from '../../types';
import {BUILD_RULES_V2,type BuildSelectionV2,type ClassIdV2} from '../build-contract';
import {SKILL_IDENTITIES_V2,SKILLS_V2} from '../skill-catalog';
import {compileServerSkillBuildV2,type VerifiedSkillBuildV2} from '../skill-effects';
export type SoloReviewArm='default_two'|'default_full'|'offensive_full'|'counter_full';
type Slot=BuildSelectionV2['activeSkills'][number];
export function selectSoloReviewLoadoutsV2(build:VerifiedSkillBuildV2,region:'asterfall'|'sunscar'|'frostmarch'){
 const {actor,verified,selected}=build;
 const level=verified.level;
 if(level<BUILD_RULES_V2.specializationLevel||!selected.specializationId)throw Error('solo_review_requires_unlocked_specialization');
 const available=SKILL_IDENTITIES_V2.filter(s=>s.classId===verified.classId&&SKILLS_V2.some(k=>k.id===s.id&&k.unlockLevel<=level));
 const capacity=level>=10?BUILD_RULES_V2.activeSlots:BUILD_RULES_V2.earlyActiveSlots;
 if(available.length<capacity)throw Error('solo_review_missing_unlocked_skills');
 const preview=(slot:Slot):AbilityDefinition=>compileServerSkillBuildV2(true,{...build,
  selected:{...selected,equipment:{},activeSkills:[slot]},ownedItemsById:{},setsById:{}}).abilities[0];
 const candidates=available.flatMap((s,si)=>s.variants.filter((_,vi)=>level>=BUILD_RULES_V2.variantLevel||vi===0).map((v,vi)=>{
  const slot={skillId:s.id,variantId:v.id},a=preview(slot);
  const kinds=new Set(a.effects.map(e=>e.kind));
  const enemyTarget=(e:typeof a.effects[number])=>['current_target','all_enemies','random_enemy','interruptible_casting_enemy'].includes(e.target??a.target);
  const damage=a.effects.filter(e=>(e.kind==='damage'||e.kind==='dot')&&enemyTarget(e)).reduce((n,e)=>n+(e.coeff??0)*(e.kind==='dot'?Math.floor((e.durationMs??0)/Math.max(1,e.tickMs??1000)):1),0);
  // Conservative diagnostic score, not a DPS prediction. Resource spends,
  // flat values, proc interactions and cast conflicts remain engine-measured.
  const conditional=a.aiCondition==='target_casting'?.35:1;
  const offense=damage*1000/Math.max(1000,a.cooldownMs+a.castTimeMs)*conditional;
  const interrupt=kinds.has('interrupt'),cleanse=kinds.has('cleanse'),sustain=kinds.has('shield')||kinds.has('heal')||kinds.has('hot');
  const counter=(interrupt?3:0)+(cleanse?(region==='asterfall'?2:3):0)+(sustain?1.5:0);
  return {slot,a,si,vi,offense,counter,interrupt,cleanse,sustain};
 }));
 const choose=(rank:(x:typeof candidates[number])=>number,exclude:ReadonlySet<string>=new Set())=>
  [...candidates].filter(x=>!exclude.has(x.slot.skillId)).sort((a,b)=>rank(b)-rank(a)||a.si-b.si||a.vi-b.vi)[0];
 const fill=(first:typeof candidates[number],second?:typeof candidates[number])=>{
  const result=[first,...(second?[second]:[])],seen=new Set(result.map(x=>x.slot.skillId));
  while(result.length<capacity){const x=choose(c=>c.offense,seen);if(!x)throw Error('solo_review_incomplete');result.push(x);seen.add(x.slot.skillId);}
  return result.map(x=>x.slot);
 };
 const primary=choose(x=>x.offense),other=choose(x=>x.offense,new Set([primary.slot.skillId]));
 const defense=choose(x=>x.counter+x.offense*.1,new Set([primary.slot.skillId]));
 const defaults=available.slice(0,capacity).map(s=>({skillId:s.id,variantId:s.variants[0].id}));
 const selections:Record<SoloReviewArm,readonly Slot[]>={default_two:defaults.slice(0,2),default_full:defaults,
  offensive_full:fill(primary,other),counter_full:fill(primary,defense)};
 for(const [arm,slots] of Object.entries(selections)){
  if(slots.length!==(arm==='default_two'?2:capacity)||new Set(slots.map(s=>s.skillId)).size!==slots.length)throw Error('solo_review_invalid_slots');
 }
 return {selections,capacity,offensiveAbility:primary.a.name,counterAbility:defense.a.name,
  counterAvailable:defense.counter>0,offensiveScore:primary.offense,
  counterRoutes:{interrupt:defense.interrupt,cleanse:defense.cleanse,sustain:defense.sustain},
  releaseEnabled:false as const};
}
