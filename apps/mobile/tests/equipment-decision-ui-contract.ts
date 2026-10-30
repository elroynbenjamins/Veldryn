export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');
const character=read('src/screens/CharacterScreen.tsx');
const preview=read('src/components/EquipmentPreview.tsx');
const setPanel=read('src/components/EquipmentSetProgressPanel.tsx');
const decision=read('src/core/equipment-decision.ts');

ok(character.includes('equipmentDecisionModel'),'Character equipment detail must use the shared decision model');
ok(character.includes('equipmentScreenModel'),'Character screen must use the shared slot and loadout view model');
ok(character.includes("equipmentTool==='enhance'")&&character.includes("equipmentTool==='gems'")&&character.includes("equipmentTool==='sets'")&&character.includes("equipmentTool==='compare'"),'Equipment must present four focused tabs: Enhance, Gems, Sets and Compare & Swap');
ok(character.includes('selectedDecision.upgrade.canAfford')&&character.includes('selectedDecision?.sockets.statFilled')&&character.includes('selectedDecision?.sockets.effectFilled'),'Selected gear must expose enhancement readiness and both named socket statuses');
ok(character.includes("onPress={()=>openEnhancement('upgrade')}")&&character.includes("onPress={()=>openEnhancement('gems')}")&&character.includes("onEquip?setPickerSlot(selected.slot):onInventory()"),'Enhance, Gems and Compare tabs must retain actionable next steps');
ok(character.includes('rarityNameColor'),'Selected equipped item names must follow rarity color');
ok(character.includes('rarityMeta(equippedCraftedGearRarity(state,entry.slot)!)'),'Character slots must use the rarity of the actually equipped unique item, not best-owned gear or a catalog default');
ok(character.includes('meta&&{borderColor:meta.color,borderWidth:meta.borderWidth,backgroundColor:meta.surface}'),'Every equipped slot must display its rarity-colored border');
ok(character.includes('s.gearSelectedMarker')&&character.includes('gearTileSelected:{backgroundColor:equipmentColors.selected}'),'Selection must be distinct and must not override the rarity border');
ok(character.includes('equippedSetPieceCount(character.equipment,set!)'),'Selected set gear must show equipped set-piece context');
ok(character.includes('selectedDecision.upgrade.canAfford')&&character.includes('selectedDecision.upgrade.materials'),'Enhance tool must show exact current readiness and regional material count');
ok(character.includes('selectedDecision.upgrade.successChance')&&character.includes('selectedDecision.upgrade.targetRank'),'Enhance tool must show the next rank and live success chance');
ok(character.includes("equipmentTool==='enhance'")&&character.includes("equipmentTool==='gems'")&&character.includes("equipmentTool==='sets'")&&character.includes("equipmentTool==='compare'"),'Character must expose its four exclusive equipment tools');
ok(character.includes('EQUIPMENT_SLOT_ORDER.find')&&character.includes('onEquip?setPickerSlot(selected.slot):onInventory()'),'Character must show equipped gear first and keep swapping available');
ok(!character.includes('showGuidance'),'Old stacked build guidance must be consolidated into the Build Guide tool');
ok(character.includes('fontScale>1.2')&&character.includes('setGearWidth(event.nativeEvent.layout.width)'),'Equipment detail must have a narrow/large-text layout fallback');
ok(character.includes('setEnhancingItemId(itemId)')&&character.includes('itemId={enhancingItemId}')&&character.includes('onUpgrade={()=>onUpgrade(enhancingItemId)}')&&character.includes('onSocket={gemId=>onSocket(enhancingItemId,gemId)}'),'Enhancement modal and socket actions must target the item selected when opening, not stale gear');
ok(character.includes("equipmentTool==='enhance'||equipmentTool==='gems'")&&character.includes('s.selectedGearStack'),'Selected gear detail should only appear where needed and should stack on narrow devices');
ok(character.includes("const visibleSets=showAllSets?equippedSets:equippedSets.slice(0,2)")&&character.includes('Next bonus at {count} pieces'),'Sets should prioritize visible progress and progressively reveal additional sets');
ok(character.includes('state.character?.id')&&character.includes('setEnhancingItemId(null)'),'Character switching must clear pending equipment modal context');
ok(character.includes('wrapToolTabs=width<360||fontScale>=1.2'),'Equipment tools must wrap before text becomes too cramped on small phones');


ok(preview.includes('useGameTheme'),'Equipment comparison must use the active theme');
ok(preview.includes('GameModalSurface'),'Equipment comparison must use the shared modal surface');
ok(!preview.includes("import {C,")&&!preview.includes('equipmentColors}'),'Equipment comparison must not use the legacy static palette');
ok(preview.includes('SET CONTEXT'),'Equipment comparison must show set-piece tradeoffs');
ok(preview.includes('equippedSetPieceCount'),'Equipment comparison must compute set counts from the preview state');
ok(preview.includes('previewEquipment'),'Comparison copy must not imply unimplemented V33 set effects are active');

ok(setPanel.includes('useGameTheme'),'V33 set-progress presentation must be theme-aware');
ok(setPanel.includes('progress.thresholds.map')&&setPanel.includes('t.active?gt("REACHED"):gt("LOCKED")'),'Set progress must show each threshold as reached or locked rather than claiming the conditional hook is active');
ok(decision.includes('upgradeQuote'),'Decision model must reuse authoritative enhancement quote rules');
ok(decision.includes('equipmentSetDef'),'Decision model must reuse the V33 set catalog');

console.log('PASS: equipment decision surfaces are compact, rarity-aware, set-aware and theme-safe');
