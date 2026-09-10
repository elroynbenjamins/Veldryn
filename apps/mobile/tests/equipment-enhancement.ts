import {createCharacter,effectiveStats,newGame,salvageItem,sellItem} from '../src/core/game';
import {attemptEquipmentUpgrade,gearEnhancement,gemSocketCapacity,socketGem,unsocketGem,upgradeQuote} from '../src/core/equipment-enhancement';
function ok(condition:unknown,message:string){if(!condition)throw new Error(message)}

let state=createCharacter(newGame(1),'IRONWARDEN','Smith','male');
state={...state,character:{...state.character!,gold:100000,equipment:{...state.character!.equipment,ring:'STONEHEART_RING'}},inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'TEMPERING_DUST',quantity:999},{itemId:'TEMPERING_CORE',quantity:99},{itemId:'WARD_SHARD',quantity:1}]}};
ok(gemSocketCapacity('STONEHEART_RING')===1,'Rare gear should have one socket');
ok(upgradeQuote(state,'STONEHEART_RING').successChance===1,'The first upgrade should be guaranteed');
const before=effectiveStats(state);
const upgraded=attemptEquipmentUpgrade(state,'STONEHEART_RING',.99).state;
ok(gearEnhancement(upgraded,'STONEHEART_RING').rank===1,'Successful upgrade should increase rank');
ok(effectiveStats(upgraded).defense>before.defense,'Upgrade should increase effective defense');
const socketed=socketGem(upgraded,'STONEHEART_RING','WARD_SHARD');
ok(gearEnhancement(socketed,'STONEHEART_RING').gemIds[0]==='WARD_SHARD','Gem should occupy socket');
ok(effectiveStats(socketed).defense>effectiveStats(upgraded).defense,'Ward gem should increase defense');
let overfill=false;try{socketGem(socketed,'STONEHEART_RING','WARD_SHARD')}catch{overfill=true}ok(overfill,'Filled sockets must reject another gem');
const goldBeforeExtract=socketed.character!.gold;
const extracted=unsocketGem(socketed,'STONEHEART_RING',0);
ok(gearEnhancement(extracted,'STONEHEART_RING').gemIds.length===0,'Extraction should clear socket');
ok(extracted.character!.gold===goldBeforeExtract-500,'Extraction should consume gold');
ok(extracted.inventory.stacks.find(stack=>stack.itemId==='WARD_SHARD')?.quantity===1,'Extraction should return gem');
const dangerous={...upgraded,character:{...upgraded.character!,gearEnhancements:{STONEHEART_RING:{rank:6,failures:0,gemIds:[]}}}};
const failed=attemptEquipmentUpgrade(dangerous,'STONEHEART_RING',.99);
ok(!failed.result.success&&!failed.result.downgraded&&failed.result.newRank===6,'Failure should preserve the current rank');
ok(gearEnhancement(failed.state,'STONEHEART_RING').failures===1,'Failure should increment pity');
ok(Math.abs(upgradeQuote(failed.state,'STONEHEART_RING').successChance-.30)<.000001,'Pity should add two percentage points to the same target rank');
const storedEnhanced={...upgraded,inventory:{...upgraded.inventory,stacks:[...upgraded.inventory.stacks,{itemId:'STONEHEART_RING',quantity:1}]}};
let soldEnhanced=false,salvagedEnhanced=false;try{sellItem(storedEnhanced,'STONEHEART_RING')}catch{soldEnhanced=true}try{salvageItem(storedEnhanced,'STONEHEART_RING')}catch{salvagedEnhanced=true}
ok(soldEnhanced&&salvagedEnhanced,'Enhanced gear must be protected from disposal in the domain layer');
console.log('equipment enhancement tests passed');
