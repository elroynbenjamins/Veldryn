import {createCharacter,newGame,effectiveStats,equipItem,equipItemFromEquipmentPouch} from '../src/core/game';
import {equipCraftedGearInstance} from '../src/core/crafted-gear-ownership';
import {equipmentComparison} from '../src/core/equipment-comparison';
import {itemDef,ITEMS} from '../src/content/items';
import {previewEquipment} from '../src/core/equipment-preview';
import {itemInspectModel} from '../src/core/item-inspect';
import {enhancedGearStats} from '../src/core/equipment-enhancement';
import {displayPercent,DISPLAY_STAT_MULTIPLIER} from '../src/core/stat-display';
import {availableEquipmentChoicesForSlot} from '../src/core/equipment-slot-picker';
import {EQUIPMENT_ITEMS_V33} from '../src/content/equipment-items-v33';
import type {CraftedGearInstance} from '../src/core/types';
import {EQUIPMENT_SLOT_ORDER,equipmentFocusModel,equipmentScreenModel} from '../src/core/equipment-screen';

const state=createCharacter(newGame(0),'IRONWARDEN','Equipment Test','female');
const model=equipmentScreenModel(state);
const focus=equipmentFocusModel(state,'weapon');
if(EQUIPMENT_SLOT_ORDER.length!==10||new Set(EQUIPMENT_SLOT_ORDER).size!==10)throw new Error('Equipment screen must expose ten unique canonical slots');
if(model.slots.length!==10||model.equippedCount!==1)throw new Error('Equipment screen model does not reflect live equipment state');
if(model.slots.find(slot=>slot.slot==='weapon')?.itemId!=='basic_sword')throw new Error('Equipment screen did not read the equipped weapon');
const actualStats=effectiveStats(state);
if(model.stats.maxHp!==155||Math.abs(model.stats.attack-actualStats.attack)>1e-9||Math.abs(model.stats.defense-actualStats.defense)>1e-9)
 throw new Error('Equipment screen must use current class-weighted effective stats, not hardcoded startup values');
const overMax={...state,character:{...state.character!,currentHp:99999}};
if(equipmentScreenModel(overMax).stats.currentHp!==effectiveStats(overMax).hp)
  throw new Error('Character current health display must not exceed computed Max HP after gear changes');
if(displayPercent(.0125)!=='1.25%'||displayPercent(.0035)!=='0.35%'||DISPLAY_STAT_MULTIPLIER!==10)
  throw new Error('Character stats must preserve fractional percentages and the agreed ×10 display scale');
if(model.loadouts.map(loadout=>loadout.id).join(',')!=='LOAD_001,LOAD_002,LOAD_003')throw new Error('Ironwarden loadout guides must follow canonical order');
if(focus.equippedCount!==1||focus.emptySlots!==9||focus.next.kind!=='fill-slots'||focus.next.action!=='inventory')throw new Error('Loadout focus must guide a fresh character toward filling empty slots before secondary optimization');
if(focus.openSockets>focus.totalSockets)throw new Error('Loadout focus socket summary cannot report more open sockets than total sockets');
const enhancedState={...state,character:{...state.character!,gearEnhancements:{basic_sword:{rank:2,failures:1,gemIds:[]}}}};
const enhancedWeapon=equipmentScreenModel(enhancedState).slots.find(slot=>slot.slot==='weapon');
if(enhancedWeapon?.enhancement?.rank!==2||enhancedWeapon.enhancedStats?.attack!==4.32)throw new Error('Equipment tiles and inspector must expose the live enhanced rank and stats');
if(state.character?.bodyPresentation!=='female')throw new Error('Saved character presentation must remain authoritative');

// A preview must identify the physical Forge copy, not use a generic itemId
// (which would silently discard its independent quality and rarity rolls).
const forgeWeapon=EQUIPMENT_ITEMS_V33.find(item=>item.classRestriction==='IRONWARDEN'&&item.slot==='weapon'&&item.id.startsWith('T1'));
if(!forgeWeapon)throw new Error('Missing released Ironwarden T1 weapon for preview regression');
const makeCopy=(id:string,quality:number):CraftedGearInstance=>({
 id,itemId:forgeWeapon.id,ownerCharacterId:state.character!.id,rarity:'rare',
 quality,acquireSource:'craft',sourceReceiptKey:id,createdAtMs:1,
 enhancement:{rank:0,failures:0,gemIds:[]},
});
const forged={...state,
 character:{...state.character!,level:Math.max(state.character!.level,forgeWeapon.requiredLevel??1)},
 account:{...state.account,craftedGearInstances:[makeCopy('COPY_HIGH',100),makeCopy('COPY_LOW',0)]},
 inventory:{...state.inventory,stacks:[
  ...state.inventory.stacks,
  {itemId:forgeWeapon.id,quantity:1,instanceId:'COPY_HIGH'},
  {itemId:forgeWeapon.id,quantity:1,instanceId:'COPY_LOW'},
 ]},
};
const highPreview=previewEquipment(forged,forgeWeapon.id,'COPY_HIGH');
const lowPreview=previewEquipment(forged,forgeWeapon.id,'COPY_LOW');
if(highPreview.character?.equipmentInstanceIds?.weapon!=='COPY_HIGH'
 ||lowPreview.character?.equipmentInstanceIds?.weapon!=='COPY_LOW')
 throw new Error('Forge preview lost selected copy identity');
if(effectiveStats(highPreview).attack<=effectiveStats(lowPreview).attack)
 throw new Error('Forge preview failed to apply per-copy quality to effective stats');
if(forged.character?.equipment.weapon!==state.character?.equipment.weapon
 ||forged.character?.equipmentInstanceIds?.weapon)
 throw new Error('Equipment preview mutated the live character');
const choices=availableEquipmentChoicesForSlot(forged,'weapon');
if(choices.filter(choice=>choice.itemId===forgeWeapon.id).length!==2)
 throw new Error('Quick Swap must show unique Forge rolls as two separate choices');
const equippedLow={...forged,
 character:{...forged.character!,equipment:{...forged.character!.equipment,weapon:forgeWeapon.id},
  equipmentInstanceIds:{weapon:'COPY_LOW'}},
 inventory:{...forged.inventory,stacks:forged.inventory.stacks.filter(stack=>stack.instanceId!=='COPY_LOW')},
};

const equippedInspect=itemInspectModel(equippedLow,forgeWeapon.id);
if(!equippedInspect.gearDecision?.previewAvailable||equippedInspect.gearDecision.loadoutDelta.attack!==0||
   equippedInspect.gearDecision.maxItemStats.attack<=enhancedGearStats(equippedLow,forgeWeapon.id).attack)
  throw new Error('Inspecting equipped unique Forge gear must show real current stats and meaningful next-rank gains');
const canonicalGemsState={...equippedLow,account:{...equippedLow.account,
 craftedGearInstances:(equippedLow.account.craftedGearInstances??[]).map(copy=>copy.id==='COPY_LOW'
   ?{...copy,enhancement:{...copy.enhancement,statGemId:'gem:stat_precision:g4',effectGemId:'gem:effect_mercy:g4',gemIds:['gem:stat_precision:g4','gem:effect_mercy:g4']}}:copy)}};
const canonicalInspect=itemInspectModel(canonicalGemsState,forgeWeapon.id);
if(!canonicalInspect.gearDecision?.gems.some(gem=>gem.id==='gem:stat_precision:g4'&&gem.detail.includes('0.65 pp'))
 ||!canonicalInspect.gearDecision?.gems.some(gem=>gem.id==='gem:effect_mercy:g4'&&gem.detail.includes('7%')))
 throw new Error('Quick Inspect must show actual canonical Stat and Effect Gem strength, not 0% placeholders');
const unselectedInspect=itemInspectModel(forged,forgeWeapon.id);
if(unselectedInspect.gearDecision?.previewAvailable)
  throw new Error('Inspect cannot guess a unique Forge copy when multiple distinct qualities exist');
const upgradedPreview=previewEquipment(equippedLow,forgeWeapon.id,'COPY_HIGH');
if(upgradedPreview.character?.equipmentInstanceIds?.weapon!=='COPY_HIGH'
 ||equippedLow.character.equipmentInstanceIds.weapon!=='COPY_LOW'
 ||effectiveStats(upgradedPreview).attack<=effectiveStats(equippedLow).attack)
 throw new Error('Replacing an equipped Forge copy must use the selected copy and keep the original unchanged');
const pouchForged={...forged,
 character:{...forged.character!,equipmentPouch:{capacity:30,stacks:[{itemId:forgeWeapon.id,instanceId:'COPY_HIGH',quantity:1}]}},
 inventory:{...forged.inventory,stacks:forged.inventory.stacks.filter(stack=>stack.instanceId!=='COPY_HIGH')},
};
const pouchPreview=previewEquipment(pouchForged,forgeWeapon.id,'COPY_HIGH','equipment_pouch');
if(pouchPreview.character?.equipmentInstanceIds?.weapon!=='COPY_HIGH'
 ||!availableEquipmentChoicesForSlot(pouchForged,'weapon').some(choice=>choice.instanceId==='COPY_HIGH'&&choice.source==='equipment_pouch'))
 throw new Error('Equipment Pouch must preview and list the exact Forge copy without moving it into Inventory');
let missingCopyRejected=false;
try{previewEquipment(forged,forgeWeapon.id,'NONEXISTENT')}catch{missingCopyRejected=true}
if(!missingCopyRejected)throw new Error('Preview must reject missing Forge instance IDs');
let implicitCopyRejected=false;
try{previewEquipment(forged,forgeWeapon.id)}catch{implicitCopyRejected=true}
if(!implicitCopyRejected)throw new Error('Preview must not silently pick a Forge copy');


function assertPreviewEqualsActual(preview:typeof state,actual:typeof state,label:string){
 const p=effectiveStats(preview),a=effectiveStats(actual);
 for(const key of Object.keys(a) as Array<keyof typeof a>)
  if(Math.abs(p[key]-a[key])>1e-9)
   throw new Error(label+' preview differs from authoritative equip in '+key+': '+p[key]+' vs '+a[key]);
}
assertPreviewEqualsActual(highPreview,equipCraftedGearInstance(forged,'COPY_HIGH'),'Q100 Forge equip');
assertPreviewEqualsActual(lowPreview,equipCraftedGearInstance(forged,'COPY_LOW'),'Q0 Forge equip');
assertPreviewEqualsActual(upgradedPreview,equipCraftedGearInstance(equippedLow,'COPY_HIGH'),'same-item unique-copy replacement');
assertPreviewEqualsActual(pouchPreview,equipCraftedGearInstance(pouchForged,'COPY_HIGH'),'Equipment Pouch unique-copy equip');

// Legacy same-id swaps must NOT discard itemId-keyed upgrades or sockets.
// The old preview used to delete gearEnhancements even though equipItem retains it.
const legacyState={...state,character:{...state.character!,gearEnhancements:{basic_sword:{rank:2,failures:0,gemIds:[]}}},
 inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'basic_sword',quantity:1}]}};
const legacyPreview=previewEquipment(legacyState,'basic_sword');
assertPreviewEqualsActual(legacyPreview,equipItem(legacyState,'basic_sword'),'same legacy item with upgrades');
if(effectiveStats(legacyPreview).attack!==effectiveStats(legacyState).attack||
 legacyPreview.character?.gearEnhancements?.basic_sword?.rank!==2)
 throw new Error('Comparing the same legacy item must preserve the actual +2 enhancement');
const legacyPouch={...legacyState,
 inventory:state.inventory,
 character:{...legacyState.character!,equipmentPouch:{capacity:30,stacks:[{itemId:'basic_sword',quantity:1}]}}};
assertPreviewEqualsActual(previewEquipment(legacyPouch,'basic_sword',undefined,'equipment_pouch'),
 equipItemFromEquipmentPouch(legacyPouch,'basic_sword'),'pouch legacy gear');

const uniqueBlockingLegacy={...equippedLow,
 inventory:{...equippedLow.inventory,stacks:[...equippedLow.inventory.stacks,{itemId:forgeWeapon.id,quantity:1}]}};
let rejectedPreview=false,rejectedActual=false;
try{previewEquipment(uniqueBlockingLegacy,forgeWeapon.id)}catch{rejectedPreview=true}
try{equipItem(uniqueBlockingLegacy,forgeWeapon.id)}catch{rejectedActual=true}
if(!rejectedPreview||!rejectedActual)
 throw new Error('Comparison must reject legacy swaps when a unique equipped copy blocks the real equip');

// Released T1–T4 six-piece set milestones are now always-on combat stats.
// Higher-tier conditional triggers remain pending until their hooks exist.
const setId=itemDef(forgeWeapon.id).equipmentSetId;
const setItems=EQUIPMENT_ITEMS_V33.filter(item=>item.equipmentSetId===setId&&item.classRestriction==='IRONWARDEN');
if(setItems.length>=6){
 const beforeEquipment=Object.fromEntries(setItems.slice(0,5).map(item=>[item.slot!,item.id]));
 const sixth=setItems[5];
 const fivePiece={...state,character:{...state.character!,level:100,equipment:beforeEquipment},
  inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:sixth.id,quantity:1}]}};
 const sixPiecePreview=previewEquipment(fivePiece,sixth.id);
 assertPreviewEqualsActual(sixPiecePreview,equipItem(fivePiece,sixth.id),'6-piece set transition');
 const diff=equipmentComparison(fivePiece,sixPiecePreview);
 if(!diff.sets.some(row=>row.id===setId&&row.milestones.some(m=>m.threshold===6&&m.status==='active')))
  throw new Error('Released T1–T4 six-piece set milestone must be active');
}
// Verify the percentage bonuses in the comparison come from the actual
// capped effect-gem totals, rather than raw gem IDs or guessed item values.
const effectGem=ITEMS.find(item=>item.type==='gem'&&item.gemEffect&&item.gemEffectValue);
if(effectGem){
 const gemForged={...equippedLow,account:{...equippedLow.account,craftedGearInstances:
  equippedLow.account.craftedGearInstances.map(row=>row.id==='COPY_HIGH'?{...row,
   enhancement:{...row.enhancement,effectGemId:effectGem.id,gemIds:[effectGem.id]}}:row)}};
 const projected=previewEquipment(gemForged,forgeWeapon.id,'COPY_HIGH');
 assertPreviewEqualsActual(projected,equipCraftedGearInstance(gemForged,'COPY_HIGH'),'effect gem equipped with Forge copy');
 if(!equipmentComparison(gemForged,projected).effects.length)
  throw new Error('Combat effect gem changes must appear in the comparison');
}

console.log('PASS: equipment screen uses ten live slots, canonical stats, loadout guides, contextual focus and saved presentation');
