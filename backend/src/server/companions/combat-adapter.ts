import {COMPANION_RARITY_MAX_LEVEL,COMPANION_RARITY_TARGET,companionServerDefinition,companionTechnique} from './content';
import type {CompanionCombatContext,CompanionCombatantDefinition,CompanionServerDefinition,EngineAbilityDefinition,EngineAbilityEffect,EngineTargetRule,OwnedCompanionSnapshot} from './domain';

export interface CompanionCombatBuildContext{mode:CompanionCombatContext;ownerId?:string;teamSynergyMultiplier?:number;teamHasteBonus?:number;}
const COMMON_MAX_INVESTMENT_MULTIPLIER=1.50;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const ROLE_ANCHORS={
 damage:{hp:180,power:22,defense:12,attackSpeed:2.0},
 tank:{hp:260,power:14,defense:24,attackSpeed:2.6},
 support:{hp:150,power:12,defense:10,attackSpeed:2.2},
} as const;

/**
 * Legacy Combat Unit content already encoded rarity through raw stats. The expanded
 * Companion system also encodes rarity through level ceiling/scaling, so raw stat
 * variance is compressed around a role anchor before progression is applied.
 * This preserves identity (fast/slow, sturdy/frail) without double-dipping rarity.
 */
export function companionBalancedBaseStats(def:CompanionServerDefinition){
 const a=ROLE_ANCHORS[def.role],b=def.baseStats;
 return {
  hp:a.hp*clamp(b.hp/a.hp,.95,1.05),
  power:a.power*clamp(b.power/a.power,.95,1.05),
  defense:a.defense*clamp(b.defense/a.defense,.95,1.05),
  attackSpeed:a.attackSpeed*clamp(b.attackSpeed/a.attackSpeed,.90,1.10),
 };
}

/** Level scaling carries the systematic rarity advantage. */
export function companionInvestmentMultiplier(def:CompanionServerDefinition,progress:OwnedCompanionSnapshot){
 const max=COMPANION_RARITY_MAX_LEVEL[def.rarity];
 const endpoint=COMMON_MAX_INVESTMENT_MULTIPLIER*COMPANION_RARITY_TARGET[def.rarity];
 const fraction=max<=1?1:clamp((progress.level-1)/(max-1),0,1);
 return 1+(endpoint-1)*fraction;
}
function identityModifiers(def:CompanionServerDefinition,progress:OwnedCompanionSnapshot){
 const base=def.identity??{},bond=progress.bondTraitUnlocked?(base.bond??{}):{};
 const mul=(key:'basicDamageMultiplier'|'defenseMultiplier'|'activeDamageMultiplier'|'activeHealMultiplier'|'activeShieldMultiplier'|'activeCooldownMultiplier'|'mitigationMultiplier'|'utilityMultiplier')=>(base[key]??1)*(bond[key]??1);
 const add=(key:'hasteBonus'|'activeReflectPct'|'activeExecuteBonus')=>(base[key]??0)+(bond[key]??0);
 return {basicDamageMultiplier:mul('basicDamageMultiplier'),defenseMultiplier:mul('defenseMultiplier'),activeDamageMultiplier:mul('activeDamageMultiplier'),activeHealMultiplier:mul('activeHealMultiplier'),activeShieldMultiplier:mul('activeShieldMultiplier'),activeCooldownMultiplier:mul('activeCooldownMultiplier'),mitigationMultiplier:mul('mitigationMultiplier'),utilityMultiplier:mul('utilityMultiplier'),hasteBonus:add('hasteBonus'),activeReflectPct:add('activeReflectPct'),activeExecuteBonus:add('activeExecuteBonus')};
}
function techniqueEffects(progress:OwnedCompanionSnapshot){const t=progress.selectedTechniqueId?companionTechnique(progress.selectedTechniqueId):undefined;return t?.companionId===progress.companionId?t.effects:[];}
function effectValue(progress:OwnedCompanionSnapshot,kind:string){return techniqueEffects(progress).filter(x=>x.kind===kind).reduce((sum,x)=>sum+x.value,0);}
function resolvedTarget(def:CompanionServerDefinition,ctx:CompanionCombatBuildContext):{target:EngineTargetRule;exactTargetId?:string}{
 const wanted=ctx.mode==='character_assist'?def.active.targeting.assistTarget:def.active.targeting.standaloneTarget;
 if(wanted==='owner')return {target:'lowest_hp_ally',exactTargetId:ctx.ownerId};
 return {target:wanted as EngineTargetRule};
}
function balancedActiveCoeff(def:CompanionServerDefinition,progress:OwnedCompanionSnapshot){
 const raw=def.active.baseCoeff+def.active.perLevelCoeff*Math.max(0,progress.level-1);
 // Large legacy damage-coefficient jumps used to be part of rarity. Compress them
 // so abilities keep identity while the new rarity budget remains the main tier edge.
 return def.active.effectKind==='damage'?1+(raw-1)*.25:raw;
}
function engineEffects(def:CompanionServerDefinition,progress:OwnedCompanionSnapshot,context:CompanionCombatBuildContext):EngineAbilityEffect[]{
 const identity=identityModifiers(def,progress),levelCoeff=balancedActiveCoeff(def,progress),tDamage=effectValue(progress,'damage'),tHeal=effectValue(progress,'heal_strength'),tShield=effectValue(progress,'shield_strength');
 switch(def.active.effectKind){
  case 'damage':return [{kind:'damage',coeff:Math.max(.05,levelCoeff*(1+tDamage)*identity.activeDamageMultiplier),executeBelowHpPct:.30,executeBonus:Math.min(.30,effectValue(progress,'execute')+identity.activeExecuteBonus),tag:'companion_active'}];
  case 'shield':return [{kind:'shield',coeff:Math.max(.01,levelCoeff*(1+tShield)*identity.activeShieldMultiplier),shieldReflectPct:Math.min(.30,effectValue(progress,'reflect')+identity.activeReflectPct),tag:'companion_active'}];
  case 'heal':return [{kind:'heal',coeff:Math.max(.02,levelCoeff*(1+tHeal)*identity.activeHealMultiplier),tag:'companion_active'}];
  case 'interrupt':return context.mode==='character_assist'?[{kind:'interrupt',coeff:Math.max(.05,levelCoeff),tag:'companion_active'}]:[{kind:'damage',coeff:Math.max(.50,levelCoeff*.9),tag:'companion_active'},{kind:'interrupt',coeff:1,tag:'companion_interrupt'}];
  case 'mitigation':return [{kind:'buff',value:-Math.max(.01,levelCoeff*identity.mitigationMultiplier),durationMs:5000,tag:'damage_taken'}];
  case 'utility':default:
   if(def.role==='support'&&context.mode!=='character_assist')return [{kind:'heal',coeff:clamp(levelCoeff*.18,.035,.08)*(1+tHeal)*identity.activeHealMultiplier*identity.utilityMultiplier,tag:'companion_utility'}];
   return def.role==='support'?[{kind:'buff',value:Math.max(.01,levelCoeff*identity.utilityMultiplier),durationMs:5000,tag:'companion_utility'}]:[{kind:'damage',coeff:Math.max(.05,levelCoeff*identity.activeDamageMultiplier),tag:'companion_active'}];
 }
}
export function buildCompanionCombatant(def:CompanionServerDefinition,progress:OwnedCompanionSnapshot,context:CompanionCombatBuildContext):CompanionCombatantDefinition{
 if(progress.companionId!==def.id)throw new Error('companion_progress_definition_mismatch');
 const base=companionBalancedBaseStats(def),identity=identityModifiers(def,progress),scale=companionInvestmentMultiplier(def,progress),synergy=clamp(context.teamSynergyMultiplier??1,1,1.06),hasteBonus=clamp(context.teamHasteBonus??0,0,.06),cooldownChange=effectValue(progress,'cooldown'),target=resolvedTarget(def,context);
 const bond=progress.bondTraitUnlocked?1.03:1,ascension=1+progress.ascensionTier*.006,derived=scale*synergy*bond*ascension;
 const maxHp=Math.round(base.hp*derived),attackPower=Number((base.power*derived).toFixed(2));
 // Standalone Tank/Support coefficients represent percentages/utility in source
 // content. Calibrate healingPower to companion-scale HP so shields/heals matter in
 // companion-only combat without inflating character-assist output.
 const standalone=context.mode!=='character_assist';
 const healingPower=standalone?(def.role==='support'?maxHp*2.5:def.role==='tank'?maxHp*2:attackPower*.35):base.power*(def.role==='support'?.9:.35)*derived;
 const ability:EngineAbilityDefinition={id:def.active.id,name:def.active.name,cooldownMs:Math.max(3000,Math.round(def.active.cooldownMs*identity.activeCooldownMultiplier*(1+cooldownChange))),castTimeMs:0,target:target.target,exactTargetId:target.exactTargetId,effects:engineEffects(def,progress,context),priority:def.role==='support'?85:def.role==='tank'?80:70,aiCondition:def.role==='support'?'ally_below_50':'always',tags:['combat_companion',def.role,context.mode,...techniqueEffects(progress).map(x=>`technique:${x.kind}:${x.value}`)]};
 return {id:def.id,name:def.name,team:'players',role:def.role,level:progress.level,stats:{maxHp,attackPower,healingPower:Number(healingPower.toFixed(2)),defense:Number((base.defense*derived*identity.defenseMultiplier).toFixed(2)),accuracy:Math.min(.98,.84+progress.level*.002),evasion:Math.min(.22,.04+(def.role==='damage'?.03:0)),critChance:def.role==='damage'?.10:.05,critMultiplier:1.5,haste:Math.min(.45,.04+hasteBonus+identity.hasteBonus+Math.max(0,2.5-base.attackSpeed)*.03)},basicAttackMs:Math.max(850,Math.round(base.attackSpeed*1000)),basicAttackCoeff:(def.role==='damage'?.72:def.role==='tank'?.46:.40)*identity.basicDamageMultiplier,abilities:[ability],tags:['combat_companion',def.rarity,def.originId,context.mode]};
}
export function buildOwnedCompanionCombatant(progress:OwnedCompanionSnapshot,context:CompanionCombatBuildContext){const def=companionServerDefinition(progress.companionId);if(!def)throw new Error('unknown_companion');return buildCompanionCombatant(def,progress,context);}
export function companionAbilityTargetHint(combatant:CompanionCombatantDefinition){return combatant.abilities[0]?.exactTargetId;}
