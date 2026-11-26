import type {Recipe} from '../content/skills';
import type {GameState} from './types';
import {professionActionPace} from './profession-action-pace';
import {totalXpAtLevel} from './progression';

/**
 * Cooking UI preview. Continuous batches snapshot their XP when reserved; do
 * not replace that rate with later meal/gear/skill changes. XP is earned upon
 * completion. New Cooking batch rates are rounded to tens by professionActionPace;
 * legacy reservations keep their previous rate, with fractions and the level-100 cap handled by the
 * authoritative processing reward settlement.
 */
export function cookingRecipeXpPreview(state:GameState,recipe:Recipe){
 if(recipe.skillId!=='cooking')return undefined;
 const active=state.activity?.kind==='processing'&&state.activity.processing?.recipeId===recipe.id
  ?state.activity.processing:undefined;
 const rate=active?.xpPerBatch??professionActionPace(state,recipe,'batch').xpPerAction;
 const normalizedRate=Number.isFinite(rate)?Math.max(0,rate):0;
 const currentXp=Math.max(0,state.skills.find(row=>row.skillId==='cooking')?.xp??0);
 const remainingToCap=Math.max(0,totalXpAtLevel(100)-currentXp);
 const estimatedXp=Math.min(remainingToCap,Math.floor(normalizedRate+1e-9));
 return {estimatedXp,rawXpPerBatch:normalizedRate,remainingToCap,
  maxed:remainingToCap<=0,limitedByCap:remainingToCap<normalizedRate,
  usingReservedRate:!!active};
}
