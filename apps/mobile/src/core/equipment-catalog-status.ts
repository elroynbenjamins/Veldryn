import {itemDef} from '../content/items';
import type {Recipe} from '../content/skills';
import type {ClassId} from './types';

export type EquipmentCatalogStatus='v33'|'novice'|'starter'|'legacy';
export type RecipeCatalogStatus='active'|'legacy_training'|'retired';

export function equipmentCatalogStatus(itemId:string):EquipmentCatalogStatus|undefined{
  const item=itemDef(itemId);
  if(item.type!=='gear')return undefined;
  if(item.noviceSetId||item.id.startsWith('NOVICE_'))return 'novice';
  if(item.id.startsWith('START_')||item.id.startsWith('basic_'))return 'starter';
  if(/^T[1-9]_/.test(item.equipmentSetId??''))return 'v33';
  return 'legacy';
}

export function isLegacyEquipmentItem(itemId:string){return equipmentCatalogStatus(itemId)==='legacy';}

export function recipeCatalogStatus(recipe:Recipe):RecipeCatalogStatus{
  const output=itemDef(recipe.output.itemId);
  if(output.type!=='gear')return 'active';
  const status=equipmentCatalogStatus(output.id);
  if(status!=='legacy')return 'active';
  return recipe.repeatableTraining&&(recipe.skillId==='tailoring'||recipe.skillId==='enchanting')?'legacy_training':'retired';
}

function classCompatible(recipe:Recipe,classId?:ClassId){return !recipe.classId||!classId||recipe.classId===classId;}

export function visibleRecipeCatalogForSkill(recipes:readonly Recipe[],skillId:Recipe['skillId'],classId?:ClassId){
  const candidates=recipes.filter(recipe=>recipe.skillId===skillId&&!recipe.noviceSetId&&classCompatible(recipe,classId));
  const active=candidates.filter(recipe=>recipeCatalogStatus(recipe)==='active');
  if(active.length)return active;
  return candidates.filter(recipe=>recipeCatalogStatus(recipe)==='legacy_training');
}

export function recipeVisibleInActiveCatalog(recipes:readonly Recipe[],recipe:Recipe,classId?:ClassId){
  if(recipe.noviceSetId)return true;
  const status=recipeCatalogStatus(recipe);
  if(status==='active')return true;
  if(status==='retired')return false;
  return visibleRecipeCatalogForSkill(recipes,recipe.skillId,classId).some(row=>row.id===recipe.id);
}

export function legacyEquipmentNotice(itemId:string){
  return isLegacyEquipmentItem(itemId)
    ?'Legacy compatibility item. Existing copies remain usable, but this item is no longer part of Equipment 2.0 progression.'
    :undefined;
}
