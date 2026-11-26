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
const equip=section.indexOf("gt('Equip')");
assert.ok(speed>=0&&bonus>speed&&equip>bonus,'Tier speed must appear above the separate bonus roll and actions');
assert.ok(section.includes("gt('To Bank')")&&section.includes("gt('Sell')"),'Tool actions must stay visible');
assert.ok(!section.includes('Equip copy')&&!section.includes('Sell copy'),'No copy jargon on tool action buttons');
assert.ok(section.includes('copy.id')&&section.includes('instanceId:copy.id'),'Each action must target a specific physical tool');
assert.ok(section.includes('goalProtection.has(copy.itemId)'),'Do not sell protected target resources');
assert.ok(inventory.includes('stackInspectorActions&&s.toolActionRowStacked')&&inventory.includes('toolActionButtonStacked:{flex:0,width:'),'Large text/narrow screens need full-width touch targets');
assert.ok(inventory.includes('hasLegacyStack&&inspectedToolDef')&&inventory.includes("gt('Tier base · No bonus roll')"),'Legacy tools retain tier speed without fabricating a roll');

// Only the exact active copy is tagged Equipped. Other carried copies
// compare against the same skill + tier, without combining all tier bonuses.
assert.ok(inventory.includes('equippedGatheringTools(state,inspectedToolDef.skillId)'),'Find the active same-tier tool');
assert.ok(inventory.includes('equippedGatheringToolRoll(state,inspectedToolDef.skillId,inspectedToolDef.tier)'),'Use the verified active physical receipt');
assert.ok(section.includes('equippedSameTierCopy?.id===copy.id'),'The badge must match the physical copy, not just its item ID');
assert.ok(section.includes("gt('Equipped').toLocaleUpperCase(language)")&&section.includes('toolEquippedBadge'),'Show an Equipped status pill');
assert.ok(section.includes('equippedSameTier&&!isEquipped&&exactToolCopies.length===1?equippedToolComparison:null'),'Single-copy comparisons sit beneath the candidate stats');
assert.ok(section.includes('exactToolCopies.length>1?equippedToolComparison:null'),'Multi-copy comparisons are displayed only once above the list');
assert.ok(inventory.includes('const equippedToolComparison=equippedSameTier?'),'Comparison reference is created once, not in every card');
assert.ok(inventory.includes('gatheringToolPercent(equippedSameTierSpeed??0)'),'Use the real same-tier speed in comparisons');
assert.ok(inventory.includes("gt('Tool roll record unavailable · no bonus is assumed.')"),'An unreadable active roll must not be fabricated');
assert.ok(section.includes("color:rarityMeta(copy.rarity).color"),'Use the verified rarity to accent the bonus stat');
assert.ok(section.includes("disabled={!onCommand||inventoryBusyLabel!==null||isEquipped}"),'Equipped copy must not re-equip');
assert.ok(section.includes("disabled={!onCommand||inventoryBusyLabel!==null||isEquipped} onPress={()=>void beginInventorySubmission('Moving tool to Bank…'"),'Active tool cannot be moved to Bank from this sheet');
assert.ok(section.includes('isEquipped||lockedSet.has(copy.itemId)||favoriteSet.has(copy.itemId)||goalProtection.has(copy.itemId)'), 'Active, locked, favorited and goal-protected copies cannot be sold');
assert.ok(inventory.includes("rarityMeta(equippedSameTierCopy.rarity).label")&&inventory.includes("equippedSameTierCopy.quality"),'Equipped comparison must show verified rarity and quality');


// Tool stats and action buttons appear before the optional technical details;
// non-tool sheets retain their existing quick-action placement.
const inlineToolActions=sheet.indexOf("item.type==='tool'&&actions?");
const detailToggle=sheet.indexOf("accessibilityLabel={ui('Details & sources')}");
const nonToolActions=sheet.indexOf("item.type!=='tool'&&actions?");
assert.ok(inlineToolActions>0&&detailToggle>inlineToolActions&&nonToolActions>detailToggle,
  'Stats and actions must precede Details & sources only for gathering tools');

// Advanced breakdown stays under the existing collapsed Details & sources disclosure.
const details=sheet.indexOf('detailsOpen&&<>');
const advanced=sheet.indexOf("gt('GATHERING TOOL DETAILS')");
assert.ok(details>=0&&advanced>details,'The tier math must remain collapsed by default');
assert.ok(sheet.includes('gatheringToolContribution(toolDef,copy)'),'Expanded details must reuse the gameplay tier calculation');
assert.ok(sheet.includes('detailToolCopies.length?detailToolCopies:instanceId?[]:[undefined]'),'Missing physical rolls must not be labelled legacy or fabricated');
console.log('PASS: compact gathering tool speed, exact-copy actions, responsive controls and collapsed math');
