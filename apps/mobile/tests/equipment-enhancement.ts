import {createCharacter,effectiveStats,newGame,previewActivityReward,salvageItem,sellItem,sellBankItem,startCombat} from '../src/core/game';
import {attemptEquipmentUpgrade,equippedEffectGemBonuses,gearEnhancement,gearStatsAtRank,gemSocketCapacity,normalizeEnhancementGemSlots,socketGem,unsocketGem,upgradeQuote} from '../src/core/equipment-enhancement';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';
import {previewEquipment} from '../src/core/equipment-preview';
import {bulkSelectionSummary,bulkSellSelected,bulkSalvageSelected} from '../src/core/inventory-bulk';
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
// The original +1 ring is EQUIPPED. The Inventory copy is an unmarked spare
// and selling/salvaging it must not delete or mutate the protected equipped ring.
const storedEnhanced={...upgraded,inventory:{...upgraded.inventory,stacks:[...upgraded.inventory.stacks,{itemId:ringId,quantity:1}]}};
const soldSpare=sellItem(storedEnhanced,ringId);
ok(!soldSpare.inventory.stacks.some(row=>row.itemId===ringId),'An unenchanted Inventory spare can be sold while its upgraded twin is equipped');
ok(gearEnhancement(soldSpare,ringId).rank===1&&soldSpare.character!.equipment.ring===ringId,'Selling the spare must preserve the equipped original and its upgrade');
if(itemDef(ringId).salvage){
 const salvagedSpare=salvageItem(storedEnhanced,ringId);
 ok(!salvagedSpare.inventory.stacks.some(row=>row.itemId===ringId),'A salvageable spare can be salvaged while the enhanced original is equipped');
 ok(gearEnhancement(salvagedSpare,ringId).rank===1,'Salvaging a spare must preserve the original enhancement');
}
// Legacy itemId-only copies cannot be individually distinguished on equip:
 // the UI disables redundant same-ID swaps. A permitted comparison must
 // match the real equip reducer, rather than invent an unattainable +0 result.
const eligibleSpare={...storedEnhanced,character:{...storedEnhanced.character!,level:Math.max(storedEnhanced.character!.level,itemDef(ringId).requiredLevel??1)}};
const previewSpare=previewEquipment(eligibleSpare,ringId),actualSpare=equipItem(eligibleSpare,ringId);
ok(gearEnhancement(previewSpare,ringId).rank===gearEnhancement(actualSpare,ringId).rank,
 'Legacy duplicate preview must match the authoritative same-ID equip result');
ok(gearEnhancement(storedEnhanced,ringId).rank===1,'Preview must never mutate the actual equipped enchantment');
const bulkSpare=bulkSelectionSummary(storedEnhanced,[ringId],'inventory');
ok(bulkSpare.sellableIds.includes(ringId),'Bulk management may offer selling an unmarked spare when the enhanced copy is equipped');
ok(bulkSpare.salvageableIds.includes(ringId)===!!itemDef(ringId).salvage,'Bulk salvage must still require an authored salvage recipe');
ok(gearEnhancement(bulkSellSelected(storedEnhanced,[ringId]),ringId).rank===1,'Bulk selling an unenchanted spare retains the equipped upgrade');
if(itemDef(ringId).salvage)ok(gearEnhancement(bulkSalvageSelected(storedEnhanced,[ringId]),ringId).rank===1,'Bulk salvaging an unenchanted spare retains the equipped upgrade');
const bankSpare={...storedEnhanced,inventory:{...storedEnhanced.inventory,stacks:storedEnhanced.inventory.stacks.filter(row=>row.itemId!==ringId)},bank:{...storedEnhanced.bank,stacks:[...storedEnhanced.bank.stacks,{itemId:ringId,quantity:1}]}};
ok(gearEnhancement(sellBankItem(bankSpare,ringId),ringId).rank===1,'Selling an unmarked Bank duplicate preserves the enchanted equipped original');

// When the original is UNEQUIPPED, its legacy itemId key cannot identify an
// individual physical copy: the last unmarked matching copy remains protected.
const unequippedLegacy={...storedEnhanced,character:{...storedEnhanced.character!,equipment:{...storedEnhanced.character!.equipment,ring:undefined}}};
let soldOnly=false,salvagedOnly=false;try{sellItem(unequippedLegacy,ringId)}catch{soldOnly=true}try{salvageItem(unequippedLegacy,ringId)}catch{salvagedOnly=true}
ok(soldOnly&&salvagedOnly,'Never dispose of the last unlocated legacy enhanced copy');
ok(!bulkSelectionSummary(unequippedLegacy,[ringId],'inventory').sellableIds.includes(ringId),'Bulk selling must also protect the last unlocated enhanced copy');
const twoUnequipped={...unequippedLegacy,inventory:{...unequippedLegacy.inventory,stacks:unequippedLegacy.inventory.stacks.map(row=>row.itemId===ringId?{...row,quantity:2}:row)}};
ok(sellItem(twoUnequipped,ringId).inventory.stacks.some(row=>row.itemId===ringId&&row.quantity===1),'Legacy enhancement retains at least one unmarked copy after selling a duplicate');


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
