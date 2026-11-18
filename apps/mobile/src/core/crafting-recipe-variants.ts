import type {Recipe} from '../content/skills';
import {itemDef} from '../content/items';

/**
 * Collapse genuinely interchangeable two-route material crafts into one card.
 * Equipment paths, recipes with different rewards/requirements, and recipes
 * with more than two variants remain separate.
 * Recipe IDs are intentionally preserved for saves, mastery and server calls.
 */
export type CraftingRecipeGroup={key:string;recipes:Recipe[]};

export function groupTwoVariantCraftingRecipes(recipes:readonly Recipe[]):CraftingRecipeGroup[]{
 const byOutput=new Map<string,Recipe[]>();
 // Every route to the same skill+output counts toward the "exactly two" rule, including
 // ones that are not themselves eligible (knowledge-locked, class recipes, ...).
 const routesByOutput=new Map<string,number>();
 for(const recipe of recipes){
  const routeKey=recipe.skillId+':'+recipe.output.itemId;
  routesByOutput.set(routeKey,(routesByOutput.get(routeKey)??0)+1);
 }
 for(const recipe of recipes){
  if(!recipe.repeatableTraining||recipe.noviceSetId||recipe.v33SetId||recipe.classId||recipe.requiredKnowledgeId||!['smithing','tailoring'].includes(recipe.skillId))continue;
  if(itemDef(recipe.output.itemId).type!=='material')continue;
  const key=recipe.skillId+':'+recipe.output.itemId;
  const list=byOutput.get(key)??[];
  list.push(recipe);
  byOutput.set(key,list);
 }
 const variants=new Map<string,Recipe[]>();
 for(const [key,list] of byOutput){
  if(list.length!==2||routesByOutput.get(key)!==2)continue;
  const [first,second]=list;
  if(first.level!==second.level||first.characterLevel!==second.characterLevel||first.gold!==second.gold||first.xp!==second.xp||first.seconds!==second.seconds||first.output.quantity!==second.output.quantity)continue;
  if(JSON.stringify(first.inputs)===JSON.stringify(second.inputs))continue;
  variants.set(key,list);
 }
 const seen=new Set<string>();
 const groups:CraftingRecipeGroup[]=[];
 for(const recipe of recipes){
  const key=recipe.skillId+':'+recipe.output.itemId;
  const pair=variants.get(key);
  // Only the two paired recipes merge; any other recipe keeps its own card.
  if(!pair||!pair.includes(recipe)){groups.push({key:recipe.id,recipes:[recipe]});continue;}
  if(seen.has(key))continue;
  seen.add(key);
  groups.push({key,recipes:pair});
 }
 return groups;
}
