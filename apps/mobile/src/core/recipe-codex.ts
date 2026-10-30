import {ITEMS} from '../content/items';
import {RECIPES,type Recipe} from '../content/skills';
import {isReleasedEquipmentItemId,isReleasedEquipmentTier} from '../content/equipment-release';
import {itemRarity,type ItemRarity} from './item-rarity';
import {workingTowardDestinationAvailability,type WorkingTowardDestination} from './working-toward';
import type {GameState} from './types';

export type RecipeCodexSkill='All'|Recipe['skillId'];
export const RECIPE_CODEX_SKILLS:readonly RecipeCodexSkill[]=['All','smithing','tailoring','cooking','alchemy','enchanting'];
export type RecipeCodexEntry={
 id:string;name:string;skillId:Recipe['skillId'];level:number;outputId:string;outputName:string;quantity:number;rarity:ItemRarity;
 recipe:Recipe;searchText:string;
};
const itemsById=new Map(ITEMS.map(item=>[item.id,item]));
const title=(word:string)=>word.slice(0,1).toUpperCase()+word.slice(1);

/** Immutable search index: no recipe/input calculations during grid rendering. */
const CATALOG:readonly RecipeCodexEntry[]=Object.freeze(RECIPES.filter(recipe=>
 !recipe.noviceSetId&&isReleasedEquipmentItemId(recipe.output.itemId)&&
 (!recipe.v33EquipmentTier||isReleasedEquipmentTier(recipe.v33EquipmentTier))&&
 itemsById.has(recipe.output.itemId)
).map(recipe=>{
 const output=itemsById.get(recipe.output.itemId)!;
 return Object.freeze({
  id:recipe.id,name:recipe.name,skillId:recipe.skillId,level:recipe.level,
  outputId:recipe.output.itemId,outputName:output.name,quantity:recipe.output.quantity,
  rarity:itemRarity(output),recipe,
  searchText:[recipe.name,output.name,recipe.skillId,...recipe.inputs.map(row=>itemsById.get(row.itemId)?.name??row.itemId)]
   .join(' ').toLocaleLowerCase(),
 });
}).sort((a,b)=>a.skillId.localeCompare(b.skillId)||a.level-b.level||a.name.localeCompare(b.name)));
const BY_ID=new Map(CATALOG.map(entry=>[entry.id,entry]));
const BY_SKILL=new Map<RecipeCodexSkill,readonly RecipeCodexEntry[]>(RECIPE_CODEX_SKILLS.map(skill=>
 [skill,skill==='All'?CATALOG:Object.freeze(CATALOG.filter(entry=>entry.skillId===skill))]));
const BY_INGREDIENT=new Map<string,RecipeCodexEntry[]>();
for(const entry of CATALOG)for(const input of entry.recipe.inputs){
 const using=BY_INGREDIENT.get(input.itemId)??[];
 using.push(entry);BY_INGREDIENT.set(input.itemId,using);
}
export function recipeCodexEntries(){return CATALOG;}
export function recipeCodexAvailableForClass(entry:RecipeCodexEntry,classId?:string){return !classId||!entry.recipe.classId||entry.recipe.classId===classId;}
export function recipeCodexEntriesForClass(classId?:string){return CATALOG.filter(entry=>recipeCodexAvailableForClass(entry,classId));}
export function recipeCodexEntryById(id:string){return BY_ID.get(id);}
export function recipeCodexSkillEntries(skill:RecipeCodexSkill):readonly RecipeCodexEntry[]{return BY_SKILL.get(skill)??CATALOG;}
export function recipeCodexUsesIngredient(itemId:string,classId?:string):readonly RecipeCodexEntry[]{return (BY_INGREDIENT.get(itemId)??[]).filter(entry=>recipeCodexAvailableForClass(entry,classId));}
export function recipeCodexFilter(skill:RecipeCodexSkill,search:string,classId?:string):readonly RecipeCodexEntry[]{
 const list=recipeCodexSkillEntries(skill),q=search.trim().toLocaleLowerCase();
 return list.filter(entry=>recipeCodexAvailableForClass(entry,classId)&&(!q||entry.searchText.includes(q)));
}
export function recipeCodexDestination(entry:RecipeCodexEntry):WorkingTowardDestination{
 return {kind:'skills',skillId:entry.skillId,mode:'crafting',recipeId:entry.id,
  button:'View recipe',detail:`Open ${entry.name} under ${title(entry.skillId)}.`};
}
export function recipeCodexIngredients(state:GameState,entry:RecipeCodexEntry){
 const owned=new Map<string,number>();
 for(const stack of state.inventory.stacks)owned.set(stack.itemId,(owned.get(stack.itemId)??0)+stack.quantity);
 for(const stack of state.bank.stacks)owned.set(stack.itemId,(owned.get(stack.itemId)??0)+stack.quantity);
 return entry.recipe.inputs.map(input=>({
  itemId:input.itemId,name:itemsById.get(input.itemId)?.name??input.itemId,knownItem:itemsById.has(input.itemId),
  needed:input.quantity,owned:owned.get(input.itemId)??0,
  sufficient:(owned.get(input.itemId)??0)>=input.quantity,
 }));
}
/** A quick reference status, not the authoritative craft validation/queue check. */
export function recipeCodexRequirements(state:GameState,entry:RecipeCodexEntry){
 const destination=recipeCodexDestination(entry);
 const status=workingTowardDestinationAvailability(state,destination);
 const classRestricted=!!entry.recipe.classId&&state.character?.classId!==entry.recipe.classId;
 return {
  destination,
  status:classRestricted?'locked' as const:status.status,
  detail:classRestricted?`Only ${entry.recipe.classId?.toLowerCase().replace(/_/g,' ')} characters can use this recipe.`:status.detail,
  skillLevel:state.skills.find(skill=>skill.skillId===entry.skillId)?.level??1,
  classRestricted,
 };
}
