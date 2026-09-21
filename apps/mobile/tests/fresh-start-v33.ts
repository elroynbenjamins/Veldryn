import {createCharacter,newGame} from '../src/core/game';
import {migrateSave} from '../src/core/save-migrations';
import {invalidV33EquipmentIds,isKnownV33EquipmentPieceId,isLegacyEquipmentSetItemId,isV33EquipmentPieceId} from '../src/core/fresh-start-v33';

function ok(value:boolean,message:string){if(!value)throw new Error(message)}

const state=createCharacter(newGame(1000),'IRONWARDEN','Fresh start','female');
const raw:any=JSON.parse(JSON.stringify(state));
raw.character.equipment.chest='STONEHEART_CHEST';
raw.character.equipment.weapon='WORN_BLADE';
raw.character.savedLoadouts=[{id:'old',slotIndex:0,name:'Old',classId:'IRONWARDEN',equipment:{chest:'STONEHEART_CHEST',weapon:'WORN_BLADE'},createdAtMs:1,updatedAtMs:1}];
raw.character.unlockedSkinIds=['skin:old-set'];
raw.character.selectedSkinId='skin:old-set';
raw.inventory.stacks=[
  {itemId:'STONEHEART_CHEST',quantity:1},
  {itemId:'T1P_001',quantity:1},
  {itemId:'T9P_1513',quantity:1},
  {itemId:'COPPER_ORE',quantity:12},
];
raw.bank.stacks=[{itemId:'STONEHEART_CHEST',quantity:1},{itemId:'MOSS_FIBER',quantity:8}];
raw.overflow.stacks=[{itemId:'STONEHEART_CHEST',quantity:1}];

ok(isV33EquipmentPieceId('T1P_001')&&isV33EquipmentPieceId('T9P_1513')&&!isV33EquipmentPieceId('STONEHEART_CHEST'),'v33 ID boundary includes four-digit high-tier pieces');
ok(isKnownV33EquipmentPieceId('T1P_001')&&isKnownV33EquipmentPieceId('T9P_1513')&&!isKnownV33EquipmentPieceId('T9P_999'),'known v33 IDs include high-tier four-digit pieces');
ok(isLegacyEquipmentSetItemId('STONEHEART_CHEST'),'legacy set gear identified');
ok(!isLegacyEquipmentSetItemId('WORN_BLADE'),'starter gear preserved');
const migrated=migrateSave(raw);
ok(migrated.character!.equipment.weapon==='WORN_BLADE','starter equipment preserved');
ok(!migrated.character!.equipment.chest,'legacy equipped set piece removed');
ok(migrated.character!.selectedSkinId==='starting'&&migrated.character!.unlockedSkinIds?.length===1,'legacy skin state reset');
ok(migrated.inventory.stacks.some(stack=>stack.itemId==='T1P_001')&&migrated.inventory.stacks.some(stack=>stack.itemId==='T9P_1513'),'v33 low- and high-tier pieces preserved');
ok(!migrated.inventory.stacks.some(stack=>stack.itemId==='STONEHEART_CHEST'),'legacy inventory gear removed');
ok(migrated.inventory.stacks.some(stack=>stack.itemId==='COPPER_ORE'),'materials preserved');
ok(!migrated.bank.stacks.some(stack=>stack.itemId==='STONEHEART_CHEST')&&!migrated.overflow.stacks.some(stack=>stack.itemId==='STONEHEART_CHEST'),'all storage scopes cleaned');
ok(migrated.character!.savedLoadouts?.[0].equipment.weapon==='WORN_BLADE'&&!migrated.character!.savedLoadouts?.[0].equipment.chest,'legacy loadout reference removed');
const rosterRaw:any=JSON.parse(JSON.stringify(state));
rosterRaw.otherCharacters=[{character:{...rosterRaw.character,id:'ALT',equipment:{chest:'STONEHEART_CHEST'},unlockedSkinIds:['old'],selectedSkinId:'old'},inventory:rosterRaw.inventory,bank:rosterRaw.bank,overflow:rosterRaw.overflow,activity:null,skills:[],quests:[],currentRegionId:'GREENFIELDS'}];
const roster=migrateSave(rosterRaw);
ok(!roster.otherCharacters?.[0].character.equipment.chest&&roster.otherCharacters?.[0].character.selectedSkinId==='starting','inactive roster is cleaned too');
const malformed:any=JSON.parse(JSON.stringify(state));malformed.inventory.stacks=[{itemId:'T9P_999',quantity:1}];
ok(invalidV33EquipmentIds(malformed).join(',')==='T9P_999','invalid v33 save IDs detected');
let rejected=false;try{migrateSave(malformed);}catch{rejected=true;}ok(rejected,'invalid v33 save rejected');
console.log('PASS: v33 fresh-start migration preserves v33 pieces/materials and removes legacy set gear/skin references');
