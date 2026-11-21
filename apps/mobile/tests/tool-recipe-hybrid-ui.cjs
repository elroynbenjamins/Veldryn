'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=path=>readFileSync(join(__dirname,'..',path),'utf8');
const screen=read('src/screens/SkillsScreen.tsx');
const panel=read('src/components/ToolRecipeInlinePanel.tsx');
const app=read('App.tsx');
const catalog=read('src/content/gathering-tools.ts');
const source=read('src/core/working-toward.ts');

assert.match(screen,/const \[expandedToolId,setExpandedToolId\]=useState<string\|null>\(null\)/,'Only one tool recipe can be expanded per skill screen');
assert.match(screen,/const expanded=expandedToolId===tool\.id/,'Expanded recipe must be the selected tool');
assert.match(screen,/current===tool\.id\?null:tool\.id/,'Tapping an open recipe must collapse it');
assert.match(screen,/setExpandedToolId\(null\)/,'Collapsing tool tiers clears any expanded recipe');
assert.match(screen,/\{expanded\?<ToolRecipeInlinePanel state=\{state\} tool=\{tool\}/,'Inline preview must render below the matching tier, without navigating away');
assert.match(screen,/const action=equipped\?\(\)=>onCommand\(\{type:'unequip_tool',args:\{id:tool\.id\}\}\):carried\?\(\)=>onEquipTool\(tool\.id\):banked\?\(onWithdrawTool\?\(\)=>onWithdrawTool\(tool\.id\):onInventory\):toggleRecipe/,'Tool actions must distinguish equipped unequip, carried equip, bank withdraw and unowned recipe preview');
assert.match(screen,/const showDetailsToggle=equipped\|\|carried\|\|banked/,'Equipped or owned tools must still allow inspecting recipe details');
assert.match(screen,/accessibilityState=\{\{expanded\}\}/,'Disclosure state is available to screen readers');
assert.match(screen,/accessibilityLabel=\{localizedItemName\(language,tool\.id\)\+': '\+actionTitle\}/,'Primary tool action must identify the tool for assistive technology');
assert.match(screen,/const blueprintChanceText=actualBlueprintChance===undefined/,'Displayed blueprint odds must use actual monster drop data');
assert.doesNotMatch(screen,/Math\.round\(tool\.blueprint\.dropChance\*100\)/,'UI must not round sub-one-percent blueprint drops to zero');

assert.match(app,/onWithdrawTool=\{id=>inventoryCommand\(\{type:'withdraw',args:\{id,quantity:1\}\},\(\)=>withdrawFromBank\(state,id,1\)\)/,'Withdraw button must actually transfer one tool using existing server/local validation');
assert.match(app,/toolRecipeReturnRef\.current=\{skillId:selectedSkill,mode:skillsMode/,'Smithing deep link must preserve the original gathering skill for Back');
assert.match(screen,/onOpenSmithing=\{\(\)=>onNavigateCraftingSource\?onNavigateCraftingSource\(recipeDestination\):onViewToolRecipes\(\)\}/,'Full crafting is delegated to the exact Smithing recipe');

assert.match(panel,/recipeAvailability\(state,recipeId\)/,'Inline readiness must use the authoritative crafting availability');
assert.match(panel,/tool\.recipe\.inputs\.map/,'Ingredients must come from the actual recipe definition');
assert.match(panel,/state\.inventory\.stacks,\.\.\.state\.bank\.stacks/,'Ingredient and blueprint quantities include Inventory and Bank');
assert.match(panel,/workingTowardItemSourceEntries\(state,input\.itemId\)/,'Missing materials reuse existing source resolution and region context');
assert.match(panel,/onNavigate\(source\.destination\)/,'Missing material Find source shortcuts must navigate to exact destinations');
assert.match(panel,/otherSourcesOpen\[input\.itemId\]/,'Additional sources must be optionally expandable');
assert.match(panel,/drop=monster\?\.drops\.find/,'Blueprint rate shown comes from actual drop data');
assert.match(panel,/!learned&&tool\.blueprint&&!blueprintHeld/,'Hunt CTA should disappear if blueprint is owned or learned');
assert.match(panel,/minHeight:44/,'Every material source control must meet minimum touch height');
assert.match(panel,/onOpenSmithing/,'Primary craft destination stays available');
assert.doesNotMatch(panel,/onCraft\(/,'Inline recipe is read-only; Smithing retains crafting authority');
assert.match(source,/export function workingTowardItemSourceEntries/,'Material sources have a shared authoritative source provider');
for(const skill of ['mining','woodcutting','fishing']){
 assert.ok(catalog.includes("skillId:'"+skill+"'"),skill+' must retain its tools');
}
assert.ok((catalog.match(/tool\(\{id:/g)||[]).length>=12,'All existing tool tiers must remain in the catalog');
console.log('PASS: compact inline tool recipes, source routes, Bank withdrawal and accessibility');
