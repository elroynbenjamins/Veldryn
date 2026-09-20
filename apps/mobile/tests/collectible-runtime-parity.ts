import {COLLECTIBLES} from '../src/content/collectibles';
import {CORE_PET_COLLECTIBLES} from '../src/content/core-pets';
import {MASTER_PET_COLLECTIBLES} from '../src/content/master-pet-content';
import {PET_PERMANENT_BOOSTS} from '../src/content/permanent-boosts';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {createCharacter,eatFood,newGame,previewActivityReward,startGathering} from '../src/core/game';
import {recoveryAmount} from '../src/core/inventory-view';
import {itemDef} from '../src/content/items';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
const near=(actual:number,expected:number,message:string)=>{if(Math.abs(actual-expected)>1e-10)fail(`${message}: expected ${expected}, got ${actual}`)};

equal(MASTER_PET_COLLECTIBLES,CORE_PET_COLLECTIBLES,'master roster metadata aliases the canonical core pet array');
equal(Object.keys(PET_PERMANENT_BOOSTS).length,COLLECTIBLES.filter(row=>row.kind==='pet').length,'boost diagnostics cover every core, event, and legacy pet');
ok(!!PET_PERMANENT_BOOSTS.EVT_PET_004,'event pets are present in runtime boost metadata');

let state=createCharacter(newGame(0),'IRONWARDEN','Collectible Tester');
state={...state,account:{...state.account,unlockedCosmeticPetIds:['PET_001','PET_002']},character:{...state.character!,ownedPetIds:['PET_001','PET_002']}};
let multipliers=characterPermanentMultipliers(state);
near(multipliers.miningYieldMultiplier,1.01,'two owned mining-yield pets contribute +0.50% each');
near(multipliers.gatheringSpeedMultiplier,1,'yield pets do not incorrectly increase gathering speed');

state={...state,character:{...state.character!,selectedCosmeticPetId:'PET_001'}};
multipliers=characterPermanentMultipliers(state);
near(multipliers.miningYieldMultiplier,1.03,'selected core pet adds +2.00% active on top of two +0.50% passives');

let cooking=createCharacter(newGame(0),'IRONWARDEN','Cooking Pet');
cooking={...cooking,account:{...cooking.account,unlockedCosmeticPetIds:['EVT_PET_003']},character:{...cooking.character!,selectedCosmeticPetId:'EVT_PET_003'}};
multipliers=characterPermanentMultipliers(cooking);
near(multipliers.cookingSpeedMultiplier,1.03,'Heartbond cooking pet applies +0.50% passive plus +2.50% active');
near(multipliers.gatheringSpeedMultiplier,1,'cooking speed does not bleed into gathering speed');

let eventDrop=createCharacter(newGame(0),'IRONWARDEN','Drop Pet');
eventDrop={...eventDrop,account:{...eventDrop.account,unlockedCosmeticPetIds:['EVT_PET_010']},character:{...eventDrop.character!,selectedCosmeticPetId:'EVT_PET_010'}};
near(characterPermanentMultipliers(eventDrop).dropChanceMultiplier,1.045,'Epic event drop pet applies fixed +0.50% passive plus +4.00% active');

const baseline=startGathering(createCharacter(newGame(0),'IRONWARDEN','Baseline Gatherer'),'COPPER_VEIN',0);
let boosted=startGathering(createCharacter(newGame(0),'IRONWARDEN','Boosted Gatherer'),'COPPER_VEIN',0);
boosted={...boosted,account:{...boosted.account,unlockedCosmeticPetIds:['PET_001']},character:{...boosted.character!,ownedPetIds:['PET_001'],selectedCosmeticPetId:'PET_001'}};
const baselineReward=previewActivityReward(baseline,3_600_000),boostedReward=previewActivityReward(boosted,3_600_000);
equal(boostedReward.kills,baselineReward.kills,'mining yield pet does not alter completed action count');
ok((boostedReward.items[0]?.quantity??0)>(baselineReward.items[0]?.quantity??0),'mining yield pet increases normal gathered quantity');

let healing=createCharacter(newGame(0),'IRONWARDEN','Healing Pet');
healing={...healing,account:{...healing.account,unlockedCosmeticPetIds:['EVT_PET_004']},character:{...healing.character!,selectedCosmeticPetId:'EVT_PET_004',currentHp:1}};
const food=itemDef('TRAVEL_RATION');
const healMultiplier=characterPermanentMultipliers(healing).healingEffectivenessMultiplier;
near(healMultiplier,1.045,'Heartwing applies +0.50% passive plus +4.00% active healing effectiveness');
const expectedHeal=Math.ceil((food.heal??0)*healMultiplier);
equal(recoveryAmount(healing,'TRAVEL_RATION'),expectedHeal,'Inventory healing preview includes collectible healing effectiveness');
const afterEat=eatFood(healing,'TRAVEL_RATION');
equal(afterEat.character!.currentHp,1+expectedHeal,'manual food use matches boosted healing preview');

console.log('PASS: collectible UI and runtime bonus math use one authoritative path');
