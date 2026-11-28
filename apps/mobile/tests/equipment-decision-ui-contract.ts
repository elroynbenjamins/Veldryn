export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');
const character=read('src/screens/CharacterScreen.tsx');
const preview=read('src/components/EquipmentPreview.tsx');
const comparison=read('src/core/equipment-comparison.ts');
const setPanel=read('src/components/EquipmentSetProgressPanel.tsx');
const decision=read('src/core/equipment-decision.ts');

ok(character.includes('equipmentDecisionModel'),'Character equipment detail must use the shared decision model');
ok(!character.includes("equipmentFocusModel")&&!character.includes("equipmentTool===")&&!character.includes("NEXT ACTION"),'Approved compact card must not reintroduce the redundant recommendation or exclusive tool tabs');
ok(character.includes('s.itemFocus')&&character.includes('s.inspectStats')&&character.includes('s.focusButtons')&&character.includes('showSets&&'),'Character must present selected equipment, direct actions and expandable sets without oversized tabs');
ok(character.includes('selectedDecision.upgrade.canAfford')&&character.includes('selectedEnhancement?.statGemId')&&character.includes('selectedEnhancement?.effectGemId')&&character.includes('selectedDecision.sockets.filled'),'Equipment card must surface readiness and both socket states');
ok(character.includes("onPress={()=>openEnhancement('upgrade')}")&&character.includes("onPress={()=>openEnhancement('gems')}")&&character.includes('setPickerSlot(selected.slot)'),'Equipment tools must offer actionable enhancement, socketing and gear swap controls');
ok(character.includes('rarityNameColor'),'Selected equipped item names must follow rarity color');
ok(character.includes('rarityMeta(equippedCraftedGearRarity(state,entry.slot)!)'),'Equipped slot borders must use the selected crafted instance rarity');
ok(character.includes('meta&&{borderColor:meta.color,borderWidth:meta.borderWidth,backgroundColor:meta.surface}'),'Every equipped slot must display its rarity-colored border');
ok(character.includes('s.gearSelectedMarker')&&character.includes('gearTileSelected:{backgroundColor:equipmentColors.selected}'),'Selection must be distinct and must not override the rarity border');
ok(character.includes('equippedSetPieceCount(character.equipment,set!)'),'Selected set gear must show equipped set-piece context');
ok(character.includes('selectedDecision.upgrade.canAfford')&&character.includes('selectedDecision.upgrade.materials'),'Enhance tool must show exact current readiness and regional material count');
ok(character.includes('selectedDecision.upgrade.successChance')&&character.includes('selectedDecision.upgrade.targetRank'),'Enhance tool must show the next rank and live success chance');
ok(character.includes("onPress={()=>openEnhancement('upgrade')}")&&character.includes("onPress={()=>openEnhancement('gems')}")&&character.includes('setShowSets(value=>!value)')&&character.includes('setPickerSlot(selected.slot)'),'Direct actions must retain all four equipment workflows');
ok(character.includes('EQUIPMENT_SLOT_ORDER.find')&&character.includes('onEquip?setPickerSlot(selected.slot):onInventory()'),'Character must show equipped gear first and keep swapping available');
ok(!character.includes('showGuidance')&&!character.includes('s.toolTabs')&&character.includes('s.toolDisclosure'),'Equipment guidance must stay compact and progressively disclosed');
ok(character.includes('fontScale>1.2')&&character.includes('event.nativeEvent.layout.width')&&character.includes('setGearWidth(previous=>'),'Equipment detail must respond to measured width and large text');
ok(character.includes('setEnhancingItemId(itemId)')&&character.includes('itemId={enhancingItemId}')&&character.includes('onUpgrade={()=>onUpgrade(enhancingItemId)}'),'Enhancement operations must target the explicit selected item ID');
ok(character.includes('s.itemFocus')&&character.includes('stackItem&&s.stackedActions')&&character.includes('selected.item?localizedItemName'),'Selected gear detail must stay visible and actions must stack on narrow devices');
ok(character.includes("const visibleSets=showAllSets?equippedSets:equippedSets.slice(0,2)")&&character.includes('Next bonus at {count} pieces'),'Sets should prioritize visible progress and progressively reveal additional sets');
ok(character.includes('state.character?.id')&&character.includes('setEnhancingItemId(null)'),'Character switching must clear pending equipment modal context');
ok(character.includes('stackItem=width<360||fontScale>=1.3')&&character.includes('stackedAction:{flex:0,minWidth:0,width:')&&character.includes('fontScale>1.45'),'Compact action layout must accommodate narrow screens and enlarged text');
ok(character.includes('character.equipmentInstanceIds?.[selected.slot]')&&character.includes('copy.id===selectedCopyId&&copy.itemId===selected.item!.id')&&character.includes('craftedGearDisplayQuality(selectedCopy)')&&character.includes('selectedCopy?.equipmentBonuses')&&character.includes('selectedCopy?.weaponBonuses'),'Quality and rolls must resolve only the equipped exact copy');
ok(character.includes("gl('Legacy baseline')")&&character.includes('quality!==undefined')&&character.includes('s.qualityTrack')&&character.includes('StatHelpDisclosure'),'Quality must retain zero, mark legacy baseline and provide help');
ok(character.includes('activeMilestones=selectedMilestones.filter')&&character.includes('isLiveSixPieceBonus(selectedSet)')&&character.includes('setShowSelectedSet(value=>!value)'),'Selected set details must distinguish live and pending milestones');


ok(preview.includes('useGameTheme'),'Equipment comparison must use the active theme');
ok(preview.includes('GameModalSurface'),'Equipment comparison must use the shared modal surface');
ok(!preview.includes("import {C,")&&!preview.includes('equipmentColors}'),'Equipment comparison must not use the legacy static palette');
ok(preview.includes('SET PROGRESS')&&preview.includes('sets.some(row=>row.after!==row.before)'),'Equipment comparison must surface authoritative set-piece progress changes');
ok(preview.includes('equipmentComparison')&&comparison.includes('equippedSetPieceCount')&&comparison.includes('equipmentSetDef'),'Both equipment views must derive set counts and effects from their projected runtime state');
ok(preview.includes('previewEquipment'),'Comparison copy must not imply unimplemented V33 set effects are active');

ok(setPanel.includes('useGameTheme'),'V33 set-progress presentation must be theme-aware');
ok(setPanel.includes('progress.thresholds.map')&&setPanel.includes('t.active?gt("REACHED"):gt("LOCKED")')&&setPanel.includes('thresholdReached'),'Set collection UI must accurately distinguish reached from locked piece thresholds');
ok(decision.includes('upgradeQuote'),'Decision model must reuse authoritative enhancement quote rules');
ok(decision.includes('equipmentSetDef'),'Decision model must reuse the V33 set catalog');

console.log('PASS: equipment decision surfaces are compact, rarity-aware, set-aware and theme-safe');
