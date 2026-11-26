import {verifyCraftCommandOutcome} from '../src/core/craft-command-outcome';
import type {GameState} from '../src/core/types';

function assert(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function fakeState(jobs:{id:string;recipeId:string}[]=[],tools:{id:string;itemId:string}[]=[]):GameState{
  return {account:{equipmentCraftingQueue:jobs,craftedGatheringToolInstances:tools}} as unknown as GameState;
}
const copper={recipeId:'CRAFT_COPPER_PICKAXE',outputItemId:'COPPER_PICKAXE',requestedCount:1,timed:true,tool:true} as const;
const empty=fakeState();
const queued=fakeState([{id:'job-1',recipeId:copper.recipeId}]);
assert(verifyCraftCommandOutcome(empty,queued,copper)==='queued','Timed server receipt must show queued');
const immediate=fakeState([],[{id:'tool-1',itemId:'COPPER_PICKAXE'}]);
assert(verifyCraftCommandOutcome(empty,immediate,copper)==='completed','Legacy server immediate tool mint must show completed');
const twoCopies=fakeState([],[{id:'tool-1',itemId:'COPPER_PICKAXE'},{id:'tool-2',itemId:'COPPER_PICKAXE'}]);
assert(verifyCraftCommandOutcome(empty,twoCopies,{...copper,requestedCount:2})==='completed','A batch needs all tool copies');
assert(verifyCraftCommandOutcome(empty,empty,{...copper,timed:false})==='completed','Instant recipes confirm completion');
function rejects(before:GameState,after:GameState,options:Parameters<typeof verifyCraftCommandOutcome>[2],name:string){
  let rejected=false;
  try{verifyCraftCommandOutcome(before,after,options);}catch(error){
    rejected=error instanceof Error&&error.message.includes('do not retry');
  }
  assert(rejected,name+' must reject uncertain receipts without encouraging a duplicate spend');
}
rejects(empty,empty,copper,'No queue and no minted copy');
rejects(empty,immediate,{...copper,requestedCount:2},'Partial batch result');
rejects(queued,queued,copper,'Previously existing queue job');
rejects(empty,fakeState([],[{id:'other',itemId:'GREENWOOD_HATCHET'}]),copper,'Unrelated tool');
rejects(empty,immediate,{...copper,tool:false},'Equipment recipe cannot satisfy receipt with a tool');
console.log('Craft receipt parity regression: queued, instant-completed and uncertain outcomes passed.');
