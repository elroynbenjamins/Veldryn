const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.resolve(__dirname,'../src/'+name),'utf8');

const inventory=read('screens/InventoryScreen.tsx');
const sheet=read('components/ItemQuickInspect.tsx');
const presentation=read('core/gathering-tool-presentation.ts');
const effects=read('core/gathering-tools.ts');

// The tier speed is derived from real rarity/quality multipliers, never the rolled stat.
assert.match(inventory,/gatheringToolContribution\(inspectedToolDef,copy\)/);
assert.match(inventory,/contribution\.adjustedBasePercent/);
assert.match(presentation,/adjustedBasePercent=basePercent\*gatheringToolBaseMultiplier\(copy\)/);
assert.match(effects,/speedMultiplier\*=1-copy\.bonus\.basisPoints\/10000/);
assert.match(inventory,/gatheringToolPercent\(copy\.bonus\.basisPoints\/100\)/);
const start=inventory.indexOf("inspected.type==='tool'&&exactToolCopies.length>0?");
const section=inventory.slice(start,inventory.indexOf("inspected.type==='tool'&&hasLegacyStack",start));
assert.ok(start>0,'Exact tool card must be displayed');
const speed=section.indexOf("gt('GATHERING SPEED')");
const bonus=section.indexOf("gt('BONUS STAT ROLL')");
const actionsStart=inventory.indexOf("const inspectActions=inspected?");
const actions=inventory.slice(actionsStart,inventory.indexOf("inspected.type==='food'",actionsStart));
assert.ok(speed>=0&&bonus>speed,'Tier speed must appear above the separate bonus roll');
assert.ok(actions.includes('equippedGatheringToolRoll(state,activeTool.skillId,activeTool.tier)')&&actions.includes('tool.tier===inspectedToolDef.tier')&&actions.includes('toolCompareId===copy.id'),'Compare only the exact active copy in the same skill and tier');
assert.ok(sheet.indexOf('{overview}')<sheet.indexOf('accessibilityState={{expanded:detailsOpen}}')&&sheet.indexOf('{actions?')>sheet.indexOf('detailsOpen&&<>'),'Tool stats then Details & sources then actions');
assert.ok(inventory.includes('overview={toolOverview}'),'Tool overview must be passed separately from actions');
assert.ok(actions.includes("gt('Equip')")&&actions.includes("gt('To Bank')")&&actions.includes("gt('Sell')"),'Tool actions must stay visible');
assert.ok(!actions.includes('Equip copy')&&!actions.includes('Sell copy'),'No copy jargon on tool action buttons');
assert.ok(actions.includes('copy.id')&&actions.includes('instanceId:copy.id'),'Each action must target a specific physical tool');
assert.ok(actions.includes('goalProtection.has(copy.itemId)'),'Do not sell protected target resources');
assert.ok(inventory.includes('stackInspectorActions&&s.toolActionRowStacked')&&inventory.includes('toolActionButtonStacked:{flex:0,width:'),'Large text/narrow screens need full-width touch targets');
assert.ok(inventory.includes('hasLegacyStack&&inspectedToolDef')&&inventory.includes("gt('Tier base · No bonus roll')"),'Legacy tools retain tier speed without fabricating a roll');

// Advanced breakdown stays under the existing collapsed Details & sources disclosure.
const details=sheet.indexOf('detailsOpen&&<>');
const advanced=sheet.indexOf("gt('GATHERING TOOL DETAILS')");
assert.ok(details>=0&&advanced>details,'The tier math must remain collapsed by default');
assert.ok(sheet.includes('gatheringToolContribution(toolDef,copy)'),'Expanded details must reuse the gameplay tier calculation');
assert.ok(sheet.includes('detailToolCopies.length?detailToolCopies:instanceId?[]:[undefined]'),'Missing physical rolls must not be labelled legacy or fabricated');
console.log('PASS: compact gathering tool speed, exact-copy actions, responsive controls and collapsed math');
