import type {Recipe} from '../content/skills';
import {itemDef} from '../content/items';
import type {GameState} from './types';
import {recipeAvailability} from './playability';
import {equipmentCraftAvailability,equipmentCraftQueueModel} from './equipment-crafting-queue';

export const MAX_INSTANT_CRAFT_QUANTITY=999;

/** The right edge of the slider is the largest currently affordable reservation. */
export function resourceBatchLimit(state:GameState,recipe:Recipe,ceiling=MAX_INSTANT_CRAFT_QUANTITY):number{
 if(!state.character)return 0;
 const stored=(itemId:string)=>[...state.inventory.stacks,...state.bank.stacks]
  .filter(stack=>stack.itemId===itemId).reduce((sum,stack)=>sum+stack.quantity,0);
 const materialLimit=recipe.inputs.length
  ?Math.min(...recipe.inputs.map(input=>Math.floor(stored(input.itemId)/input.quantity)))
  :ceiling;
 const goldLimit=recipe.gold>0?Math.floor(state.character.gold/recipe.gold):ceiling;
 return Math.max(0,Math.min(ceiling,materialLimit,goldLimit));
}

export function instantCraftBatchLimit(state:GameState,recipe:Recipe):number{
 if(!recipeAvailability(state,recipe.id).ready)return 0;
 const kind=itemDef(recipe.output.itemId).type;
 // One-time novice progression and unique equipment/tool outcomes remain deliberate singles.
 if(recipe.noviceSetId||kind==='gear'||kind==='tool')return 1;
 return resourceBatchLimit(state,recipe);
}

export function forgeCraftBatchLimit(state:GameState,recipe:Recipe,now=Date.now()):number{
 if(!equipmentCraftAvailability(state,recipe.id,now).ready)return 0;
 const queue=equipmentCraftQueueModel(state,now);
 if(queue.ready>=20)return 0;
 return resourceBatchLimit(state,recipe,Math.max(0,queue.freeSlots+queue.freeWaiting));
}
