import recipes from '../../../data/equipment_exact_recipes_v33.json';
import { inventoryItemIdV25 } from './equipment-resource-map-v25';

export interface InventoryRecipeRequirementV33 { itemId:string; canonicalResource:string; quantity:number; }

export const RETIRED_EQUIPMENT_RESOURCE_KEYS_V33=new Set<string>(['asterfall.echo_bat_wing']);
export const RETIRED_EQUIPMENT_ITEM_IDS_V33=new Set<string>(['ITEM_0077']);

function inventoryRequirementV33(canonicalResource:string,quantity:number):InventoryRecipeRequirementV33{
  const itemId=inventoryItemIdV25(canonicalResource);
  if(RETIRED_EQUIPMENT_RESOURCE_KEYS_V33.has(canonicalResource)||RETIRED_EQUIPMENT_ITEM_IDS_V33.has(itemId))
    throw new Error(`retired_equipment_resource:${canonicalResource}:${itemId}`);
  return {itemId,canonicalResource,quantity};
}

export function recipeInventoryRequirementsV33(pieceId:string):InventoryRecipeRequirementV33[]{
  const recipe=recipes.recipes.find(entry=>entry.pieceId===pieceId);
  if(!recipe)throw new Error(`unknown_piece_recipe:${pieceId}`);
  return Object.entries(recipe.expandedRawRequirements).map(([canonicalResource,quantity])=>
    inventoryRequirementV33(canonicalResource,Number(quantity)));
}

export function missingV33RecipeResourceKeys(pieceId:string):string[]{
  const recipe=recipes.recipes.find(entry=>entry.pieceId===pieceId);
  if(!recipe)throw new Error(`unknown_piece_recipe:${pieceId}`);
  return Object.keys(recipe.expandedRawRequirements).filter(key=>{
    if(RETIRED_EQUIPMENT_RESOURCE_KEYS_V33.has(key))return true;
    try{return RETIRED_EQUIPMENT_ITEM_IDS_V33.has(inventoryItemIdV25(key));}catch{return true;}
  });
}

export function validateV33RecipeMaterialBindings():string[]{
  const errors:string[]=[];
  for(const recipe of recipes.recipes){
    for(const key of Object.keys(recipe.expandedRawRequirements)){
      if(RETIRED_EQUIPMENT_RESOURCE_KEYS_V33.has(key)){errors.push(`${recipe.pieceId}:retired:${key}`);continue;}
      try{
        const itemId=inventoryItemIdV25(key);
        if(RETIRED_EQUIPMENT_ITEM_IDS_V33.has(itemId))errors.push(`${recipe.pieceId}:retired-item:${key}:${itemId}`);
      }catch{errors.push(`${recipe.pieceId}:${key}`);}
    }
  }
  return errors;
}
