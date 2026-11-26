'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'../',file),'utf8');

const recipe=read('src/components/RecipeCard.tsx');
const ingredient=read('src/components/IngredientList.tsx');
const equipment=read('src/components/SmithingCollection.tsx');
const browser=read('src/components/CraftingRecipeBrowser.tsx');
const language=read('src/i18n/gameplay.ts');

// Three mutually exclusive detail tabs replace the tall, stacked mastery/pace/source view.
assert.match(recipe,/useState<'materials'\|'stats'\|'progress'>\('materials'\)/);
assert.match(recipe,/accessibilityRole="tablist"/);
assert.match(recipe,/accessibilityRole="tab"/);
assert.match(recipe,/detailTab==='progress'\?<>{pace\?/);
assert.match(recipe,/detailTab==='stats'\?<>{recipe\.v33EquipmentTier/);
assert.match(recipe,/detailTab==='materials'\?<><Text/);
assert.match(recipe,/sourceHelpOpen\?<>{preparationRoute/);
assert.match(recipe,/accessibilityState=\{\{expanded:sourceHelpOpen\}\}/);

// Refinement pass 4: clearer labels and stable action summary with real quantity and work time.
assert.match(recipe,/detail==='materials'\?'Requirements'/);
assert.match(equipment,/gt\('Components'\)/);
assert.match(recipe,/gt\('Crafting summary'\)/);
assert.match(recipe,/totalMaterialUnits=quantityInputs\.reduce/);
assert.match(recipe,/workTime=timed\?duration/);
assert.match(recipe,/firstAvailableSource&&onNavigate/);
assert.match(recipe,/canQuickTrack&&preparationRoute&&onTrackPreparation/);
assert.match(recipe,/canQuickPrereq&&onCraftPrerequisites/);
assert.match(equipment,/materialUnits=\(status\?\.inputs\?\?\[\]\)\.reduce/);
for(const key of ['Professions','Components','Requirements','Crafting summary','Total cost','Missing a material?','No Gold refunded'])assert.ok(language.includes("'"+key+"':"),'Missing shared localization for '+key);

// Never remove item artwork to achieve a compact design. Show shortages first.
assert.match(ingredient,/ItemArtwork itemId=\{input\.itemId\} size=\{compact\?28:32\}/);
assert.match(ingredient,/const rows=compact\?\[\.\.\.inputs\]\.sort/);
assert.match(ingredient,/fontScale<1\.3/);
assert.match(ingredient,/enough\?' ✓':' !'/);
assert.match(recipe,/ItemArtwork itemId=\{first\.itemId\} size=\{22\}/);
assert.match(recipe,/externalQuantity\?\?quantity/);

// Equipment reuses the one detail view, not a second full RecipeCard accordion
// after a separate material grid. Its existing forge quantity and CTA still own crafting.
assert.match(equipment,/detailsOnly externalQuantity=\{craftCount\}/);
assert.match(equipment,/CraftQuantitySelector key=\{recipe\.id\} value=\{craftCount\}/);
assert.match(equipment,/void onCraft\(recipe\.id,craftCount\)/);
assert.doesNotMatch(equipment,/Details & sources/);
assert.doesNotMatch(equipment,/s\.ingredients\>\{status\.inputs\.map/);
assert.match(recipe,/ForgeOddsGuide itemId=\{output\.id\} forgeLevel=\{state\.skills\.find/);
assert.match(recipe,/WeaponBonusPool key=\{output\.id\}/);

// Normal recipe lists still open at most one recipe, with the same craft action.
assert.match(browser,/controlledExpanded=\{openRecipeKey===recipeGroup\.key\}/);
assert.match(recipe,/onExpandedChange\?\.\(open\)/);
assert.match(recipe,/\[wantedQuantity,setWantedQuantity\]=useState\(1\)/);
assert.match(recipe,/!detailsOnly\?<GameButton title=\{craftConfirmed/);
for(const label of ['Stats','Progress','Materials & sources'])assert.ok(language.includes("'"+label+"'")||language.includes('"'+label+'"'),'Missing translation for '+label);
console.log('PASS: compact tabbed crafting details preserve icons, quantities, sources and forge actions');
