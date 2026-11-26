import type {GameState} from './types';
/** Forge is a distinct, character-bound trainable profession. */
export const FORGE_MAX_LEVEL=100;
export const FORGE_MAX_SPEED_BONUS=.10;
export const FORGE_BASE_RARE_PLUS_CHANCE=.039;
export function forgeLevel(state:Pick<GameState,'skills'>):number{
 const level=state.skills.find(row=>row.skillId==='forge')?.level??1;
 return Number.isFinite(level)?Math.max(1,Math.min(100,Math.floor(level))):1;
}
export function forgeSpeedBonus(level:number):number{
 const safe=Number.isFinite(level)?Math.max(1,Math.min(100,Math.floor(level))):1;
 return (safe-1)/99*FORGE_MAX_SPEED_BONUS;
}
/** Cumulative milestones are relative, never percentage-point boosts. */
export function forgeRarityBonusPercent(level:number):0|5|10|15{
 const n=Number.isFinite(level)?Math.floor(level):1;
 return n>=75?15:n>=50?10:n>=25?5:0;
}
export function forgeRarePlusChance(level:number):number{
 return FORGE_BASE_RARE_PLUS_CHANCE*(1+forgeRarityBonusPercent(level)/100);
}
export function forgeXpForRecipe(recipeXp:number):number{
 return Math.max(1,Math.floor(Math.max(0,recipeXp)*.35));
}
