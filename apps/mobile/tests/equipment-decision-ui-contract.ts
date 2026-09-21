export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');
const character=read('src/screens/CharacterScreen.tsx');
const preview=read('src/components/EquipmentPreview.tsx');
const setPanel=read('src/components/EquipmentSetProgressPanel.tsx');
const decision=read('src/core/equipment-decision.ts');

ok(character.includes('equipmentDecisionModel'),'Character equipment detail must use the shared decision model');
ok(character.includes('rarityNameColor'),'Selected equipped item names must follow rarity color');
ok(character.includes('selectedDecision.set.equippedPieces'),'Selected set gear must show equipped set-piece context');
ok(character.includes('equipmentUpgradeSummary(selectedDecision)'),'Selected gear must expose next enhancement readiness');
ok(character.includes("Enhance · "),'Equipment primary action must expose the next enhancement chance');
ok(character.includes('narrowEquipment'),'Equipment detail must have a narrow/large-text layout fallback');

ok(preview.includes('useGameTheme'),'Equipment comparison must use the active theme');
ok(preview.includes('GameModalSurface'),'Equipment comparison must use the shared modal surface');
ok(!preview.includes("import {C,")&&!preview.includes('equipmentColors}'),'Equipment comparison must not use the legacy static palette');
ok(preview.includes('SET CONTEXT'),'Equipment comparison must show set-piece tradeoffs');
ok(preview.includes('equippedSetPieceCount'),'Equipment comparison must compute set counts from the preview state');
ok(preview.includes('currently implemented runtime bonuses'),'Comparison copy must not imply unimplemented V33 set effects are active');

ok(setPanel.includes('useGameTheme'),'V33 set-progress presentation must be theme-aware');
ok(setPanel.includes('2/4/8/10 always-on bonuses are live')&&setPanel.includes('6pc conditional remains an authored trigger hook'),'Set collection UI must accurately distinguish live static bonuses from the pending conditional hook');
ok(decision.includes('upgradeQuote'),'Decision model must reuse authoritative enhancement quote rules');
ok(decision.includes('equipmentSetDef'),'Decision model must reuse the V33 set catalog');

console.log('PASS: equipment decision surfaces are compact, rarity-aware, set-aware and theme-safe');
