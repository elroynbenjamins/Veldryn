const fs=require('fs') as {readFileSync(path:string,encoding:string):string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const inspect=fs.readFileSync('src/components/ItemQuickInspect.tsx','utf8');
const inventory=fs.readFileSync('src/screens/InventoryScreen.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');
const smith=fs.readFileSync('src/components/SmithingCollection.tsx','utf8');
const novice=fs.readFileSync('src/components/NoviceWorkshop.tsx','utf8');
const skills=fs.readFileSync('src/screens/SkillsScreen.tsx','utf8');
ok(inspect.includes('USED IN CRAFTING')&&inspect.includes('recipe.outputName')&&inspect.includes('recipe.outputItemId'),'Crafting use shows actual resulting item, not only the recipe name');
ok(inspect.includes('View recipe ›')&&inspect.includes('onPress={()=>onNavigate(recipe.navigation)}'),'Each valid craft use has an explicit view-recipe button');
ok(inspect.includes('recipe.availability.canNavigate'),'A recipe outside the current class cannot open a hidden card');
ok(inventory.includes('closeInspect();onNavigateInspect(destination)'),'Quick Inspect closes before navigating to crafting');
ok(app.includes('onNavigateInspect={openWorkingTowardDestination}')&&app.includes('setGoalRecipeId(destination.recipeId)'),'App navigation sends precise recipe ID to Skills');
ok(smith.includes('setDetailsOpen(!!preferred.v33SetId)')&&smith.includes('preferredRecipeId'),'Equipment recipes show their focused details when deep-linked');
ok(skills.includes('initialRecipeId={initialRecipeId}')&&novice.includes('initialRecipeId'),'Novice workshop receives exact recipe focus');
ok(skills.includes('preferredRecipeId={initialRecipeId}'),'Non-equipment crafting recipes retain preferred-recipe focus');
console.log('PASS: Quick Inspect crafting use button and destination UI wiring');
export {};
