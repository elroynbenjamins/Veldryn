import {V33_EQUIPMENT_RECIPES} from '../content/equipment-recipes-v33';

export interface V33EquipmentMaterialUse{
  itemId:string;
  tiers:string[];
  regions:string[];
  paths:string[];
  recipeCount:number;
}

const tierNumber=(tier:string)=>Number(tier.replace(/\D/g,''))||0;
const materialUseById=new Map<string,{tiers:Set<string>;regions:Set<string>;paths:Set<string>;recipeCount:number}>();

for(const recipe of V33_EQUIPMENT_RECIPES){
  for(const input of recipe.inputs){
    const current=materialUseById.get(input.itemId)??{tiers:new Set<string>(),regions:new Set<string>(),paths:new Set<string>(),recipeCount:0};
    current.tiers.add(recipe.v33EquipmentTier);
    current.regions.add(recipe.v33Region);
    current.paths.add(recipe.v33Path);
    current.recipeCount++;
    materialUseById.set(input.itemId,current);
  }
}

export function v33EquipmentMaterialUse(itemId:string):V33EquipmentMaterialUse|undefined{
  const current=materialUseById.get(itemId);
  if(!current)return undefined;
  return {
    itemId,
    tiers:[...current.tiers].sort((a,b)=>tierNumber(a)-tierNumber(b)),
    regions:[...current.regions].sort(),
    paths:[...current.paths].sort(),
    recipeCount:current.recipeCount,
  };
}

export function isV33EquipmentCraftingMaterial(itemId:string){return materialUseById.has(itemId);}

export function v33EquipmentMaterialLabel(itemId:string){
  const use=v33EquipmentMaterialUse(itemId);
  if(!use)return undefined;
  const tiers=use.tiers.length<=3?use.tiers.join('/'):use.tiers[0]+'–'+use.tiers[use.tiers.length-1];
  return `EQUIPMENT 2.0 · ${tiers} MATERIAL`;
}
