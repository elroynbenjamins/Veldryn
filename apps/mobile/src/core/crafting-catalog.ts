import type {GameState,SkillId} from './types';
import {RECIPES} from '../content/skills';
import {itemDef} from '../content/items';
import {recipeAvailability} from './playability';

export type RecipeFilter='all'|'favorites'|'craftable'|'locked';
export type RecipeSort='favorite'|'level'|'name';
export function visibleRecipes(state:GameState,skillId:SkillId,query='',filter:RecipeFilter='all',sort:RecipeSort='level'){
  const term=query.trim().toLowerCase(),favorites=new Set(state.account.collectionPreferences?.favoriteRecipeIds??[]),skill=state.skills.find(entry=>entry.skillId===skillId);
  return RECIPES.filter(recipe=>recipe.skillId===skillId&&!recipe.noviceSetId).map(recipe=>({recipe,status:recipeAvailability(state,recipe.id),favorite:favorites.has(recipe.id)})).filter(row=>{
    const output=itemDef(row.recipe.output.itemId),matches=!term||row.recipe.name.toLowerCase().includes(term)||output.name.toLowerCase().includes(term);
    if(!matches)return false;
    if(filter==='favorites'&&!row.favorite)return false;
    if(filter==='craftable'&&!row.status.ready)return false;
    if(filter==='locked'&&(skill?.level??0)>=row.recipe.level)return false;
    return true;
  }).sort((a,b)=>{
    const fav=sort==='favorite'?Number(b.favorite)-Number(a.favorite):0;
    const primary=sort==='name'?a.recipe.name.localeCompare(b.recipe.name):a.recipe.level-b.recipe.level;
    return fav||primary||a.recipe.name.localeCompare(b.recipe.name);
  });
}
