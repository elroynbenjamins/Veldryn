import recipes from '../../../data/equipment_exact_recipes_v33.json';
import { inventoryItemIdV25 } from './equipment-resource-map-v25';

export interface InventoryRecipeRequirementV33 { itemId:string; canonicalResource:string; quantity:number; }

export function recipeInventoryRequirementsV33(pieceId:string):InventoryRecipeRequirementV33[]{
  const recipe=recipes.recipes.find(entry=>entry.pieceId===pieceId);
  if(!recipe)throw new Error(`unknown_piece_recipe:${pieceId}`);
  return Object.entries(recipe.expandedRawRequirements).map(([canonicalResource,quantity])=>({
    itemId:inventoryItemIdV25(canonicalResource),canonicalResource,quantity:Number(quantity),
  }));
}

export function missingV33RecipeResourceKeys(pieceId:string):string[]{
  const recipe=recipes.recipes.find(entry=>entry.pieceId===pieceId);
  if(!recipe)throw new Error(`unknown_piece_recipe:${pieceId}`);
  return Object.keys(recipe.expandedRawRequirements).filter(key=>{
    try{inventoryItemIdV25(key);return false;}catch{return true;}
  });
}

export function validateV33RecipeMaterialBindings():string[]{
  const errors:string[]=[];
  for(const recipe of recipes.recipes){
    for(const key of Object.keys(recipe.expandedRawRequirements)){
      try{inventoryItemIdV25(key);}catch{errors.push(`${recipe.pieceId}:${key}`);}
    }
  }
  return errors;
}
