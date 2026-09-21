import {createCharacter,effectiveStats,newGame,previewActivityReward,salvageItem,sellItem,startCombat} from '../src/core/game';
import {attemptEquipmentUpgrade,EFFECT_GEM_CAPS,equippedEffectGemBonuses,gearEnhancement,gemSocketCapacity,normalizeEnhancementGemSlots,socketGem,unsocketGem,upgradeQuote} from '../src/core/equipment-enhancement';
function ok(condition:unknown,message:string){if(!condition)throw new Error(message)}

let state=createCharacter(newGame(1),'IRONWARDEN','Smith','male');
state={...state,character:{...state.character!,gold:100000,equipment:{...state.character!.equipment,ring:'STONEHEART_RING'}},inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'TEMPERING_DUST',quantity:999},{itemId:'TEMPERING_CORE',quantity:99},{itemId:'WARD_SHARD',quantity:2},{itemId:'EMBER_SHARD',quantity:1},{itemId:'SWIFT_SIGIL',quantity:1},{itemId:'BOSSBANE_SIGIL',quantity:1}]}}; 
ok(gemSocketCapacity('STONEHEART_RING')===2,'Every equipment piece should expose one Stat and one Effect socket');
ok(upgradeQuote(state,'STONEHEART_RING').successChance===1,'The first upgrade should be guaranteed');
const before=effectiveStats(state);
const upgraded=attemptEquipmentUpgrade(state,'STONEHEART_RING',.99).state;
ok(gearEnhancement(upgraded,'STONEHEART_RING').rank===1,'Successful upgrade should increase rank');
ok(effectiveStats(upgraded).defense>before.defense,'Upgrade should increase effective defense');

const statSocketed=socketGem(upgraded,'STONEHEART_RING','WARD_SHARD');
ok(gearEnhancement(statSocketed,'STONEHEART_RING').statGemId==='WARD_SHARD','Stat Gem should occupy the Stat socket');
ok(effectiveStats(statSocketed).defense>effectiveStats(upgraded).defense,'Ward gem should increase defense');
const goldBeforeStatReplace=statSocketed.character!.gold;
const statReplaced=socketGem(statSocketed,'STONEHEART_RING','EMBER_SHARD');
ok(gearEnhancement(statReplaced,'STONEHEART_RING').statGemId==='EMBER_SHARD','A Stat Gem can be replaced directly');
ok(statReplaced.character!.gold===goldBeforeStatReplace-500,'Direct Stat replacement should charge the old gem extraction fee');
ok((statReplaced.inventory.stacks.find(stack=>stack.itemId==='WARD_SHARD')?.quantity??0)>=2,'Direct replacement should return the old Stat Gem');
let duplicateStat=false;try{socketGem(statReplaced,'STONEHEART_RING','EMBER_SHARD')}catch{duplicateStat=true}ok(duplicateStat,'The exact same Stat Gem cannot be redundantly socketed');

const fullySocketed=socketGem(statReplaced,'STONEHEART_RING','SWIFT_SIGIL');
ok(gearEnhancement(fullySocketed,'STONEHEART_RING').effectGemId==='SWIFT_SIGIL','Effect Gem should occupy the Effect socket');
ok(Math.abs(equippedEffectGemBonuses(fullySocketed).combat_speed-.02)<.000001,'Swift Sigil should provide its behavioral combat-speed bonus');
ok(EFFECT_GEM_CAPS.combat_speed===.10&&EFFECT_GEM_CAPS.boss_power===.15,'Effect Gem build caps should be explicit domain rules');

const goldBeforeEffectExtract=fullySocketed.character!.gold;
const effectExtracted=unsocketGem(fullySocketed,'STONEHEART_RING',1);
ok(!gearEnhancement(effectExtracted,'STONEHEART_RING').effectGemId,'Effect extraction should clear only the Effect socket');
ok(gearEnhancement(effectExtracted,'STONEHEART_RING').statGemId==='WARD_SHARD','Effect extraction must preserve the Stat Gem');
ok(effectExtracted.character!.gold===goldBeforeEffectExtract-500,'Effect extraction should consume the Tier 1 extraction fee');

const goldBeforeStatExtract=effectExtracted.character!.gold;
const extracted=unsocketGem(effectExtracted,'STONEHEART_RING',0);
ok(!gearEnhancement(extracted,'STONEHEART_RING').statGemId,'Stat extraction should clear the Stat socket');
ok(extracted.character!.gold===goldBeforeStatExtract-500,'Stat extraction should consume gold');
ok((extracted.inventory.stacks.find(stack=>stack.itemId==='WARD_SHARD')?.quantity??0)>=2,'Extraction should return the Stat Gem');

const legacy=normalizeEnhancementGemSlots({rank:0,failures:0,gemIds:['WARD_SHARD','EMBER_SHARD','SWIFT_SIGIL']});
ok(legacy.statGemId==='WARD_SHARD'&&legacy.effectGemId==='SWIFT_SIGIL','Legacy arrays should normalize into the first valid Stat and Effect Gem');

const dangerous={...upgraded,character:{...upgraded.character!,gearEnhancements:{STONEHEART_RING:{rank:6,failures:0,gemIds:[]}}}};
const failed=attemptEquipmentUpgrade(dangerous,'STONEHEART_RING',.99);
ok(!failed.result.success&&!failed.result.downgraded&&failed.result.newRank===6,'Failure should preserve the current rank');
ok(gearEnhancement(failed.state,'STONEHEART_RING').failures===1,'Failure should increment pity');
ok(Math.abs(upgradeQuote(failed.state,'STONEHEART_RING').successChance-.30)<.000001,'Pity should add two percentage points to the same target rank');
const storedEnhanced={...upgraded,inventory:{...upgraded.inventory,stacks:[...upgraded.inventory.stacks,{itemId:'STONEHEART_RING',quantity:1}]}};
let soldEnhanced=false,salvagedEnhanced=false;try{sellItem(storedEnhanced,'STONEHEART_RING')}catch{soldEnhanced=true}try{salvageItem(storedEnhanced,'STONEHEART_RING')}catch{salvagedEnhanced=true}
ok(soldEnhanced&&salvagedEnhanced,'Enhanced gear must be protected from disposal in the domain layer');

// Behavioral Effect Gems must change trusted combat simulation rather than being display-only.
const combatBase=createCharacter(newGame(1),'IRONWARDEN','Effect Test','male');
const started=startCombat(combatBase,'MOSS_RAT',1000);
const baselineReward=previewActivityReward(started,1000+3600_000);
const withSwift={...started,character:{...started.character!,gearEnhancements:{basic_sword:{rank:0,failures:0,effectGemId:'SWIFT_SIGIL',gemIds:['SWIFT_SIGIL']}}}};
const swiftReward=previewActivityReward(withSwift,1000+3600_000);
ok(swiftReward.kills>baselineReward.kills,'Combat-speed Effect Gem should increase simulated kills over a long verified combat window');

console.log('equipment enhancement tests passed');
