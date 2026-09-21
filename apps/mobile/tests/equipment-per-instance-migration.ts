import {createCharacter,equipItem,newGame,salvageItem,sellItem,unequipItem} from '../src/core/game';
import {attemptEquipmentUpgrade,gearEnhancement} from '../src/core/equipment-enhancement';
import {inventoryGearInstances,materializeGearInstances} from '../src/core/equipment-instances';
function ok(condition:unknown,message:string){if(!condition)throw new Error(message)}

let state=createCharacter(newGame(1),'IRONWARDEN','Instance QA','male');
state={...state,character:{...state.character!,gold:100000},inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'STONEHEART_RING',quantity:2},{itemId:'TEMPERING_DUST',quantity:999},{itemId:'TEMPERING_CORE',quantity:99}]}};
state=materializeGearInstances(state);
let copies=inventoryGearInstances(state).filter(row=>row.itemId==='STONEHEART_RING');
ok(copies.length===2,'Two duplicate rings must become two exact instances');
ok(copies[0].id!==copies[1].id,'Duplicate equipment IDs must be unique');

const firstId=copies[0].id,secondId=copies[1].id;
state=equipItem(state,firstId);
state=attemptEquipmentUpgrade(state,firstId,0).state;
ok(gearEnhancement(state,firstId).rank===1,'Selected first copy should own its +rank');
ok(gearEnhancement(state,secondId).rank===0,'Second copy must not inherit the first copy upgrade');

state=unequipItem(state,'ring');
state=equipItem(state,secondId);
ok(gearEnhancement(state,secondId).rank===0,'Equipping another duplicate must preserve that copy state');
state=unequipItem(state,'ring');

let before=inventoryGearInstances(state).filter(row=>row.itemId==='STONEHEART_RING');
ok(before.length===2,'Both copies should exist before exact disposal');
const unenhanced=before.find(row=>row.id===secondId)!;
state=sellItem(state,unenhanced.id);
let after=inventoryGearInstances(state).filter(row=>row.itemId==='STONEHEART_RING');
ok(after.length===1&&after[0].id===firstId,'Selling one duplicate must remove only the selected instance');

let protectedEnhanced=false;try{sellItem(state,firstId)}catch{protectedEnhanced=true}
ok(protectedEnhanced,'Enhanced exact instances remain protected from accidental sale');

state={...state,inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'STONEHEART_RING',quantity:1}]}};
state=materializeGearInstances(state);
const fresh=inventoryGearInstances(state).filter(row=>row.itemId==='STONEHEART_RING').find(row=>row.id!==firstId)!;
state=salvageItem(state,fresh.id);
ok(inventoryGearInstances(state).filter(row=>row.itemId==='STONEHEART_RING').length===1,'Salvage must remove only its selected duplicate');

console.log('per-instance equipment migration tests passed');
