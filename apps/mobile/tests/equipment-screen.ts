import {createCharacter,newGame,effectiveStats} from '../src/core/game';
import {previewEquipment} from '../src/core/equipment-preview';
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
if(model.stats.maxHp!==155||model.stats.attack!==19||model.stats.defense!==19)throw new Error('Equipment screen stats must come from effectiveStats');
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
const upgradedPreview=previewEquipment(equippedLow,forgeWeapon.id,'COPY_HIGH');
if(upgradedPreview.character?.equipmentInstanceIds?.weapon!=='COPY_HIGH'
 ||equippedLow.character.equipmentInstanceIds.weapon!=='COPY_LOW'
 ||effectiveStats(upgradedPreview).attack<=effectiveStats(equippedLow).attack)
 throw new Error('Replacing an equipped Forge copy must use the selected copy and keep the original unchanged');
let missingCopyRejected=false;
try{previewEquipment(forged,forgeWeapon.id,'NONEXISTENT')}catch{missingCopyRejected=true}
if(!missingCopyRejected)throw new Error('Preview must reject missing Forge instance IDs');
let implicitCopyRejected=false;
try{previewEquipment(forged,forgeWeapon.id)}catch{implicitCopyRejected=true}
if(!implicitCopyRejected)throw new Error('Preview must not silently pick a Forge copy');

console.log('PASS: equipment screen uses ten live slots, canonical stats, loadout guides, contextual focus and saved presentation');
