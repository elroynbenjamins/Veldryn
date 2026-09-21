import {RECIPES,type Recipe} from '../content/skills';
import {itemDef} from '../content/items';
import type {GameState,SkillId} from './types';
import {formatQueueTimeV31} from './equipment-crafting-v31';
import {workingTowardDestinationAvailability,workingTowardItemSource,type WorkingTowardDestination,type WorkingTowardDestinationAvailability} from './working-toward';

export interface EquipmentCraftingIngredientPlan{
  itemId:string;
  name:string;
  required:number;
  owned:number;
  missing:number;
  source:WorkingTowardDestination;
  availability:WorkingTowardDestinationAvailability;
}
export interface EquipmentCraftingBlocker{
  kind:'class'|'character_level'|'skill'|'gold'|'material';
  label:string;
  detail:string;
  destination?:WorkingTowardDestination;
  availability?:WorkingTowardDestinationAvailability;
}
export interface EquipmentCraftingPath{
  itemId:string;
  recipe:Recipe;
  tier?:string;
  region?:string;
  setId?:string;
  path?:string;
  craftTimeLabel:string;
  skillLabel:string;
  characterLevel:number;
  gold:number;
  ingredients:EquipmentCraftingIngredientPlan[];
  blockers:EquipmentCraftingBlocker[];
  canCraftNow:boolean;
}

function owned(state:GameState,itemId:string){
  const inv=state.inventory.stacks.find(row=>row.itemId===itemId)?.quantity??0;
  const bank=state.bank.stacks.find(row=>row.itemId===itemId)?.quantity??0;
  return inv+bank;
}
function label(id:string){return id.replace(/_/g,' ').replace(/\b\w/g,char=>char.toUpperCase());}

export function equipmentRecipeForItem(itemId:string){
  const recipes=RECIPES.filter(recipe=>recipe.output.itemId===itemId);
  return recipes.find(recipe=>recipe.v33SetId)??recipes.sort((a,b)=>a.level-b.level||a.seconds-b.seconds)[0];
}

export function equipmentCraftingPath(state:GameState,itemId:string):EquipmentCraftingPath|undefined{
  if(!state.character)return undefined;
  const item=itemDef(itemId);if(item.type!=='gear')return undefined;
  const recipe=equipmentRecipeForItem(itemId);if(!recipe)return undefined;
  const ingredients=recipe.inputs.map(input=>{
    const quantity=owned(state,input.itemId),source=workingTowardItemSource(state,input.itemId);
    return {itemId:input.itemId,name:itemDef(input.itemId).name,required:input.quantity,owned:quantity,missing:Math.max(0,input.quantity-quantity),source,availability:workingTowardDestinationAvailability(state,source)};
  });
  const blockers:EquipmentCraftingBlocker[]=[];
  if(recipe.classId&&recipe.classId!==state.character.classId)blockers.push({kind:'class',label:'Wrong class',detail:`Requires ${label(recipe.classId)}.`});
  const characterLevel=recipe.characterLevel??1;
  if(state.character.level<characterLevel)blockers.push({kind:'character_level',label:`Character Lv ${characterLevel}`,detail:`Reach character level ${characterLevel}.`,destination:{kind:'info',button:'Level character',detail:`Reach character level ${characterLevel}.`}});
  const skill=state.skills.find(row=>row.skillId===recipe.skillId),skillLevel=skill?.level??1;
  if(skillLevel<recipe.level){
    const destination:WorkingTowardDestination={kind:'skills',skillId:recipe.skillId as SkillId,mode:'crafting',button:`Train ${label(recipe.skillId)}`,detail:`Requires ${label(recipe.skillId)} level ${recipe.level}.`};
    blockers.push({kind:'skill',label:`${label(recipe.skillId)} Lv ${recipe.level}`,detail:`Current level ${skillLevel}.`,destination,availability:workingTowardDestinationAvailability(state,destination)});
  }
  if(state.character.gold<recipe.gold)blockers.push({kind:'gold',label:`${recipe.gold.toLocaleString()} Gold`,detail:`Missing ${(recipe.gold-state.character.gold).toLocaleString()} Gold.`});
  for(const ingredient of ingredients.filter(row=>row.missing>0))blockers.push({kind:'material',label:ingredient.name,detail:`Need ${ingredient.missing} more · ${ingredient.owned}/${ingredient.required} owned.`,destination:ingredient.source,availability:ingredient.availability});
  return {
    itemId,recipe,tier:recipe.v33EquipmentTier,region:recipe.v33Region,setId:recipe.v33SetId,path:recipe.v33Path,
    craftTimeLabel:formatQueueTimeV31(recipe.seconds),skillLabel:`${label(recipe.skillId)} Lv ${recipe.level}`,
    characterLevel,gold:recipe.gold,ingredients,blockers,canCraftNow:blockers.length===0,
  };
}
