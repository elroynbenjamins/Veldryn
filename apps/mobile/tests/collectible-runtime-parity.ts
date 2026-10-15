import {COLLECTIBLES} from '../src/content/collectibles';
import {CORE_PET_COLLECTIBLES} from '../src/content/core-pets';
import {MASTER_PET_COLLECTIBLES} from '../src/content/master-pet-content';
import {PET_PERMANENT_BOOSTS} from '../src/content/permanent-boosts';
import {EVENTS_RELEASED} from '../src/core/release-flags';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {createCharacter,newGame,previewActivityReward,startGathering} from '../src/core/game';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
const near=(actual:number,expected:number,message:string)=>{if(Math.abs(actual-expected)>1e-10)fail(`${message}: expected ${expected}, got ${actual}`)};

equal(MASTER_PET_COLLECTIBLES,CORE_PET_COLLECTIBLES,'master roster metadata aliases the canonical core pet array');
equal(Object.keys(PET_PERMANENT_BOOSTS).length,COLLECTIBLES.filter(row=>row.kind==='pet').length,'boost diagnostics cover every released pet');
equal(!!PET_PERMANENT_BOOSTS.EVT_PET_013,EVENTS_RELEASED,'event pet diagnostics follow the release gate');

let state=createCharacter(newGame(0),'IRONWARDEN','Collectible Tester');
state={...state,account:{...state.account,unlockedCosmeticPetIds:['PET_001','PET_003']},character:{...state.character!,ownedPetIds:['PET_001','PET_003']}};
let multipliers=characterPermanentMultipliers(state);
near(multipliers.gatheringYieldMultiplier,1.01,'two owned gathering-yield pets contribute +0.50% each');
near(multipliers.gatheringSpeedMultiplier,1,'yield pets do not incorrectly increase gathering speed');

state={...state,character:{...state.character!,selectedCosmeticPetId:'PET_001'}};
multipliers=characterPermanentMultipliers(state);
near(multipliers.gatheringYieldMultiplier,1.03,'selected core pet adds +2.00% active on top of two +0.50% passives');

let eventDrop=createCharacter(newGame(0),'IRONWARDEN','Drop Pet');
eventDrop={...eventDrop,account:{...eventDrop.account,unlockedCosmeticPetIds:['EVT_PET_013']},character:{...eventDrop.character!,selectedCosmeticPetId:'EVT_PET_013'}};
near(characterPermanentMultipliers(eventDrop).dropChanceMultiplier,EVENTS_RELEASED?1.035:1,'released Veilbreak pet bonuses activate after the event release');

const baseline=startGathering(createCharacter(newGame(0),'IRONWARDEN','Baseline Gatherer'),'GREENWOOD_TREE',0);
let boosted=startGathering(createCharacter(newGame(0),'IRONWARDEN','Boosted Gatherer'),'GREENWOOD_TREE',0);
boosted={...boosted,account:{...boosted.account,unlockedCosmeticPetIds:['PET_001']},character:{...boosted.character!,ownedPetIds:['PET_001'],selectedCosmeticPetId:'PET_001'}};
const baselineReward=previewActivityReward(baseline,3_600_000),boostedReward=previewActivityReward(boosted,3_600_000);
equal(boostedReward.kills,baselineReward.kills,'gathering yield pet does not alter completed action count');
ok((boostedReward.items[0]?.quantity??0)>(baselineReward.items[0]?.quantity??0),'gathering yield pet increases normal gathered quantity');

let dungeonReward=createCharacter(newGame(0),'IRONWARDEN','Dungeon Reward Pet');
dungeonReward={...dungeonReward,account:{...dungeonReward.account,unlockedCosmeticPetIds:['EVT_PET_014']},character:{...dungeonReward.character!,selectedCosmeticPetId:'EVT_PET_014'}};
near(characterPermanentMultipliers(dungeonReward).dungeonRewardMultiplier,EVENTS_RELEASED?1.045:1,'Veilbreak dungeon reward bonus activates after its release');

console.log('PASS: collectible UI and runtime bonus math use one authoritative path');
