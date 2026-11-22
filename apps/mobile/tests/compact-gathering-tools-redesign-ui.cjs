'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../src/'+p),'utf8');
const screen=read('screens/SkillsScreen.tsx');
const locale=read('i18n/gameplay.ts');
const mechanics=read('core/gathering-tools.ts');
const presentation=read('core/gathering-tool-presentation.ts');
const recipes=read('components/ToolRecipeInlinePanel.tsx');

// Compact summary uses authoritative effects, including the no-tool penalty and rare-find RELATIVE chance.
assert.match(screen,/gatheringToolEffects\(state,gatheringSkill\)/);
assert.match(screen,/gatheringToolTotalBreakdown\(effects\)/);
assert.match(screen,/gatheringToolPercent\(totals\.rarityChanceRelativePercent\)/);
assert.ok(screen.includes("equippedTools.length?'−'+totalToolPercent+'%':'+15.0%'"),'Without tools, action time must show the real +15% penalty');
assert.match(screen,/gatheringToolsFor\(gatheringSkill\)\.length>0&&<Panel/,'No tools panel for herbalism (which has no equipable gathering tiers)');
const header=screen.slice(screen.indexOf('<Panel style={s.toolPanel}>'),screen.indexOf('{openTools[sk.skillId]&&gatheringToolsFor'));
assert.ok(header.includes('toolMetrics')&&header.includes("gt('ACTION TIME')")&&header.includes("gt('RARE FINDS')"),'Two compact summary metrics should be visible');
assert.ok(header.indexOf('toolMetrics')<header.indexOf('toolMathOpen?<'),'Calculation formula should be behind its disclosure');
assert.ok(header.includes("accessibilityState={{expanded:toolMathOpen}}"),'Formula toggle must announce its expanded state');
assert.ok(header.includes("setExpandedToolDetailId(null)")&&header.includes("setExpandedToolId(null)"),'Collapsing tiers must clear nested selections');

// Only one tool is expanded; no repeated full-width buttons or technical math in collapsed rows.
assert.match(screen,/const \[expandedToolDetailId,setExpandedToolDetailId\]=useState<string\|null>\(null\)/);
assert.match(screen,/const detailExpanded=expandedToolDetailId===tool\.id/);
const card=screen.slice(screen.indexOf('return <View key={tool.id} style={[s.toolCard'),screen.indexOf('</View>;',screen.indexOf('return <View key={tool.id} style={[s.toolCard')));
assert.ok(card.includes('toolCardHeader')&&card.includes('{detailExpanded?<View style={s.toolCardDetails}>'));
assert.ok(card.indexOf('toolCardHeader')<card.indexOf('{detailExpanded?<View style={s.toolCardDetails}>'));
assert.ok(card.includes("gatheringToolPercent(contribution.adjustedBasePercent)")&&card.includes('contribution.rarityRollPercent')&&card.includes('contribution.speedRollPercent'));
assert.ok(card.includes("accessibilityHint={gt('Tap to inspect tool')}")&&card.includes('accessibilityState={{expanded:detailExpanded}}'));
assert.ok(card.includes('minHeight:72')===false,'Style rules live in the stylesheet, not on each row');
assert.match(screen,/toolCardHeader:\{minHeight:72/);
assert.match(screen,/toolMathToggle:\{minHeight:44/);
assert.match(screen,/toolRecipeToggle:\{minHeight:48/);
assert.match(screen,/toolCopyOptionCompact:\{flexDirection:'column'/);

// Drill-down keeps the original authoritative command and source flows intact.
assert.match(screen,/const action=equipped\?\(\)=>onCommand\(\{type:'unequip_tool'/);
assert.match(screen,/onWithdrawTool\?\(\)=>onWithdrawTool\(tool.id\):onInventory/);
assert.match(screen,/const blueprintChanceText=actualBlueprintChance===undefined/);
assert.match(screen,/\{expanded\?<ToolRecipeInlinePanel state=\{state\} tool=\{tool\}/);
assert.match(screen,/onOpenSmithing=\{\(\)=>onNavigateCraftingSource\?onNavigateCraftingSource\(recipeDestination\):onViewToolRecipes\(\)\}/);
assert.match(screen,/instanceId:stack\.instanceId/);
assert.match(screen,/validateGatheringToolRoll/);
assert.match(screen,/gatheringToolContribution\(tool,copy\)/);
assert.match(recipes,/equipmentCraftAvailability\(state,recipeId\)/);
assert.match(presentation,/adjustedBasePercent=basePercent\*gatheringToolBaseMultiplier\(copy\)/);
assert.match(mechanics,/speedMultiplier\*=1-copy\.bonus\.basisPoints\/10000/);

// Six-locale copy coverage; on-screen detailed roll names reuse existing localized keys.
for(const key of ['ACTION TIME','RARE FINDS','Shorter gathering actions','Slower without tools','How tool bonuses work','TOOL TIERS','Tap to inspect tool','Not equipped','Not owned','tier time','rare finds','speed roll','Tier speed bonus','Tool roll','Owned copies','Select a tool roll to equip','Legacy · Q50']){
 assert.ok(locale.includes(JSON.stringify(key)+':'),'Missing six-language message: '+key);
}
assert.match(screen,/gt\(copy\.bonus\.stat==='speed'\?'Gathering Speed':'Gathering Rarity Chance'\)/);
console.log('PASS: approved gathering tool compact list, progressive info, exact copy controls, accessibility and six-language labels');
