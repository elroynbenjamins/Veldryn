import {COLLECTIBLES} from '../src/content/collectibles';
import {CORE_PET_COLLECTIBLES} from '../src/content/core-pets';
import {MASTER_PET_COLLECTIBLES} from '../src/content/master-pet-content';
import {AUTHORED_EVENT_PET_PERMANENT_BOOSTS,PET_PERMANENT_BOOSTS} from '../src/content/permanent-boosts';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {createCharacter,newGame,previewActivityReward,startGathering} from '../src/core/game';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
const near=(actual:number,expected:number,message:string)=>{if(Math.abs(actual-expected)>1e-10)fail(`${message}: expected ${expected}, got ${actual}`)};

equal(MASTER_PET_COLLECTIBLES,CORE_PET_COLLECTIBLES,'master roster metadata aliases the canonical core pet array');
equal(Object.keys(PET_PERMANENT_BOOSTS).length,COLLECTIBLES.filter(row=>row.kind==='pet').length,'runtime boost diagnostics cover every released pet');
ok(!PET_PERMANENT_BOOSTS.EVT_PET_004,'unreleased event pets must stay out of runtime boost metadata');
ok(!!AUTHORED_EVENT_PET_PERMANENT_BOOSTS.EVT_PET_004,'authored event pet boosts remain available for event validation');

let state=createCharacter(newGame(0),'IRONWARDEN','Collectible Tester');
state={...state,account:{...state.account,unlockedCosmeticPetIds:['PET_001','PET_003']},character:{...state.character!,ownedPetIds:['PET_001','PET_003']}};
let multipliers=characterPermanentMultipliers(state);
near(multipliers.gatheringYieldMultiplier,1.01,'two owned gathering-yield pets contribute +0.50% each');
near(multipliers.gatheringSpeedMultiplier,1,'yield pets do not incorrectly increase gathering speed');

state={...state,character:{...state.character!,selectedCosmeticPetId:'PET_001'}};
multipliers=characterPermanentMultipliers(state);
near(multipliers.gatheringYieldMultiplier,1.03,'selected core pet adds +2.00% active on top of two +0.50% passives');

const authoredCooking=AUTHORED_EVENT_PET_PERMANENT_BOOSTS.EVT_PET_003;
near(authoredCooking.cookingSpeedMultiplier??1,1.025,'Heartbond cooking pet keeps its authored +2.50% selected bonus');
const authoredDrop=AUTHORED_EVENT_PET_PERMANENT_BOOSTS.EVT_PET_010;
near(authoredDrop.dropChanceMultiplier??1,1.04,'Epic event drop pet keeps its authored +4.00% selected bonus');

const baseline=startGathering(createCharacter(newGame(0),'IRONWARDEN','Baseline Gatherer'),'GREENWOOD_TREE',0);
let boosted=startGathering(createCharacter(newGame(0),'IRONWARDEN','Boosted Gatherer'),'GREENWOOD_TREE',0);
boosted={...boosted,account:{...boosted.account,unlockedCosmeticPetIds:['PET_001']},character:{...boosted.character!,ownedPetIds:['PET_001'],selectedCosmeticPetId:'PET_001'}};
const baselineReward=previewActivityReward(baseline,3_600_000),boostedReward=previewActivityReward(boosted,3_600_000);
equal(boostedReward.kills,baselineReward.kills,'gathering yield pet does not alter completed action count');
ok((boostedReward.items[0]?.quantity??0)>(baselineReward.items[0]?.quantity??0),'gathering yield pet increases normal gathered quantity');

const authoredHealing=AUTHORED_EVENT_PET_PERMANENT_BOOSTS.EVT_PET_004;
near(authoredHealing.healingEffectivenessMultiplier??1,1.03,'Event healing pet keeps its authored +3.00% selected bonus');

console.log('PASS: collectible UI and runtime bonus math use one authoritative path');
