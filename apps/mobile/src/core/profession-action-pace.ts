import type {GameState,SkillId} from './types';
import {characterPermanentMultipliers} from './permanent-boosts';
import {professionMasteryMultipliers} from './profession-mastery-v40';
import {skillAffinityModifiers} from './class-skill-affinities';

export interface ProfessionActionDefinition{id:string;skillId:SkillId;seconds:number;xp:number;}
export type ProfessionActionMode='batch'|'forge'|'instant';
/** Does not change inputs, output quantity, quality odds, or any combat multiplier. */
export function professionActionPace(state:GameState,recipe:ProfessionActionDefinition,mode:ProfessionActionMode){
 const permanent=characterPermanentMultipliers(state);
 const mastery=professionMasteryMultipliers(recipe.id,state.account.professionMasteryByAction?.[recipe.id]);
 const affinity=skillAffinityModifiers(state.character?.classId,recipe.skillId);
 // Preserve existing mode-specific sources: forge previously awards recipe/mastery XP,
 // while processing, alchemy and instant recipes also use the general skill-XP bonus.
 const xpPerAction=recipe.xp*mastery.xp*(mode==='forge'?1:permanent.skillXpMultiplier)*affinity.xpMultiplier;
 const speed=mastery.speed*(mode==='forge'?permanent.craftingSpeedMultiplier:1)*affinity.speedMultiplier;
 const rawSeconds=recipe.seconds/Math.max(.1,speed);
 const cycleSeconds=mode==='instant'?0:mode==='forge'?Math.max(1,Math.ceil(rawSeconds)):Math.max(1,rawSeconds);
 return {cycleSeconds,xpPerAction,affinity,mastery,speed};
}
