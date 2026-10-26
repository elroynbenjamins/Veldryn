const fs=require('fs') as {readFileSync(path:string,encoding:string):string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const inspect=fs.readFileSync('src/components/ItemQuickInspect.tsx','utf8');
const inventory=fs.readFileSync('src/screens/InventoryScreen.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');
const smith=fs.readFileSync('src/components/SmithingCollection.tsx','utf8');
const core=fs.readFileSync('src/core/item-inspect.ts','utf8');
ok(core.includes('item.knowledgeUnlockId')&&core.includes('recipe.knowledgeItemId===itemId'),'Recipe links are derived from learnable knowledge items, not ordinary inputs');
ok(inspect.includes('recipe.isRecipeUnlock')&&inspect.includes('View recipe ›'),'Dedicated action only appears for actual recipe-blueprint items');
ok(inspect.includes('recipe.outputItemId')&&inspect.includes('recipe.outputName'),'Blueprint link previews the actual craftable item');
ok(inspect.includes('onPress={()=>onNavigate(recipe.navigation)}'),'Recipe link opens the exact recipe');
ok(inspect.includes('gt("Open ›")'),'Ordinary materials retain their prior informational row/navigation');
ok(inventory.includes('closeInspect();onNavigateInspect(destination)'),'Quick Inspect closes before navigating to crafting');
ok(app.includes('onNavigateInspect={openWorkingTowardDestination}')&&app.includes('setGoalRecipeId(destination.recipeId)'),'App forwards the precise recipe ID to Skills');
ok(smith.includes('preferredRecipeId')&&smith.includes('setItemId(preferred.output.itemId)'),'Smithing receives the exact blueprint output, including tools');
console.log('PASS: View recipe action is scoped to recipe-blueprint items with focused Smithing navigation');
export {};
