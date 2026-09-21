import {createCharacter,effectiveStats,newGame,previewActivityReward,salvageGearInstance,sellGearInstance,startCombat,unequipItem} from '../src/core/game';
import {attemptEquipmentUpgrade,equippedEffectGemBonuses,gearEnhancement,gemSocketCapacity,normalizeEnhancementGemSlots,socketGem,unsocketGem,upgradeQuote} from '../src/core/equipment-enhancement';
import {gearInstanceById,gearInstancesForStorage,migrateToPerInstanceGear,updateGearInstance} from '../src/core/gear-instances';
function ok(condition:unknown,message:string){if(!condition)throw new Error(message)}

let state=createCharacter(newGame(1),'IRONWARDEN','Smith','male');
state={...state,character:{...state.character!,gold:100000,equipment:{...state.character!.equipment,ring:'STONEHEART_RING'}},inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'TEMPERING_DUST',quantity:999},{itemId:'TEMPERING_CORE',quantity:99},{itemId:'WARD_SHARD',quantity:2},{itemId:'SWIFT_SIGIL',quantity:1}]}};
state=migrateToPerInstanceGear(state);
const ringInstanceId=state.character!.equipmentInstanceIds!.ring!;
ok(Boolean(ringInstanceId),'Migrated equipped gear must receive an exact instance ID');
ok(gemSocketCapacity('STONEHEART_RING')===2,'Every equipment piece should expose one Stat and one Effect socket');
ok(upgradeQuote(state,'STONEHEART_RING',ringInstanceId).successChance===1,'The first upgrade should be guaranteed');
const before=effectiveStats(state);
const upgraded=attemptEquipmentUpgrade(state,ringInstanceId,.99).state;
ok(gearEnhancement(upgraded,'STONEHEART_RING',ringInstanceId).rank===1,'Successful upgrade should increase only the selected instance rank');
ok(effectiveStats(upgraded).defense>before.defense,'Upgrade should increase effective defense');

const statSocketed=socketGem(upgraded,ringInstanceId,'WARD_SHARD');
ok(gearEnhancement(statSocketed,'STONEHEART_RING',ringInstanceId).statGemId==='WARD_SHARD','Stat Gem should occupy the selected copy Stat socket');
ok(effectiveStats(statSocketed).defense>effectiveStats(upgraded).defense,'Ward gem should increase defense');
let duplicateStat=false;try{socketGem(statSocketed,ringInstanceId,'WARD_SHARD')}catch{duplicateStat=true}ok(duplicateStat,'A second Stat Gem must not occupy the Effect socket');

const fullySocketed=socketGem(statSocketed,ringInstanceId,'SWIFT_SIGIL');
ok(gearEnhancement(fullySocketed,'STONEHEART_RING',ringInstanceId).effectGemId==='SWIFT_SIGIL','Effect Gem should occupy the selected copy Effect socket');
ok(Math.abs(equippedEffectGemBonuses(fullySocketed).combat_speed-.02)<.000001,'Swift Sigil should provide its behavioral combat-speed bonus');

const goldBeforeEffectExtract=fullySocketed.character!.gold;
const effectExtracted=unsocketGem(fullySocketed,ringInstanceId,1);
ok(!gearEnhancement(effectExtracted,'STONEHEART_RING',ringInstanceId).effectGemId,'Effect extraction should clear only the selected copy Effect socket');
ok(gearEnhancement(effectExtracted,'STONEHEART_RING',ringInstanceId).statGemId==='WARD_SHARD','Effect extraction must preserve the selected copy Stat Gem');
ok(effectExtracted.character!.gold===goldBeforeEffectExtract-500,'Effect extraction should consume the Tier 1 extraction fee');

const goldBeforeStatExtract=effectExtracted.character!.gold;
const extracted=unsocketGem(effectExtracted,ringInstanceId,0);
ok(!gearEnhancement(extracted,'STONEHEART_RING',ringInstanceId).statGemId,'Stat extraction should clear the selected copy Stat socket');
ok(extracted.character!.gold===goldBeforeStatExtract-500,'Stat extraction should consume gold');
ok((extracted.inventory.stacks.find(stack=>stack.itemId==='WARD_SHARD')?.quantity??0)>=2,'Extraction should return the Stat Gem');

const legacy=normalizeEnhancementGemSlots({rank:0,failures:0,gemIds:['WARD_SHARD','EMBER_SHARD','SWIFT_SIGIL']});
ok(legacy.statGemId==='WARD_SHARD'&&legacy.effectGemId==='SWIFT_SIGIL','Legacy arrays should normalize into the first valid Stat and Effect Gem');

const dangerous=updateGearInstance(upgraded,ringInstanceId,row=>({...row,enhancement:{rank:6,failures:0,gemIds:[]}}));
const failed=attemptEquipmentUpgrade(dangerous,ringInstanceId,.99);
ok(!failed.result.success&&!failed.result.downgraded&&failed.result.newRank===6,'Failure should preserve the selected copy current rank');
ok(gearEnhancement(failed.state,'STONEHEART_RING',ringInstanceId).failures===1,'Failure should increment pity only on the selected copy');
ok(Math.abs(upgradeQuote(failed.state,'STONEHEART_RING',ringInstanceId).successChance-.30)<.000001,'Pity should add two percentage points to the same target rank');

const storedEnhanced=unequipItem(upgraded,'ring');
let soldEnhanced=false,salvagedEnhanced=false;try{sellGearInstance(storedEnhanced,ringInstanceId)}catch{soldEnhanced=true}try{salvageGearInstance(storedEnhanced,ringInstanceId)}catch{salvagedEnhanced=true}
ok(soldEnhanced&&salvagedEnhanced,'The selected enhanced copy must stay protected from disposal');

const duplicateBase={...storedEnhanced,inventory:{...storedEnhanced.inventory,stacks:[...storedEnhanced.inventory.stacks,{itemId:'STONEHEART_RING',quantity:1}]}};
const duplicateState=migrateToPerInstanceGear(duplicateBase);
const duplicateId=gearInstancesForStorage(duplicateState,'inventory','STONEHEART_RING',duplicateState.character!.id).find(row=>row.id!==ringInstanceId)!.id;
const soldDuplicate=sellGearInstance(duplicateState,duplicateId);
ok(Boolean(gearInstanceById(soldDuplicate,ringInstanceId))&&!gearInstanceById(soldDuplicate,duplicateId),'Selling an unenhanced duplicate must remove only that selected instance');
const salvagedDuplicate=salvageGearInstance(duplicateState,duplicateId);
ok(Boolean(gearInstanceById(salvagedDuplicate,ringInstanceId))&&!gearInstanceById(salvagedDuplicate,duplicateId),'Salvaging an unenhanced duplicate must remove only that selected instance');

// Behavioral Effect Gems must change trusted combat simulation rather than being display-only.
let combatBase=createCharacter(newGame(1),'IRONWARDEN','Effect Test','male');
const baselineStarted=startCombat(combatBase,'MOSS_RAT',1000);
const baselineReward=previewActivityReward(baselineStarted,1000+3600_000);
combatBase={...combatBase,inventory:{...combatBase.inventory,stacks:[...combatBase.inventory.stacks,{itemId:'SWIFT_SIGIL',quantity:1}]}};
combatBase=migrateToPerInstanceGear(combatBase);
const swordInstanceId=combatBase.character!.equipmentInstanceIds!.weapon!;
const swiftReady=socketGem(combatBase,swordInstanceId,'SWIFT_SIGIL');
const swiftStarted=startCombat(swiftReady,'MOSS_RAT',1000);
const swiftReward=previewActivityReward(swiftStarted,1000+3600_000);
ok(swiftReward.kills>baselineReward.kills,'Combat-speed Effect Gem should increase simulated kills over a long verified combat window');

console.log('PASS: exact equipment instances own independent ranks/gems and disposal protection');
