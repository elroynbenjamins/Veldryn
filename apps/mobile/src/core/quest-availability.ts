import type {GameState} from './types';
import type {WeeklyOrder} from './weekly-orders-v41';
import {weeklyOrderDestination} from './weekly-order-integrations-v41';
import {workingTowardDestinationAvailability} from './working-toward';
import {MONSTERS} from '../content/monsters';
import {RECIPES} from '../content/skills';
import {itemDef} from '../content/items';

/** Live progression locks, not temporary travel, health, or material shortages. */
export function weeklyOrderLockReason(state:GameState,order:WeeklyOrder):string|undefined{
 if(order.claimed||order.progress>=order.target)return undefined;
 if(!state.character)return 'Create a character first.';
 const destination=weeklyOrderDestination(order);
 const availability=workingTowardDestinationAvailability(state,destination);
 if(availability.status==='locked')return availability.detail;
 if(order.kind==='hunt'){
  const monster=MONSTERS.find(row=>row.id===order.targetId);
  if(!monster)return 'This encounter is not available.';
  if(monster.boss&&!state.defeatedBossIds.includes(monster.id))return `Defeat ${monster.name} in the story first.`;
  if(!monster.boss&&!state.unlockedMonsterIds.includes(monster.id))return `Discover ${monster.name} in ${monster.zone} first.`;
 }
 if(order.kind==='profession'&&destination.kind==='skills'&&destination.recipeId){
  const recipe=RECIPES.find(row=>row.id===destination.recipeId);
  if(recipe?.classId&&recipe.classId!==state.character.classId)return 'This recipe belongs to another class.';
  if(recipe?.requiresCraftedItemId&&!state.character.craftedNoviceItemIds?.includes(recipe.requiresCraftedItemId))return `Craft ${itemDef(recipe.requiresCraftedItemId).name} first.`;
 }
 return undefined;
}
