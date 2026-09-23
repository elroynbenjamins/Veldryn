import {createCharacter,effectiveStats,newGame,previewActivityReward,salvageItem,sellItem,startCombat} from '../src/core/game';
import {attemptEquipmentUpgrade,equippedEffectGemBonuses,gearEnhancement,gemSocketCapacity,normalizeEnhancementGemSlots,socketGem,unsocketGem,upgradeQuote} from '../src/core/equipment-enhancement';
import {EQUIPMENT_ITEMS_V33} from '../src/content/equipment-items-v33';
function ok(condition:unknown,message:string){if(!condition)throw new Error(message)}

let state=createCharacter(newGame(1),'IRONWARDEN','Smith','male');
const gear=EQUIPMENT_ITEMS_V33.find(item=>item.classRestriction==='IRONWARDEN'&&item.slot==='ring')!;
state={...state,character:{...state.character!,gold:100000,equipment:{...state.character!.equipment,ring:gear.id}},inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'TEMPERING_DUST',quantity:999},{itemId:'TEMPERING_CORE',quantity:99},{itemId:'WARD_SHARD',quantity:2},{itemId:'SWIFT_SIGIL',quantity:1}]}}; 
ok(gemSocketCapacity(gear.id)===2,'Every equipment piece should expose one Stat and one Effect socket');
ok(upgradeQuote(state,gear.id).successChance===1,'The first upgrade should be guaranteed');
const before=effectiveStats(state);
const upgraded=attemptEquipmentUpgrade(state,gear.id,.99).state;
ok(gearEnhancement(upgraded,gear.id).rank===1,'Successful upgrade should increase rank');
ok(effectiveStats(upgraded).defense>before.defense,'Upgrade should increase effective defense');

const statSocketed=socketGem(upgraded,gear.id,'WARD_SHARD');
ok(gearEnhancement(statSocketed,gear.id).statGemId==='WARD_SHARD','Stat Gem should occupy the Stat socket');
ok(effectiveStats(statSocketed).defense>effectiveStats(upgraded).defense,'Ward gem should increase defense');
let duplicateStat=false;try{socketGem(statSocketed,gear.id,'WARD_SHARD')}catch{duplicateStat=true}ok(duplicateStat,'A second Stat Gem must not occupy the Effect socket');

const fullySocketed=socketGem(statSocketed,gear.id,'SWIFT_SIGIL');
ok(gearEnhancement(fullySocketed,gear.id).effectGemId==='SWIFT_SIGIL','Effect Gem should occupy the Effect socket');
ok(Math.abs(equippedEffectGemBonuses(fullySocketed).combat_speed-.02)<.000001,'Swift Sigil should provide its behavioral combat-speed bonus');

const goldBeforeEffectExtract=fullySocketed.character!.gold;
const effectExtracted=unsocketGem(fullySocketed,gear.id,1);
ok(!gearEnhancement(effectExtracted,gear.id).effectGemId,'Effect extraction should clear only the Effect socket');
ok(gearEnhancement(effectExtracted,gear.id).statGemId==='WARD_SHARD','Effect extraction must preserve the Stat Gem');
ok(effectExtracted.character!.gold===goldBeforeEffectExtract-500,'Effect extraction should consume the Tier 1 extraction fee');

const goldBeforeStatExtract=effectExtracted.character!.gold;
const extracted=unsocketGem(effectExtracted,gear.id,0);
ok(!gearEnhancement(extracted,gear.id).statGemId,'Stat extraction should clear the Stat socket');
ok(extracted.character!.gold===goldBeforeStatExtract-500,'Stat extraction should consume gold');
ok((extracted.inventory.stacks.find(stack=>stack.itemId==='WARD_SHARD')?.quantity??0)>=2,'Extraction should return the Stat Gem');

const legacy=normalizeEnhancementGemSlots({rank:0,failures:0,gemIds:['WARD_SHARD','EMBER_SHARD','SWIFT_SIGIL']});
ok(legacy.statGemId==='WARD_SHARD'&&legacy.effectGemId==='SWIFT_SIGIL','Legacy arrays should normalize into the first valid Stat and Effect Gem');

const dangerous={...upgraded,character:{...upgraded.character!,gearEnhancements:{[gear.id]:{rank:6,failures:0,gemIds:[]}}}};
const failed=attemptEquipmentUpgrade(dangerous,gear.id,.99);
ok(!failed.result.success&&!failed.result.downgraded&&failed.result.newRank===6,'Failure should preserve the current rank');
ok(gearEnhancement(failed.state,gear.id).failures===1,'Failure should increment pity');
ok(Math.abs(upgradeQuote(failed.state,gear.id).successChance-.30)<.000001,'Pity should add two percentage points to the same target rank');
const storedEnhanced={...upgraded,inventory:{...upgraded.inventory,stacks:[...upgraded.inventory.stacks,{itemId:gear.id,quantity:1}]}};
let soldEnhanced=false,salvagedEnhanced=false;try{sellItem(storedEnhanced,gear.id)}catch{soldEnhanced=true}try{salvageItem(storedEnhanced,gear.id)}catch{salvagedEnhanced=true}
ok(soldEnhanced&&salvagedEnhanced,'Enhanced gear must be protected from disposal in the domain layer');

// Behavioral Effect Gems must change trusted combat simulation rather than being display-only.
const combatBase=createCharacter(newGame(1),'IRONWARDEN','Effect Test','male');
const started=startCombat(combatBase,'MOSS_RAT',1000);
const baselineReward=previewActivityReward(started,1000+3600_000);
const withSwift={...started,character:{...started.character!,gearEnhancements:{basic_sword:{rank:0,failures:0,effectGemId:'SWIFT_SIGIL',gemIds:['SWIFT_SIGIL']}}}};
const swiftReward=previewActivityReward(withSwift,1000+3600_000);
ok(swiftReward.kills>baselineReward.kills,'Combat-speed Effect Gem should increase simulated kills over a long verified combat window');

console.log('equipment enhancement tests passed');
