import {claimActivity,createCharacter,newGame,previewActivityReward,startClassTraining,stopActivity} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';
import {processingAvailability,processingRecipeDef} from '../src/core/processing';
import {recipeTrainingReady} from '../src/core/skill-progression-navigation';
import {RECIPES} from '../src/content/skills';
import {normalizeSave} from '../src/core/save-normalization';
import type {GameState} from '../src/core/types';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
function throws(fn:()=>unknown,message:string){let threw=false;try{fn()}catch{threw=true}ok(threw,message)}
const now=Date.UTC(2026,8,23);
const fresh=(ore=100)=>{let state=createCharacter(newGame(now),'IRONWARDEN','Processor');state={...state,character:{...state.character!,gold:10000},inventory:{...state.inventory,stacks:[{itemId:'COPPER_ORE',quantity:ore}]}};return state;};
const qty=(state:GameState,id:string)=>(state.inventory.stacks.find(row=>row.itemId===id)?.quantity??0)+(state.bank.stacks.find(row=>row.itemId===id)?.quantity??0)+(state.overflow.stacks.find(row=>row.itemId===id)?.quantity??0);

ok(processingRecipeDef('SMELT_COPPER_INGOT'),'repeatable material processing is timed');
ok(processingRecipeDef('COOK_SILVERFIN'),'repeatable cooking is timed');
ok(!processingRecipeDef('TAILOR_MOSSWRAP_GLOVES'),'repeatable gear crafting stays an immediate single craft');
ok(!processingRecipeDef('ENCHANT_WISP_CHARM'),'Enchanting gear stays an immediate single craft');

let state=fresh();
const availability=processingAvailability(state,'SMELT_COPPER_INGOT',5);
ok(availability.ready&&availability.maxBatches>=5,'five copper batches can be reserved');
const copperTraining=RECIPES.find(row=>row.id==='SMELT_COPPER_INGOT');
ok(copperTraining&&recipeTrainingReady(state,copperTraining),'skill training recommendations recognize a ready timed-processing recipe');
const beforeGold=state.character!.gold;
state=executeGameCommand(state,{type:'processing_start',args:{id:'SMELT_COPPER_INGOT',batches:5}},now).state;
equal(state.activity?.kind,'processing','processing command creates a timed activity');
equal(state.activity?.processing?.remainingBatches,5,'all selected batches are reserved');
equal(qty(state,'COPPER_ORE'),50,'inputs are reserved up front');
equal(state.character!.gold,beforeGold-150,'Gold is reserved up front');
equal(qty(state,'COPPER_INGOT'),0,'processing does not grant output immediately');

let preview=previewActivityReward(state,now+18000);
equal(preview.craftingActions,0,'partial cycle does not complete a batch');
ok((preview.nextProgressFraction??0)>.49&&(preview.nextProgressFraction??0)<.51,'partial processing cycle is visible');

let claimed=claimActivity(state,now+36000);
equal(claimed.reward.craftingActions,1,'one authored cycle completes one batch');
equal(qty(claimed.state,'COPPER_INGOT'),5,'completed batch grants its output');
equal(claimed.state.skills.find(row=>row.skillId==='smithing')?.xp,80,'completed batch grants Smithing XP');
equal(claimed.state.activity?.processing?.remainingBatches,4,'remaining reservation persists');

const partial=claimActivity(claimed.state,now+54000);
equal(partial.reward.craftingActions,0,'claiming midway does not lose or invent a batch');
ok((partial.state.activity?.progressFraction??0)>.49,'partial processing progress persists in the activity');
const resumed=claimActivity(partial.state,now+72000);
equal(resumed.reward.craftingActions,1,'saved partial progress finishes on the next settlement');
equal(qty(resumed.state,'COPPER_INGOT'),10,'second completed cycle grants the second output batch');

const refundable=stopActivity(partial.state);
equal(refundable.activity,null,'stopping processing clears the activity');
equal(qty(refundable,'COPPER_ORE'),90,'only four unprocessed batches are refunded after one completed batch');
equal(refundable.character!.gold,beforeGold-30,'only the completed batch keeps its Gold cost');

let drills=startClassTraining(fresh(),now);
drills=executeGameCommand(drills,{type:'processing_start',args:{id:'SMELT_COPPER_INGOT',batches:1}},now+60000).state;
ok(!drills.character!.classTraining&&drills.activity?.kind==='processing','starting processing cleanly replaces safe class drills');
equal(drills.character!.classSkills?.reduce((sum,row)=>sum+row.xp,0),24,'earned class-drill XP settles before processing starts');

const normalized=normalizeSave(structuredClone(state));
equal(normalized.activity?.kind,'processing','save normalization preserves processing reservations');
equal(normalized.activity?.processing?.remainingBatches,5,'save normalization preserves reserved batch count');

throws(()=>executeGameCommand(fresh(),{type:'craft',args:{id:'SMELT_COPPER_INGOT'}},now),'public instant-craft command cannot bypass timed processing');
throws(()=>executeGameCommand(fresh(2000),{type:'processing_start',args:{id:'SMELT_COPPER_INGOT',batches:101}},now),'processing batch size is server-authoritatively capped');
throws(()=>executeGameCommand(fresh(),{type:'processing_start',args:{id:'TAILOR_MOSSWRAP_GLOVES',batches:1}},now),'gear recipes cannot enter the stackable processing activity');

console.log('PASS: reserved timed processing, offline progress, refunds and command authority');
