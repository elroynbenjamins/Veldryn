import {RECIPES} from '../content/skills';
import type {ActivityKind} from './types';
import type {ActivityIconId} from '../theme/skill-assets';

// Processing is shared by Smithing, Cooking, Tailoring and Enchanting.
// Use the saved recipe ID rather than assuming every processing job is Cooking.
const recipeSkillById=new Map(RECIPES.map(recipe=>[recipe.id,recipe.skillId]));

export function activityIconId(activity:{kind:ActivityKind;targetId:string}):ActivityIconId {
 const {kind,targetId}=activity;
 if(kind==='processing'||kind==='alchemy'){
  return recipeSkillById.get(targetId)??(kind==='alchemy'?'alchemy':'smithing');
 }
 return kind;
}
