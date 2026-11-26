'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=path=>readFileSync(join(__dirname,'..',path),'utf8');
const screen=read('src/screens/SkillsScreen.tsx');
const toolPanel=read('src/components/GatheringToolLoadoutPanel.tsx');
const panel=read('src/components/ToolRecipeInlinePanel.tsx');
const app=read('App.tsx');
const catalog=read('src/content/gathering-tools.ts');
const source=read('src/core/working-toward.ts');

assert.match(screen,/<GatheringToolLoadoutPanel state=\{state\} skillId=\{gatheringSkill\}/,'Skill screen delegates to the reviewed tier-first tool panel');
assert.match(toolPanel,/const \[opened,setOpened\]=useState<Tier\|null>\(null\)/,'Tool details begin collapsed with only the tier buttons visible');
assert.match(toolPanel,/const selected=opened===null\?undefined:tools\.find\(tool=>tool\.tier===opened\)/,'Only the selected tier may be inspected');
assert.match(toolPanel,/setOpened\(current=>current===tier\?null:tier\)/,'Tapping an open tier collapses its details');
assert.match(toolPanel,/const \[tab,setTab\]=useState<Tab>\('saved'\)/,'Saved copies are the first detail tab');
assert.match(toolPanel,/\{tab==='recipe'\?<ToolRecipeInlinePanel state=\{state\} tool=\{selected\}/,'Exact selected tool recipe is inline, never an unrelated tier');
const disclosure=read('src/components/DisclosureControl.tsx');
assert.match(toolPanel,/<DisclosureRow key=\{tool\.id\}/,'Tier uses the shared accessible row');
assert.match(toolPanel,/expanded=\{opened===tool\.tier\}/,'Pass the correct tier state');
assert.match(disclosure,/accessibilityState=\{\{expanded\}\}/,'Shared disclosure announces state to screen readers');
assert.match(toolPanel,/label=\{'Tier '\+tool\.tier/,'Tier passes the correct accessible label');
assert.match(disclosure,/accessibilityLabel=\{label\}/,'Shared disclosure forwards the label');
assert.match(toolPanel,/onPress=\{\(\)=>dispatch\('tool_vault_activate'/,'A saved copy can be activated without going through Inventory');
assert.match(toolPanel,/onPress=\{\(\)=>dispatch\('tool_vault_withdraw'/,'The saved reserve can return to Inventory deliberately');
assert.match(toolPanel,/onPress=\{\(\)=>dispatch\(active\?'tool_vault_save':'equip_tool'/,'Stored versus equipped tools use distinct validated commands');
assert.match(toolPanel,/const sourceChance=sourceMonster\?\.drops\.find/,'Blueprint probabilities come from actual monster drops, not static authored guesses');
assert.doesNotMatch(toolPanel,/Math\.round\(selected\.blueprint\.dropChance\*100\)/,'Small drop chances must never be rounded to zero');

assert.match(app,/onWithdrawTool=\{id=>inventoryCommand\(\{type:'withdraw',args:\{id,quantity:1\}\},\(\)=>withdrawFromBank\(state,id,1\)\)/,'Bank withdrawal must use existing server/local validation');
assert.match(app,/toolRecipeReturnRef\.current=\{skillId:selectedSkill,mode:skillsMode/,'Smithing links preserve the original gathering skill for Back');
assert.match(toolPanel,/onOpenSmithing=\{openSmithing\}/,'Full crafting is delegated to the exact selected Smithing recipe');

assert.match(panel,/equipmentCraftAvailability\(state,recipeId\)/,'Inline tool readiness must check the real timed Forge queue and reservation gates');
assert.match(panel,/equipmentCraftDurationSeconds\(state,recipeId\)/,'Inline tool recipe must show the true Forge crafting duration');
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
