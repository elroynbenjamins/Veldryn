import {RECIPES,type Recipe} from '../content/skills';
import {itemDef} from '../content/items';
import {craftRecipe} from './game';
import {timedEquipmentRecipe} from './equipment-crafting-queue';
import type {GameState} from './types';

export interface EquipmentPrerequisiteCraftResult{
  state:GameState;
  equipmentRecipeId:string;
  crafted:Array<{recipeId:string;name:string;batches:number;outputItemId:string;quantity:number}>;
}

function quantity(state:GameState,itemId:string){
  return (state.inventory.stacks.find(row=>row.itemId===itemId)?.quantity??0)+(state.bank.stacks.find(row=>row.itemId===itemId)?.quantity??0);
}

function processingRecipeFor(itemId:string):Recipe|undefined{
  return RECIPES.filter(recipe=>{
    if(recipe.output.itemId!==itemId||recipe.skillId!=='smithing'||recipe.noviceSetId||timedEquipmentRecipe(recipe.id))return false;
    return itemDef(recipe.output.itemId).type==='material';
  }).sort((a,b)=>a.level-b.level||a.gold-b.gold||a.seconds-b.seconds)[0];
}

export function equipmentPrerequisiteCraftability(state:GameState,equipmentRecipeId:string){
  const recipe=timedEquipmentRecipe(equipmentRecipeId);if(!recipe)return {available:false,processableMissing:0,missing:[] as string[]};
  const missing=recipe.inputs.filter(input=>quantity(state,input.itemId)<input.quantity);
  const processableMissing=missing.filter(input=>Boolean(processingRecipeFor(input.itemId))).length;
  return {available:processableMissing>0,processableMissing,missing:missing.map(input=>input.itemId)};
}

export function craftEquipmentPrerequisites(state:GameState,equipmentRecipeId:string,nowMs:number):EquipmentPrerequisiteCraftResult{
  const equipment=timedEquipmentRecipe(equipmentRecipeId);if(!equipment)throw new Error('This equipment recipe does not use the forge');
  if(!state.character)throw new Error('Create a character first');
  if(equipment.classId&&equipment.classId!==state.character.classId)throw new Error('This equipment recipe belongs to another class');
  let next=structuredClone(state),stepClock=0;
  const craftedByRecipe=new Map<string,{recipeId:string;name:string;batches:number;outputItemId:string;quantity:number}>();
  const visiting=new Set<string>();

  const ensure=(itemId:string,target:number)=>{
    if(quantity(next,itemId)>=target)return;
    const recipe=processingRecipeFor(itemId);
    if(!recipe)throw new Error(`Need ${target-quantity(next,itemId)} more ${itemDef(itemId).name} from gathering, combat or another external source`);
    if(visiting.has(itemId))throw new Error('Crafting prerequisite cycle detected');
    visiting.add(itemId);
    while(quantity(next,itemId)<target){
      for(const input of recipe.inputs)ensure(input.itemId,input.quantity);
      try{next=craftRecipe(next,recipe.id,nowMs+(++stepClock));}
      catch(error){throw new Error(`Cannot craft prerequisite ${recipe.name}: ${error instanceof Error?error.message:'requirements missing'}`);}
      const existing=craftedByRecipe.get(recipe.id);
      if(existing){existing.batches++;existing.quantity+=recipe.output.quantity;}
      else craftedByRecipe.set(recipe.id,{recipeId:recipe.id,name:recipe.name,batches:1,outputItemId:recipe.output.itemId,quantity:recipe.output.quantity});
    }
    visiting.delete(itemId);
  };

  for(const input of equipment.inputs)ensure(input.itemId,input.quantity);
  if(!craftedByRecipe.size)throw new Error('No processable prerequisites are currently missing');
  return {state:next,equipmentRecipeId,crafted:[...craftedByRecipe.values()]};
}
