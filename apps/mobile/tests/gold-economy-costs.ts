import {createCharacter,newGame,storageUpgradePreview,upgradeStorage} from '../src/core/game';
import {COMPANION_SANCTUARY_CONFIG} from '../src/content/combat-companions';
import {companionSanctuaryUpgradeCost,upgradeCompanionSanctuary} from '../src/core/combat-companions';
import {RECIPES,recipeDef} from '../src/content/skills';
import {ALCHEMY_RECIPES,alchemyRecipeDef} from '../src/content/alchemy';
import {NOVICE_RECIPES} from '../src/content/novice-sets';
import {V33_EQUIPMENT_RECIPES,EQUIPMENT_FORGE_GOLD_MULTIPLIER} from '../src/content/equipment-recipes-v33';
import {GUILD_COMPONENT_RECIPES} from '../src/content/guild-components';
import {TOOL_RECIPES,GATHERING_TOOLS} from '../src/content/gathering-tools';
import {GEM_COMBINE_COSTS_V1,GEM_REFINE_COSTS_V1} from '../src/core/gem-progression-v1';
import {increasedCraftingGoldCost} from '../src/content/crafting-gold-cost';

function ok(value:boolean,message:string){if(!value)throw new Error(message)}
function rejects(fn:()=>unknown,message:string){let threw=false;try{fn()}catch{threw=true}ok(threw,message)}
const before=createCharacter(newGame(0),'IRONWARDEN');
const inventoryPrices=[10000,30000,80000,200000,500000];
const bankPrices=[10000,30000,80000,200000,500000];
for(let i=0;i<5;i++){
 const capacity=[30,40,50,60,75][i],bankCapacity=[120,160,220,300,400][i];
 ok(storageUpgradePreview({...before,inventory:{...before.inventory,capacity}},'inventory')?.cost===inventoryPrices[i],'Inventory tier '+i+' must charge 2× the old Gold amount');
 ok(storageUpgradePreview({...before,bank:{...before.bank,capacity:bankCapacity}},'bank')?.cost===bankPrices[i],'Bank prices are out of scope and must not increase');
}
const poorInventory={...before,character:{...before.character!,level:10,gold:9999}};
const poorSnapshot=JSON.stringify(poorInventory);
rejects(()=>upgradeStorage(poorInventory,'inventory'),'Inventory upgrade requires the new price');
ok(JSON.stringify(poorInventory)===poorSnapshot,'Rejected upgrade must be atomic');
const fundedInventory={...poorInventory,character:{...poorInventory.character,gold:10000}};
const upgradedInventory=upgradeStorage(fundedInventory,'inventory');
ok(upgradedInventory.inventory.capacity===40&&upgradedInventory.character?.gold===0,'Inventory upgrade must deduct exactly 10,000 Gold');

const expectedSanctuaryGold={
 trainingGround:[3600,10400,24000],
 essenceBasin:[4400,13000,29000],
 bondHall:[5000,14400,32000],
 expeditionPens:[17000,32000,56000],
 masteryChamber:[36000],
} as const;
for(const key of Object.keys(expectedSanctuaryGold) as Array<keyof typeof expectedSanctuaryGold>){
 ok(JSON.stringify(COMPANION_SANCTUARY_CONFIG[key].goldCosts)===JSON.stringify(expectedSanctuaryGold[key]),key+' Sanctuary Gold prices must be doubled');
}
const sanctuaryState={...before,
 character:{...before.character!,gold:3600},
 inventory:{...before.inventory,stacks:[{itemId:'ASTER_IRON_INGOT',quantity:8}]},
 account:{...before.account,companionEssence:120}};
ok(companionSanctuaryUpgradeCost(sanctuaryState,'trainingGround')?.gold===3600,'Displayed Sanctuary price must match the charge');
const sanctuaryUpgraded=upgradeCompanionSanctuary(sanctuaryState,'trainingGround');
ok(sanctuaryUpgraded.character?.gold===0&&sanctuaryUpgraded.account.companionEssence===0,'Sanctuary Gold and Essence must be charged atomically');
ok(sanctuaryUpgraded.account.companionSanctuary?.trainingGroundLevel===1,'Sanctuary level must increase');
const sanctuaryPoor={...sanctuaryState,character:{...sanctuaryState.character,gold:3599}};
const sanctuaryPoorBefore=JSON.stringify(sanctuaryPoor);
rejects(()=>upgradeCompanionSanctuary(sanctuaryPoor,'trainingGround'),'Sanctuary must reject one Gold short');
ok(JSON.stringify(sanctuaryPoor)===sanctuaryPoorBefore,'Rejected Sanctuary upgrade must not mutate resources');

ok(increasedCraftingGoldCost(4)===5&&increasedCraftingGoldCost(18)===22&&increasedCraftingGoldCost(75)===90,'Craft prices round upward to whole Gold');
for(const [id,expected] of [
 ['SMELT_COPPER_INGOT',36],['COOK_MEADOW_PERCH',42],
 ['ENCHANT_REGIONAL_CATALYST',14400],['FORGE_REINFORCED_FITTING',60],
 ['BREW_DEWLEAF_DRAUGHT',25],['BREW_VERDANT_BINDING_RESIN',22],
 ['GUILD_FORGE_TIMBER',180],['CRAFT_COPPER_PICKAXE',288],
] as const)ok(recipeDef(id)?.gold===expected,id+' Gold must match the authoritative recipe catalog');
ok(alchemyRecipeDef('BREW_DEWLEAF_DRAUGHT')?.gold===25,'Alchemy standalone preview matches the recipe catalog');
ok(ALCHEMY_RECIPES.every(recipe=>RECIPES.find(entry=>entry.id===recipe.id)?.gold===recipe.gold),'All Alchemy recipes share exact client/server Gold');
ok(GUILD_COMPONENT_RECIPES.every(recipe=>RECIPES.find(entry=>entry.id===recipe.id)?.gold===recipe.gold),'Guild materials must not be charged twice');
ok(TOOL_RECIPES.every(recipe=>RECIPES.find(entry=>entry.id===recipe.id)?.gold===recipe.gold),'Tool recipes must match their preview costs');
ok(TOOL_RECIPES.every(recipe=>GATHERING_TOOLS.find(entry=>recipe.output.itemId===entry.id)?.recipe.gold===recipe.gold),'Tool definition prices must match craft charges');
ok(NOVICE_RECIPES.every(recipe=>RECIPES.find(entry=>entry.id===recipe.id)?.gold===recipe.gold),'Novice equipment must not be charged twice');
ok(V33_EQUIPMENT_RECIPES.every(recipe=>RECIPES.find(entry=>entry.id===recipe.id)?.gold===recipe.gold),'Regional equipment must not be charged twice');
ok(EQUIPMENT_FORGE_GOLD_MULTIPLIER===3,'The base triple forge multiplier remains intact');
ok(GEM_REFINE_COSTS_V1[1].gold===90&&GEM_REFINE_COSTS_V1[5].gold===9600,'Gem refinement fees increase 20%');
ok(GEM_COMBINE_COSTS_V1[1].gold===1800&&GEM_COMBINE_COSTS_V1[4].gold===72000,'Gem combination fees increase 20%');
console.log('PASS: 2× Inventory/Sanctuary, +20% base craft fees plus 5× healing draught costs, exact previews, bank unchanged, atomic charges');
