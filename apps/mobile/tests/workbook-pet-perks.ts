import {CORE_PET_COLLECTIBLES,CORE_PET_RARITY_BY_ID} from '../src/content/core-pets';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {createCharacter,newGame,offlineCapSeconds,previewActivityReward,startCombat,startExploration} from '../src/core/game';
import {recordMonsterMastery} from '../src/core/monster-mastery';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
const near=(actual:number,expected:number,message:string)=>{if(Math.abs(actual-expected)>1e-10)fail(`${message}: expected ${expected}, got ${actual}`)};

const targetById:Record<string,string>={
  PET_001:'miningYield',PET_002:'miningYield',PET_003:'woodcuttingYield',PET_004:'woodcuttingYield',
  PET_005:'fishingYield',PET_006:'fishingYield',PET_007:'herbalismYield',PET_008:'herbalismYield',
  PET_009:'huntingYield',PET_010:'huntingYield',PET_011:'craftingSpeed',PET_012:'monsterMasteryXp',
  PET_013:'explorationProgress',PET_014:'offlineLootCapacity',PET_015:'gold',PET_016:'echoReward',
  PET_017:'foodDuration',PET_018:'monsterMasteryXp',PET_019:'gatheringSpeed',PET_020:'fishingSpeed',
  PET_021:'craftingSpeed',PET_022:'explorationProgress',PET_023:'monsterMasteryXp',PET_024:'huntingYield',
  PET_025:'herbalismSpeed',PET_026:'fishingSpeed',PET_027:'enchantingSpeed',PET_028:'monsterMasteryXp',
  PET_029:'miningYield',PET_030:'herbalismSpeed',PET_031:'cookingSpeed',PET_032:'craftingSpeed',
  PET_033:'monsterMasteryXp',
};

equal(CORE_PET_COLLECTIBLES.length,33,'permanent pet roster count');
for(const pet of CORE_PET_COLLECTIBLES){
  equal(pet.target,targetById[pet.id],`${pet.id} workbook perk identity`);
  equal(pet.rarity,CORE_PET_RARITY_BY_ID[pet.id],`${pet.id} workbook rarity`);
}
equal(CORE_PET_COLLECTIBLES.find(row=>row.id==='PET_018')?.activeBps,200,'Oathling Mythic rarity does not raise Lore Companion perk ceiling');
equal(CORE_PET_RARITY_BY_ID.PET_018,'Mythic','Oathling displays Mythic rarity');
equal(CORE_PET_RARITY_BY_ID.PET_023,'Mythic','Tyrant Larva displays Mythic rarity');
equal(CORE_PET_RARITY_BY_ID.PET_033,'Mythic','Cinder Crownling displays Mythic rarity');

let mining=createCharacter(newGame(0),'IRONWARDEN','Mining Pet');
mining={...mining,account:{...mining.account,unlockedCosmeticPetIds:['PET_001']},character:{...mining.character!,selectedCosmeticPetId:'PET_001'}};
let mult=characterPermanentMultipliers(mining);
near(mult.miningYieldMultiplier,1.025,'Ore Sniffer uses +0.50% owned plus +2.00% active');
near(mult.woodcuttingYieldMultiplier,1,'Ore Sniffer does not affect woodcutting yield');

let wood=createCharacter(newGame(0),'IRONWARDEN','Wood Pet');
wood={...wood,account:{...wood.account,unlockedCosmeticPetIds:['PET_003']},character:{...wood.character!,selectedCosmeticPetId:'PET_003'}};
near(characterPermanentMultipliers(wood).woodcuttingYieldMultiplier,1.025,'Woodland Nose uses the woodcutting channel');
near(characterPermanentMultipliers(wood).miningYieldMultiplier,1,'Woodland Nose does not affect mining yield');

let lore=createCharacter(newGame(0),'IRONWARDEN','Lore Pet');
lore={...lore,account:{...lore.account,unlockedCosmeticPetIds:['PET_012']},character:{...lore.character!,selectedCosmeticPetId:'PET_012'}};
const loreMult=characterPermanentMultipliers(lore).monsterMasteryXpMultiplier;
near(loreMult,1.025,'Lore Companion uses mastery XP channel');
lore=recordMonsterMastery(lore,'MOSS_RAT',40,loreMult);
equal(lore.character!.monsterMasteryPoints?.MOSS_RAT,41,'fractional Lore Companion mastery bonus accumulates into real mastery points');

const baselineExplore=startExploration(createCharacter(newGame(0),'IRONWARDEN','Baseline Scout'),'SCOUT_GREENFIELDS',0);
let boostedExplore=startExploration(createCharacter(newGame(0),'IRONWARDEN','Pathfinder Scout'),'SCOUT_GREENFIELDS',0);
boostedExplore={...boostedExplore,account:{...boostedExplore.account,unlockedCosmeticPetIds:['PET_013']},character:{...boostedExplore.character!,selectedCosmeticPetId:'PET_013'}};
const baseExploreReward=previewActivityReward(baselineExplore,3_600_000),boostExploreReward=previewActivityReward(boostedExplore,3_600_000);
equal(boostExploreReward.kills,baseExploreReward.kills,'Pathfinder does not alter exploration cycle count');
ok(boostExploreReward.xp>baseExploreReward.xp,'Pathfinder increases exploration progress/XP');

const baselineCap=offlineCapSeconds(createCharacter(newGame(0),'IRONWARDEN','Baseline Offline'));
let pack=createCharacter(newGame(0),'IRONWARDEN','Pack Keeper');
pack={...pack,account:{...pack.account,unlockedCosmeticPetIds:['PET_014']},character:{...pack.character!,selectedCosmeticPetId:'PET_014'}};
near(characterPermanentMultipliers(pack).offlineLootCapacityMultiplier,1.025,'Pack Keeper has a dedicated offline-loot-capacity channel');
equal(offlineCapSeconds(pack),baselineCap,'Pack Keeper does not change Offline Reserve duration');

let huntBase=createCharacter(newGame(0),'IRONWARDEN','Baseline Hunter');
huntBase={...huntBase,unlockedMonsterIds:[...new Set([...huntBase.unlockedMonsterIds,'ROADSIDE_BOAR'])],character:{...huntBase.character!,hp:100000,currentHp:100000,defense:1000}};
huntBase=startCombat(huntBase,'ROADSIDE_BOAR',0);
let huntPet=createCharacter(newGame(0),'IRONWARDEN','Trail Hunter');
huntPet={...huntPet,unlockedMonsterIds:[...new Set([...huntPet.unlockedMonsterIds,'ROADSIDE_BOAR'])],account:{...huntPet.account,unlockedCosmeticPetIds:['PET_009']},character:{...huntPet.character!,hp:100000,currentHp:100000,defense:1000,selectedCosmeticPetId:'PET_009'}};
huntPet=startCombat(huntPet,'ROADSIDE_BOAR',0);
const baseHunt=previewActivityReward(huntBase,3_600_000),boostHunt=previewActivityReward(huntPet,3_600_000);
const qty=(reward:any,id:string)=>reward.items.find((row:any)=>row.itemId===id)?.quantity??0;
equal(boostHunt.kills,baseHunt.kills,'Trail Nose does not alter combat action count');
ok(qty(boostHunt,'BOAR_HIDE')>qty(baseHunt,'BOAR_HIDE'),'Trail Nose increases normal hide yield');
equal(qty(boostHunt,'BOARHIDE_BOOTS'),qty(baseHunt,'BOARHIDE_BOOTS'),'Trail Nose does not increase equipment drops');

console.log('PASS: permanent pet perk identities and live workbook channels validate');
