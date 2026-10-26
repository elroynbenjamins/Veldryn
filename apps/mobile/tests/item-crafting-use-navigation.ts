import {createCharacter,newGame} from '../src/core/game';
import {itemInspectModel} from '../src/core/item-inspect';
import {RECIPES} from '../src/content/skills';
import {TOOL_BLUEPRINT_ITEMS} from '../src/content/gathering-tools';
import {prioritizeItemUses} from '../src/core/item-source-display';
function ok(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message);}
const state=createCharacter(newGame(1000),'IRONWARDEN','Blueprint Link Test');

// Ordinary materials continue listing their uses but do not gain the blueprint-only button.
const copper=itemInspectModel(state,'COPPER_ORE');
const smelt=copper.usedIn.find(row=>row.recipeId==='SMELT_COPPER_INGOT');
ok(!!smelt,'Copper Ore still lists its smelting recipe');
ok(!smelt.isRecipeUnlock&&smelt.quantity===10,'Normal ingredients retain their required quantity and ordinary row presentation');
ok(prioritizeItemUses(copper.usedIn).some(row=>row.recipeId===smelt.recipeId),'Existing ingredient use ordering is preserved');

// Actual learnable blueprints are quest/knowledge items, not crafting ingredients.
ok(TOOL_BLUEPRINT_ITEMS.length>0,'The game has authored recipe-blueprint items');
for(const blueprint of TOOL_BLUEPRINT_ITEMS){
  const recipe=RECIPES.find(row=>row.knowledgeItemId===blueprint.id&&row.requiredKnowledgeId===blueprint.knowledgeUnlockId);
  ok(!!recipe,'Every recipe blueprint corresponds to a real, learnable crafting recipe: '+blueprint.id);
  const inspect=itemInspectModel(state,blueprint.id);
  const link=inspect.usedIn.find(row=>row.recipeId===recipe.id);
  ok(!!link&&link.isRecipeUnlock,'Inspecting a recipe blueprint exposes its craftable item: '+blueprint.id);
  ok(link.quantity===0,'Blueprint is a knowledge unlock, not a per-craft ingredient: '+blueprint.id);
  ok(link.outputItemId===recipe.output.itemId,'Blueprint opens the actual craftable item: '+blueprint.id);
  ok(link.navigation.kind==='skills'&&link.navigation.mode==='crafting'&&link.navigation.skillId===recipe.skillId&&link.navigation.recipeId===recipe.id,'Blueprint links to the precise crafting recipe: '+blueprint.id);
  ok(link.availability.canNavigate===true,'Locked crafting requirements must not prevent viewing the recipe: '+blueprint.id);
}
console.log('PASS: recipe-blueprint items link to their actual crafted output; ordinary ingredients keep their previous uses');
