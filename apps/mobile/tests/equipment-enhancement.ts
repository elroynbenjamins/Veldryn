import {createCharacter,effectiveStats,newGame,salvageItem,sellItem} from '../src/core/game';
import {attemptEquipmentUpgrade,gearEnhancement,gemSocketCapacity,gemSocketLayout,socketGem,unsocketGem,upgradeQuote} from '../src/core/equipment-enhancement';
function ok(condition:unknown,message:string){if(!condition)throw new Error(message)}

let state=createCharacter(newGame(1),'IRONWARDEN','Smith','male');
state={...state,character:{...state.character!,gold:100000,equipment:{...state.character!.equipment,ring:'STONEHEART_RING'}},inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'TEMPERING_DUST',quantity:999},{itemId:'TEMPERING_CORE',quantity:99},{itemId:'WARD_SHARD',quantity:2},{itemId:'FOCUS_SHARD',quantity:1}]}};
ok(gemSocketCapacity('STONEHEART_RING')===2,'Rare gear should expose one Stat and one Effect socket');
ok(upgradeQuote(state,'STONEHEART_RING').successChance===1,'The first upgrade should be guaranteed');
const before=effectiveStats(state);
const upgraded=attemptEquipmentUpgrade(state,'STONEHEART_RING',.99).state;
ok(gearEnhancement(upgraded,'STONEHEART_RING').rank===1,'Successful upgrade should increase rank');
ok(effectiveStats(upgraded).defense>before.defense,'Upgrade should increase effective defense');
const statSocketed=socketGem(upgraded,'STONEHEART_RING','WARD_SHARD');
ok(gemSocketLayout(statSocketed,'STONEHEART_RING').stat.gemId==='WARD_SHARD','Stat gem should occupy the Stat socket');
ok(effectiveStats(statSocketed).defense>effectiveStats(upgraded).defense,'Ward gem should increase defense');
let duplicateStat=false;try{socketGem(statSocketed,'STONEHEART_RING','WARD_SHARD')}catch{duplicateStat=true}ok(duplicateStat,'A second Stat gem must be rejected even with the Effect socket open');
const fullySocketed=socketGem(statSocketed,'STONEHEART_RING','FOCUS_SHARD');
const layout=gemSocketLayout(fullySocketed,'STONEHEART_RING');
ok(layout.stat.gemId==='WARD_SHARD'&&layout.effect.gemId==='FOCUS_SHARD'&&layout.filled===2,'Rare gear should accept one gem of each role');
ok((effectiveStats(fullySocketed).critChance??0)>(effectiveStats(statSocketed).critChance??0),'Focus Effect gem should raise critical chance');
let duplicateEffect=false;try{socketGem(fullySocketed,'STONEHEART_RING','FOCUS_SHARD')}catch{duplicateEffect=true}ok(duplicateEffect,'A second Effect gem must be rejected');
const goldBeforeExtract=fullySocketed.character!.gold;
const extracted=unsocketGem(fullySocketed,'STONEHEART_RING',layout.stat.index!);
ok(gemSocketLayout(extracted,'STONEHEART_RING').stat.gemId===undefined,'Extraction should clear the selected typed socket');
ok(gemSocketLayout(extracted,'STONEHEART_RING').effect.gemId==='FOCUS_SHARD','Extracting Stat gem must not disturb Effect gem');
ok(extracted.character!.gold===goldBeforeExtract-500,'Tier 1 extraction should consume 500 gold');
ok(extracted.inventory.stacks.find(stack=>stack.itemId==='WARD_SHARD')?.quantity===2,'Extraction should return the consumed Stat gem');
const legacy={...upgraded,character:{...upgraded.character!,gearEnhancements:{STONEHEART_RING:{rank:1,failures:0,gemIds:['WARD_SHARD','VITALITY_SHARD']}}}};
ok(gemSocketLayout(legacy,'STONEHEART_RING').legacyExtras.length===1,'Grandfathered duplicate Stat gems should remain visible as legacy extras');
ok(effectiveStats(legacy).defense>effectiveStats(upgraded).defense,'Grandfathered Stat gem power should remain active until extraction');
const dangerous={...upgraded,character:{...upgraded.character!,gearEnhancements:{STONEHEART_RING:{rank:6,failures:0,gemIds:[]}}}};
const failed=attemptEquipmentUpgrade(dangerous,'STONEHEART_RING',.99);
ok(!failed.result.success&&!failed.result.downgraded&&failed.result.newRank===6,'Failure should preserve the current rank');
ok(gearEnhancement(failed.state,'STONEHEART_RING').failures===1,'Failure should increment pity');
ok(Math.abs(upgradeQuote(failed.state,'STONEHEART_RING').successChance-.30)<.000001,'Pity should add two percentage points to the same target rank');
const storedEnhanced={...upgraded,inventory:{...upgraded.inventory,stacks:[...upgraded.inventory.stacks,{itemId:'STONEHEART_RING',quantity:1}]}};
let soldEnhanced=false,salvagedEnhanced=false;try{sellItem(storedEnhanced,'STONEHEART_RING')}catch{soldEnhanced=true}try{salvageItem(storedEnhanced,'STONEHEART_RING')}catch{salvagedEnhanced=true}
ok(soldEnhanced&&salvagedEnhanced,'Enhanced gear must be protected from disposal in the domain layer');
console.log('equipment enhancement tests passed');
