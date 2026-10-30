import {createCharacter,newGame} from '../src/core/game';
import {RECIPES} from '../src/content/skills';
import {isReleasedEquipmentItemId,isReleasedEquipmentTier} from '../src/content/equipment-release';
import {recipeCodexDestination,recipeCodexEntries,recipeCodexEntryById,recipeCodexFilter,recipeCodexIngredients,recipeCodexRequirements,recipeCodexSkillEntries,recipeCodexUsesIngredient,RECIPE_CODEX_SKILLS} from '../src/core/recipe-codex';
function check(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message)}
const entries=recipeCodexEntries();
check(entries.length>10,'The recipe catalog must contain published crafting recipes.');
check(entries===recipeCodexEntries(),'The static recipe index must be reused.');
check(new Set(entries.map(row=>row.id)).size===entries.length,'Recipe identity must be unique.');
check(entries.every(row=>!row.recipe.noviceSetId),'Novice workshop recipes must not appear as normal crafting recipes.');
check(entries.every(row=>isReleasedEquipmentItemId(row.outputId)),'Unreleased equipment output must be hidden.');
check(entries.every(row=>!row.recipe.v33EquipmentTier||isReleasedEquipmentTier(row.recipe.v33EquipmentTier)),'Future equipment tier must be gated.');
for(const skill of RECIPE_CODEX_SKILLS){
 check(recipeCodexSkillEntries(skill)===recipeCodexSkillEntries(skill),'Skill list should be cached.');
 if(skill!=='All')check(recipeCodexSkillEntries(skill).every(row=>row.skillId===skill),'Recipe skill filter is wrong.');
}
check(recipeCodexFilter('All','').length===entries.length,'All recipes should be shown without search.');
const silverfin=recipeCodexEntryById('COOK_SILVERFIN');
check(silverfin,'Missing released Silverfin cooking recipe.');
check(recipeCodexFilter('cooking','silverfin').some(row=>row.id===silverfin.id),'Search recipe names.');
check(recipeCodexFilter('All','silverfin').some(row=>row.id===silverfin.id),'Search ingredient names.');
check(recipeCodexUsesIngredient('SILVERFIN').some(row=>row.id==='COOK_SILVERFIN'),'Resource to recipe reverse link.');
const state=createCharacter(newGame(Date.UTC(2026,9,30)),'IRONWARDEN','Recipe Codex Test');
const material=recipeCodexIngredients(state,silverfin).find(row=>row.itemId==='SILVERFIN');
check(material?.needed===5,'Recipe ingredient quantities must use real recipes.');
const stocked={...state,inventory:{...state.inventory,stacks:[{itemId:'SILVERFIN',quantity:3}]},bank:{...state.bank,stacks:[{itemId:'SILVERFIN',quantity:2}]}};
check(recipeCodexIngredients(stocked,silverfin).find(row=>row.itemId==='SILVERFIN')?.sufficient===true,'Ingredient counts must combine Inventory and Bank.');
const route=recipeCodexDestination(silverfin);
check(route.kind==='skills'&&route.recipeId===silverfin.id,'Recipe route must target the exact recipe.');
check(recipeCodexDestination(silverfin).kind==='skills','Recipes must navigate to Skills.');
const locked=recipeCodexEntryById('ENCHANT_RADIANT_CATALYST');
check(locked,'Missing high-level released catalyst recipe.');
check(recipeCodexRequirements(state,locked).status==='locked','Unavailable crafting skills must be labeled locked.');
check(recipeCodexRequirements(state,silverfin).skillLevel>=1,'Current skill level must derive from live state.');
check(entries.every(row=>RECIPES.some(recipe=>recipe.id===row.id)),'Every Codex entry must exist in the authoritative recipe catalog.');
console.log('PASS: Recipe Codex published catalog, cached search, reverse ingredient links, and live requirements');