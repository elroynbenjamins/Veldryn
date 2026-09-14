import type {CombatantDefinition,AbilityDefinition} from '../combat/types';
import type {OwnedCompanionSnapshot} from './domain';
import {companionServerDefinition,companionTechnique,COMPANION_RARITY_TARGET,COMPANION_RARITY_MAX_LEVEL} from './content';
import {buildOwnedCompanionCombatant} from './combat-adapter';
import {validateCompanionLoadout,validateProgressionSnapshot,type CharacterClassId} from './policy';

/** Keep four player slots; each owner's frozen companion casts a budgeted assist. */
export function applyCharacterCompanionAssist(owner:CombatantDefinition,progress?:OwnedCompanionSnapshot):CombatantDefinition {
  if(!progress)return owner;
  const policy=validateCompanionLoadout({classId:owner.classId as CharacterClassId,companionId:progress.companionId,ownedCompanionIds:[progress.companionId]});
  if(!policy.ok)throw new Error(policy.reason);
  const safe=validateProgressionSnapshot(progress.companionId,progress);
  if(safe.level!==progress.level||safe.ascensionTier!==progress.ascensionTier||safe.bondLevel!==progress.bondLevel)throw new Error('invalid_companion_snapshot');
  const def=companionServerDefinition(progress.companionId)!;
  const unit=buildOwnedCompanionCombatant(progress,{mode:'character_assist',ownerId:owner.id}),active=unit.abilities[0];
  const technique=progress.selectedTechniqueId?companionTechnique(progress.selectedTechniqueId):undefined;
  const value=(kind:string)=>technique?.companionId===def.id?technique.effects.filter(e=>e.kind===kind).reduce((sum,e)=>sum+e.value,0):0;
  const budget=Math.min(.12,.07*COMPANION_RARITY_TARGET[def.rarity]*(.55+.35*progress.level/COMPANION_RARITY_MAX_LEVEL[def.rarity]+.1*progress.bondLevel/10)*(1+value('damage'))*def.active.cooldownMs/active.cooldownMs);
  const damageCoeff=budget*owner.basicAttackCoeff*active.cooldownMs/owner.basicAttackMs;
  const ability:AbilityDefinition={...active,id:`${owner.id}:${def.id}:assist`,name:`${def.name}: ${active.name}`,target:def.role==='damage'?'current_target':'self',aiCondition:def.role==='damage'?'always':'self_below_50',effects:def.role==='damage'?[{kind:'damage',coeff:damageCoeff,executeBelowHpPct:.30,executeBonus:value('execute'),tag:'companion_assist'}]:def.role==='tank'?[{kind:'shield',flat:owner.stats.maxHp*budget*.5*(1+value('shield_strength')),shieldReflectPct:value('reflect'),tag:'companion_assist'}]:[{kind:'heal',flat:owner.stats.maxHp*budget*.35*(1+value('heal_strength')),tag:'companion_assist'}],tags:['combat_companion',def.id,def.role]};
  return {...owner,abilities:[...owner.abilities,ability],tags:[...(owner.tags??[]),`companion:${def.id}`]};
}
