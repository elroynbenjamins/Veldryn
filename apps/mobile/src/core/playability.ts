import {RECIPES} from '../content/skills';
import {GameState} from './types';
import {claimActivity,craftRecipe,startCombat,startGathering,stopActivity} from './game';

/** Settle earned rewards before replacing or stopping an activity. Pure and atomic. */
export function transitionActivity(state:GameState,nowMs:number,next?:{kind:'combat'|'gathering';id:string}){
  const claimed=claimActivity(state,nowMs);
  const updated=next
    ?next.kind==='combat'?startCombat(claimed.state,next.id,nowMs):startGathering(claimed.state,next.id,nowMs)
    :stopActivity(claimed.state);
  return {state:updated,reward:claimed.reward};
}

/** Reuse the pure craft operation so UI checks include bank use and output capacity. */
export function recipeAvailability(state:GameState,recipeId:string){
  const recipe=RECIPES.find(item=>item.id===recipeId);
  if(!recipe)return {ready:false,reason:'Unknown recipe',inputs:[]};
  const inputs=recipe.inputs.map(input=>({ ...input,
    inventory:state.inventory.stacks.find(stack=>stack.itemId===input.itemId)?.quantity??0,
    bank:state.bank.stacks.find(stack=>stack.itemId===input.itemId)?.quantity??0,
  }));
  try{craftRecipe(state,recipeId);return {ready:true,reason:'Ready to craft',inputs}}
  catch(error){return {ready:false,reason:error instanceof Error?error.message:'Cannot craft yet',inputs}}
}
