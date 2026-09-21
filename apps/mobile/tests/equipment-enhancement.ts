import {EQUIPMENT_ITEMS_V33} from '../src/content/equipment-items-v33';
import {createCharacter,effectiveStats,newGame,salvageItem,sellItem} from '../src/core/game';
import {attemptEquipmentUpgrade,equippedEffectGemBonuses,gearEnhancement,gemSocketCapacity,gemSocketLayout,socketGem,unsocketGem,upgradeQuote} from '../src/core/equipment-enhancement';
function ok(condition:unknown,message:string){if(!condition)throw new Error(message)}

let state=createCharacter(newGame(1),'IRONWARDEN','Smith','male');
state={...state,character:{...state.character!,gold:100000,equipment:{...state.character!.equipment,ring:'STONEHEART_RING'}},inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'TEMPERING_DUST',quantity:999},{itemId:'TEMPERING_CORE',quantity:99},{itemId:'WARD_SHARD',quantity:2},{itemId:'GEFF_001',quantity:1}]}};

const uncommon=EQUIPMENT_ITEMS_V33.find(item=>item.rarity==='uncommon');
ok(!!uncommon,'Expected an Uncommon V33 item for socket policy coverage');
ok(gemSocketCapacity('basic_sword')===0,'Common gear should have no active typed sockets');
ok(gemSocketCapacity(uncommon!.id)===1&&gemSocketLayout(uncommon!.id).statUnlocked&&!gemSocketLayout(uncommon!.id).effectUnlocked,'Uncommon gear should unlock only the Stat socket');
ok(gemSocketCapacity('STONEHEART_RING')===2&&gemSocketLayout('STONEHEART_RING').effectUnlocked,'Rare gear should unlock Stat and Effect sockets');
ok(upgradeQuote(state,'STONEHEART_RING').successChance===1,'The first upgrade should be guaranteed');

const before=effectiveStats(state);
const upgraded=attemptEquipmentUpgrade(state,'STONEHEART_RING',.99).state;
ok(gearEnhancement(upgraded,'STONEHEART_RING').rank===1,'Successful upgrade should increase rank');
ok(effectiveStats(upgraded).defense>before.defense,'Upgrade should increase effective defense');

const statSocketed=socketGem(upgraded,'STONEHEART_RING','WARD_SHARD');
ok(gearEnhancement(statSocketed,'STONEHEART_RING').statGemId==='WARD_SHARD','Stat Gem should occupy the Stat socket');
ok(effectiveStats(statSocketed).defense>effectiveStats(upgraded).defense,'Ward Stat Gem should increase defense');
let secondStatRejected=false;try{socketGem(statSocketed,'STONEHEART_RING','WARD_SHARD')}catch{secondStatRejected=true}ok(secondStatRejected,'A second Stat Gem must not occupy the Effect socket');

const effectSocketed=socketGem(statSocketed,'STONEHEART_RING','GEFF_001');
const typed=gearEnhancement(effectSocketed,'STONEHEART_RING');
ok(typed.statGemId==='WARD_SHARD'&&typed.effectGemId==='GEFF_001','Rare gear should hold one Stat and one Effect Gem');
ok(typed.gemIds.length===2,'Compatibility gem view should contain the two active typed gems');
ok(equippedEffectGemBonuses(effectSocketed).combatSpeedMultiplier>1,'Momentum Effect Gem should change the authoritative combat multiplier');
ok((effectiveStats(effectSocketed).haste??0)>(effectiveStats(statSocketed).haste??0),'Momentum Effect Gem should be visible in the Haste summary');

const goldBeforeEffectExtract=effectSocketed.character!.gold;
const effectExtracted=unsocketGem(effectSocketed,'STONEHEART_RING',1);
ok(!gearEnhancement(effectExtracted,'STONEHEART_RING').effectGemId,'Effect extraction should clear only the Effect socket');
ok(gearEnhancement(effectExtracted,'STONEHEART_RING').statGemId==='WARD_SHARD','Effect extraction must preserve the Stat socket');
ok(effectExtracted.character!.gold===goldBeforeEffectExtract-500,'Effect extraction should consume its safe extraction fee');
ok(effectExtracted.inventory.stacks.find(stack=>stack.itemId==='GEFF_001')?.quantity===1,'Effect extraction should return the gem');

const goldBeforeStatExtract=effectExtracted.character!.gold;
const extracted=unsocketGem(effectExtracted,'STONEHEART_RING',0);
ok(!gearEnhancement(extracted,'STONEHEART_RING').statGemId,'Stat extraction should clear the Stat socket');
ok(extracted.character!.gold===goldBeforeStatExtract-500,'Stat extraction should consume gold');

const legacyState={...state,character:{...state.character!,gearEnhancements:{STONEHEART_RING:{rank:0,failures:0,gemIds:['WARD_SHARD','WARD_SHARD','EMBER_SHARD']}}}};
const migratedLegacy=gearEnhancement(legacyState,'STONEHEART_RING');
ok(migratedLegacy.statGemId==='WARD_SHARD','First legacy Stat Gem should migrate into the typed Stat socket');
ok(migratedLegacy.legacyGemIds?.length===2,'Extra old sockets must be retained as extractable legacy gems');
ok(migratedLegacy.legacyGemIds?.[0]==='WARD_SHARD'&&migratedLegacy.legacyGemIds?.[1]==='EMBER_SHARD','Duplicate and distinct legacy gems must preserve order and quantity');

const dangerous={...upgraded,character:{...upgraded.character!,gearEnhancements:{STONEHEART_RING:{rank:6,failures:0,gemIds:[]}}}};
const failed=attemptEquipmentUpgrade(dangerous,'STONEHEART_RING',.99);
ok(!failed.result.success&&!failed.result.downgraded&&failed.result.newRank===6,'Failure should preserve the current rank');
ok(gearEnhancement(failed.state,'STONEHEART_RING').failures===1,'Failure should increment pity');
ok(Math.abs(upgradeQuote(failed.state,'STONEHEART_RING').successChance-.30)<.000001,'Pity should add two percentage points to the same target rank');

const storedEnhanced={...upgraded,inventory:{...upgraded.inventory,stacks:[...upgraded.inventory.stacks,{itemId:'STONEHEART_RING',quantity:1}]}};
let soldEnhanced=false,salvagedEnhanced=false;try{sellItem(storedEnhanced,'STONEHEART_RING')}catch{soldEnhanced=true}try{salvageItem(storedEnhanced,'STONEHEART_RING')}catch{salvagedEnhanced=true}
ok(soldEnhanced&&salvagedEnhanced,'Enhanced gear must be protected from disposal in the domain layer');
console.log('equipment enhancement and typed socket tests passed');
