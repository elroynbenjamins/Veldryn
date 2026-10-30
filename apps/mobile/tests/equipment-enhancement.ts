import {createCharacter,effectiveStats,newGame,previewActivityReward,salvageItem,sellItem,startCombat} from '../src/core/game';
import {attemptEquipmentUpgrade,equippedEffectGemBonuses,gearEnhancement,gearStatsAtRank,gemSocketCapacity,normalizeEnhancementGemSlots,socketGem,unsocketGem,upgradeQuote} from '../src/core/equipment-enhancement';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';
import {gemPouch,gemStorageQuantity} from '../src/core/gem-pouch';
function ok(condition:unknown,message:string){if(!condition)throw new Error(message)}

const ringRecipe=V33_EQUIPMENT_RECIPES.find(row=>row.classId==='IRONWARDEN'&&row.v33EquipmentTier==='T1'&&itemDef(row.output.itemId).slot==='ring')!;
const ringId=ringRecipe.output.itemId;
let state=createCharacter(newGame(1),'IRONWARDEN','Smith','male');
state={...state,character:{...state.character!,gold:100000,equipment:{...state.character!.equipment,ring:ringId}},inventory:{...state.inventory,stacks:[...ringRecipe.inputs.map(input=>({itemId:input.itemId,quantity:999})),{itemId:'TEMPERING_DUST',quantity:999},{itemId:'TEMPERING_CORE',quantity:99},{itemId:'WARD_SHARD',quantity:2},{itemId:'SWIFT_SIGIL',quantity:1}]}};
ok(gemSocketCapacity(ringId)===2,'Every equipment piece should expose one Stat and one Effect socket');
ok(Math.abs(upgradeQuote(state,ringId).successChance-.95)<.000001,'The first regional improvement should have its authored 95% chance');
ok(upgradeQuote(state,ringId).materials.length===ringRecipe.inputs.length,'Regional improvement must consume the gear recipe materials');
ok(Math.abs(gearStatsAtRank(ringId,1).defense-(itemDef(ringId).defense??0)*1.04)<.000001,'A +4% improvement must preserve fractional item stats until equipped totals are calculated');
const before=effectiveStats(state);
const upgraded=attemptEquipmentUpgrade(state,ringId,.1).state;
ok(gearEnhancement(upgraded,ringId).rank===1,'Successful upgrade should increase rank');
ok(effectiveStats(upgraded).defense>before.defense,'Upgrade should increase effective defense');

const statSocketed=socketGem(upgraded,ringId,'WARD_SHARD');
ok(gearEnhancement(statSocketed,ringId).statGemId==='WARD_SHARD','Stat Gem should occupy the Stat socket');
ok(effectiveStats(statSocketed).defense>effectiveStats(upgraded).defense,'Ward gem should increase defense');
let duplicateStat=false;try{socketGem(statSocketed,ringId,'WARD_SHARD')}catch{duplicateStat=true}ok(duplicateStat,'A second Stat Gem must not occupy the Effect socket');

const fullySocketed=socketGem(statSocketed,ringId,'SWIFT_SIGIL');
ok(gearEnhancement(fullySocketed,ringId).effectGemId==='SWIFT_SIGIL','Effect Gem should occupy the Effect socket');
ok(Math.abs(equippedEffectGemBonuses(fullySocketed).combat_speed-.02)<.000001,'Swift Sigil should provide its behavioral combat-speed bonus');

const goldBeforeEffectExtract=fullySocketed.character!.gold;
const effectExtracted=unsocketGem(fullySocketed,ringId,1);
ok(!gearEnhancement(effectExtracted,ringId).effectGemId,'Effect extraction should clear only the Effect socket');
ok(gearEnhancement(effectExtracted,ringId).statGemId==='WARD_SHARD','Effect extraction must preserve the Stat Gem');
ok(effectExtracted.character!.gold===goldBeforeEffectExtract-500,'Effect extraction should consume the Tier 1 extraction fee');

const goldBeforeStatExtract=effectExtracted.character!.gold;
const extracted=unsocketGem(effectExtracted,ringId,0);
ok(!gearEnhancement(extracted,ringId).statGemId,'Stat extraction should clear the Stat socket');
ok(extracted.character!.gold===goldBeforeStatExtract-500,'Stat extraction should consume gold');
ok(gemStorageQuantity(extracted,'WARD_SHARD')===2&&(gemPouch(extracted).stacks.find(stack=>stack.itemId==='WARD_SHARD')?.quantity??0)===1,'Extraction should safely return the Stat Gem to the account Gem Pouch without losing legacy Inventory copies');

const legacy=normalizeEnhancementGemSlots({rank:0,failures:0,gemIds:['WARD_SHARD','EMBER_SHARD','SWIFT_SIGIL']});
ok(legacy.statGemId==='WARD_SHARD'&&legacy.effectGemId==='SWIFT_SIGIL','Legacy arrays should normalize into the first valid Stat and Effect Gem');

const second=attemptEquipmentUpgrade(upgraded,ringId,.1).state;
ok(gearEnhancement(second,ringId).rank===2,'Second regional improvement should increase rank');
const failed=attemptEquipmentUpgrade(second,ringId,.99);
ok(!failed.result.success&&!failed.result.downgraded&&failed.result.newRank===2,'Failure should preserve the current regional improvement rank');
ok(gearEnhancement(failed.state,ringId).failures===1,'Failure should increment pity');
ok(Math.abs(upgradeQuote(failed.state,ringId).successChance-.69)<.000001,'Pity should add two percentage points to the same target rank');
const third=attemptEquipmentUpgrade(failed.state,ringId,.1).state;
const fourth=attemptEquipmentUpgrade(third,ringId,.1).state;
ok(gearEnhancement(fourth,ringId).rank===4,'Fourth regional improvement should complete the item');
ok(upgradeQuote(fourth,ringId).maxed,'Each item must stop after four optional regional improvements');
const storedEnhanced={...upgraded,inventory:{...upgraded.inventory,stacks:[...upgraded.inventory.stacks,{itemId:ringId,quantity:1}]}};
let soldEnhanced=false,salvagedEnhanced=false;try{sellItem(storedEnhanced,ringId)}catch{soldEnhanced=true}try{salvageItem(storedEnhanced,ringId)}catch{salvagedEnhanced=true}
ok(soldEnhanced&&salvagedEnhanced,'Enhanced gear must be protected from disposal in the domain layer');

// But a crafted duplicate copy of an enhanced item can be sold: the enhancement travels with the retained copy.
const duplicateEnhanced={...fourth,inventory:{...fourth.inventory,stacks:[...fourth.inventory.stacks.filter(s=>s.itemId!==ringId),{itemId:ringId,quantity:2}]}};
const soldDuplicate=sellItem(duplicateEnhanced,ringId,1);
ok((soldDuplicate.inventory.stacks.find(s=>s.itemId===ringId)?.quantity??0)===1,'Selling one of two enhanced copies must leave one behind');
ok(gearEnhancement(soldDuplicate,ringId).rank===4,'Remaining enhanced copy must retain its upgrade rank after a duplicate sell');

// Behavioral Effect Gems must change trusted combat simulation rather than being display-only.
const combatBase=createCharacter(newGame(1),'IRONWARDEN','Effect Test','male');
const started=startCombat(combatBase,'MOSS_RAT',1000);
const baselineReward=previewActivityReward(started,1000+3600_000);
const withSwift={...started,character:{...started.character!,gearEnhancements:{basic_sword:{rank:0,failures:0,effectGemId:'SWIFT_SIGIL',gemIds:['SWIFT_SIGIL']}}}};
const swiftReward=previewActivityReward(withSwift,1000+3600_000);
ok(swiftReward.kills>baselineReward.kills,'Combat-speed Effect Gem should increase simulated kills over a long verified combat window');

console.log('equipment enhancement tests passed');
