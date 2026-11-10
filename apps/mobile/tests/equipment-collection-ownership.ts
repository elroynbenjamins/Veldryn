import {ownedEquipmentDefinitionIds} from '../src/core/equipment-collection-ownership';
import type {GameState} from '../src/core/types';

const state={
 inventory:{stacks:[{itemId:'INV_GEAR',quantity:1},{itemId:'ZERO_GEAR',quantity:0}]},
 bank:{stacks:[{itemId:'BANK_GEAR',quantity:2}]},
 character:{equipmentPouch:{stacks:[{itemId:'POUCH_GEAR',quantity:1}]},equipment:{weapon:'EQUIPPED_GEAR'}},
} as unknown as GameState;

function check(value:boolean,message:string){if(!value)throw new Error(message)}
const owned=ownedEquipmentDefinitionIds(state);
check(owned.has('INV_GEAR'),'Inventory-owned gear must be shown');
check(owned.has('BANK_GEAR'),'Bank-owned gear must be shown');
check(owned.has('POUCH_GEAR'),'Equipment Pouch gear must count for set completion');
check(owned.has('EQUIPPED_GEAR'),'Equipped gear must count for set completion');
check(!owned.has('ZERO_GEAR'),'Empty stacks must not mark equipment owned');
const legacy={...state,character:{...state.character!,equipmentPouch:undefined}} as GameState;
check(!ownedEquipmentDefinitionIds(legacy).has('POUCH_GEAR'),'Legacy saves without an Equipment Pouch must remain supported');
console.log('PASS Smithing/Tailoring ownership includes all equipment storage and equipped gear');
