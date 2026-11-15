import type {CombatantDefinition,AbilityDefinition,AbilityEffect} from '../combat/types';
import type {OwnedCompanionSnapshot} from './domain';
import {companionServerDefinition,companionTechnique,COMPANION_RARITY_TARGET,COMPANION_RARITY_MAX_LEVEL} from './content';
import {buildOwnedCompanionCombatant} from './combat-adapter';
import {validateCompanionLoadout,validateProgressionSnapshot,type CharacterClassId} from './policy';

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

/** Small, short-lived signature status effects. A shared assist cooldown prevents
 * secondary effects from becoming additional free casts in the 4-player party. */
function signatureAssistEffects(id:string,maxHp:number):AbilityEffect[]{
 switch(id){
  case 'UNIT_001':return [{kind:'debuff',value:-.025,durationMs:4000,tag:'damage_done'}];
  case 'UNIT_002':return [{kind:'buff',value:-.025,durationMs:4000,tag:'damage_taken'}];
  case 'UNIT_003':return [{kind:'hot',flat:maxHp*.003,tickMs:2000,durationMs:4000,tag:'silver_current'}];
  case 'UNIT_004':return [{kind:'debuff',value:.035,durationMs:5000,tag:'damage_taken'}];
  case 'UNIT_006':return [{kind:'buff',value:-.03,durationMs:5000,tag:'damage_taken'}];
  case 'UNIT_008':return [{kind:'cleanse',tag:'dawn_pinion'}];
  case 'UNIT_009':return [{kind:'debuff',value:.03,durationMs:5000,tag:'damage_taken'}];
  case 'UNIT_010':return [{kind:'debuff',value:.03,durationMs:7000,tag:'damage_taken'}];
  case 'UNIT_011':return [{kind:'debuff',value:.04,durationMs:6000,tag:'hit_taken'}];
  default:return [];
 }
}

/** Keep four player slots: each owner gets one verified companion assist.
 * Its role and authored signature decide what the cast actually does. */
export function applyCharacterCompanionAssist(owner:CombatantDefinition,progress?:OwnedCompanionSnapshot):CombatantDefinition{
 if(!progress)return owner;
 const policy=validateCompanionLoadout({classId:owner.classId as CharacterClassId,companionId:progress.companionId,ownedCompanionIds:[progress.companionId]});
 if(!policy.ok)throw new Error(policy.reason);
 const safe=validateProgressionSnapshot(progress.companionId,progress);
 if(safe.level!==progress.level||safe.ascensionTier!==progress.ascensionTier||safe.bondLevel!==progress.bondLevel)throw new Error('invalid_companion_snapshot');
 const def=companionServerDefinition(progress.companionId)!;
 const unit=buildOwnedCompanionCombatant(progress,{mode:'character_assist',ownerId:owner.id}),active=unit.abilities[0];
 const technique=progress.selectedTechniqueId?companionTechnique(progress.selectedTechniqueId):undefined;
 const value=(kind:string)=>technique?.companionId===def.id?technique.effects.filter(e=>e.kind===kind).reduce((sum,e)=>sum+e.value,0):0;
 const identity=def.identity??{},bond=progress.bondTraitUnlocked?(identity.bond??{}):{};
 const multiplier=(key:'activeDamageMultiplier'|'activeShieldMultiplier'|'activeHealMultiplier'|'utilityMultiplier'|'mitigationMultiplier')=>(identity[key]??1)*(bond[key]??1);
 const budget=clamp(.07*COMPANION_RARITY_TARGET[def.rarity]*(.55+.35*progress.level/COMPANION_RARITY_MAX_LEVEL[def.rarity]+.1*progress.bondLevel/10)*(1+value('damage'))*def.active.cooldownMs/active.cooldownMs,.015,.12);
 const kind=def.active.effectKind,ownerHp=owner.stats.maxHp;
 const baseDamageCoeff=budget*owner.basicAttackCoeff*active.cooldownMs/Math.max(850,owner.basicAttackMs);
 const effectActive=active.effects[0];
 let target:AbilityDefinition['target']='self',condition:AbilityDefinition['aiCondition']='always';
 let effects:AbilityEffect[];
 if(kind==='damage'){
  target='current_target';
  effects=[{kind:'damage',coeff:baseDamageCoeff*multiplier('activeDamageMultiplier'),executeBelowHpPct:.30,executeBonus:clamp(effectActive?.executeBonus??0,0,.30),...(def.id==='UNIT_009'?{bonusVsDebuffed:.12}:{}),tag:'companion_assist'},...signatureAssistEffects(def.id,ownerHp)];
 }else if(kind==='interrupt'){
  target='interruptible_casting_enemy';condition='target_casting';
  effects=[{kind:'interrupt',tag:'companion_spellbreak'}];
 }else if(kind==='shield'){
  target=def.id==='UNIT_008'?'lowest_hp_ally':'self';
  condition=def.id==='UNIT_008'?'ally_below_50_or_dot':'always';
  effects=[{kind:'shield',flat:ownerHp*budget*.67*(1+value('shield_strength'))*multiplier('activeShieldMultiplier'),shieldReflectPct:clamp(effectActive?.shieldReflectPct??0,0,.30),tag:'companion_assist'},...signatureAssistEffects(def.id,ownerHp)];
 }else if(kind==='heal'){
  target='lowest_hp_ally';condition='ally_below_80';
  effects=[{kind:'heal',flat:ownerHp*budget*.60*(1+value('heal_strength'))*multiplier('activeHealMultiplier'),tag:'companion_assist'},...signatureAssistEffects(def.id,ownerHp)];
 }else if(kind==='mitigation'){
  effects=[{kind:'buff',value:-clamp(def.active.baseCoeff*multiplier('mitigationMultiplier')*(1+value('shield_strength')*.5),.035,.10),durationMs:6000,tag:'damage_taken'}];
 }else{
  // Utility is a true short owner buff. The old companion_utility tag was not
  // consumed by the combat engine and gave players no meaningful effect.
  effects=[{kind:'buff',value:clamp((def.id==='UNIT_012'?.05:def.active.baseCoeff)*multiplier('utilityMultiplier')*(1+value('damage')),.035,.075),durationMs:6000,tag:'damage_done'},...(def.id==='UNIT_012'?[]:[{kind:'heal' as const,flat:ownerHp*budget*.20*(1+value('heal_strength')),tag:'companion_utility_heal'}])];
 }
 const ability:AbilityDefinition={...active,id:`${owner.id}:${def.id}:assist`,name:`${def.name}: ${active.name}`,target,aiCondition:condition,effects,tags:['combat_companion',def.id,def.role,`companion_signature:${def.id}`]};
 // The disruptor retains a tiny always-on tempo niche when a fight has no casts;
 // unlike the interrupt, this does not add actions or another party member.
 const extraHaste=clamp(value('haste')+(def.id==='UNIT_005'?.015:0),-.15,.15);
 const extraDefense=clamp(value('defense'),-.15,.15);
 const stats=extraHaste||extraDefense?{...owner.stats,haste:clamp(owner.stats.haste+extraHaste,0,.75),defense:owner.stats.defense*(1+extraDefense)}:owner.stats;
 return {...owner,stats,abilities:[...owner.abilities,ability],tags:[...(owner.tags??[]),`companion:${def.id}`]};
}
