import type {GameState} from './types';
import type {Recipe} from '../content/skills';
import {itemDef} from '../content/items';
import {craftedInstancesForItem} from './crafted-gear-instances';
import type {ProgressionGoal} from './progression-goals-v40';

export type RecipePreparationGoal=Extract<ProgressionGoal,{kind:'recipe_preparation'}>;

export function recipeOutputOwnedQuantity(state:GameState,itemId:string){
 const item=itemDef(itemId);
 if(item.type==='gear')return craftedInstancesForItem(state,itemId,state.character?.id).length;
 const stored=[...state.inventory.stacks,...state.bank.stacks].filter(stack=>stack.itemId===itemId).reduce((sum,stack)=>sum+stack.quantity,0);
 const equippedTool=item.type==='tool'&&Object.values(state.character?.equippedToolIds??{}).includes(itemId)?1:0;
 const equippedFood=item.type==='food'&&state.character?.equippedFoodId===itemId?1:0;
 return stored+equippedTool+equippedFood;
}

export function recipePreparationGoalForRecipe(args:{state:GameState;recipe:Recipe;batches:number;initialStepCount:number;nowMs:number}):RecipePreparationGoal{
 const character=args.state.character;if(!character)throw new Error('character_required');
 const batches=Math.max(1,Math.min(100,Math.floor(args.batches))),initialStepCount=Math.max(1,Math.min(99,Math.floor(args.initialStepCount)));
 const baselineOutputQuantity=recipeOutputOwnedQuantity(args.state,args.recipe.output.itemId);
 const targetOutputQuantity=baselineOutputQuantity+Math.max(1,args.recipe.output.quantity*batches);
 return {
  id:`goal:${args.nowMs}:prepare:${args.recipe.id}`,
  characterId:character.id,
  kind:'recipe_preparation',
  title:`Prepare · ${args.recipe.name}`,
  createdAtMs:args.nowMs,
  pinnedAtMs:args.nowMs,
  recipeId:args.recipe.id,
  batches,
  outputItemId:args.recipe.output.itemId,
  initialStepCount,
  baselineOutputQuantity,
  targetOutputQuantity,
 };
}

export function trackedRecipePreparationGoal(state:GameState,recipeId:string){
 return state.character?.progressionGoals?.find((goal):goal is RecipePreparationGoal=>goal.kind==='recipe_preparation'&&goal.recipeId===recipeId);
}
