import {RECIPES} from '../content/skills';
import {recipePreparationRoute} from './material-acquisition-plan';
import type {GameState} from './types';

export interface WorkingTowardInventoryProtection{
  itemId:string;
  goalIds:string[];
  goalTitles:string[];
  reservedQuantity:number;
  kinds:Array<'item_goal'|'preparation_input'|'preparation_output'>;
}

function addProtection(
  rows:Map<string,WorkingTowardInventoryProtection>,
  itemId:string,
  goalId:string,
  goalTitle:string,
  quantity:number,
  kind:WorkingTowardInventoryProtection['kinds'][number],
){
  const current=rows.get(itemId)??{itemId,goalIds:[],goalTitles:[],reservedQuantity:0,kinds:[]};
  if(!current.goalIds.includes(goalId))current.goalIds.push(goalId);
  if(!current.goalTitles.includes(goalTitle))current.goalTitles.push(goalTitle);
  if(!current.kinds.includes(kind))current.kinds.push(kind);
  current.reservedQuantity+=Math.max(0,quantity);
  rows.set(itemId,current);
}

export function workingTowardInventoryProtections(state:GameState):WorkingTowardInventoryProtection[]{
  const rows=new Map<string,WorkingTowardInventoryProtection>();
  for(const goal of state.character?.progressionGoals??[]){
    if(goal.kind==='item_quantity'){
      addProtection(rows,goal.itemId,goal.id,goal.title,goal.targetQuantity,'item_goal');
      continue;
    }
    if(goal.kind!=='recipe_preparation')continue;
    const recipe=RECIPES.find(row=>row.id===goal.recipeId);
    if(!recipe)continue;
    const route=recipePreparationRoute(state,recipe,goal.batches);
    for(const reserved of route.reservedItems)addProtection(rows,reserved.itemId,goal.id,goal.title,reserved.quantity,'preparation_input');
    addProtection(rows,goal.outputItemId,goal.id,goal.title,goal.targetOutputQuantity,'preparation_output');
  }
  return [...rows.values()].sort((a,b)=>a.itemId.localeCompare(b.itemId));
}

export function workingTowardInventoryProtectionMap(state:GameState){
  return new Map(workingTowardInventoryProtections(state).map(row=>[row.itemId,row] as const));
}
