import {legacyCraftingReservation} from './legacy-crafting-fixture';
import {transitionActivity} from '../src/core/playability';
import {claimActivity,createCharacter,newGame,offlineCapSeconds,previewActivityReward,startClassTraining,startCombat,stopActivity} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';
import {processingAvailability,processingRecipeDef,processingRunCapacity} from '../src/core/processing';
import {recipeTrainingReady} from '../src/core/skill-progression-navigation';
import {RECIPES} from '../src/content/skills';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {normalizeSave} from '../src/core/save-normalization';
import type {GameState} from '../src/core/types';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
function throws(fn:()=>unknown,message:string){let threw=false;try{fn()}catch{threw=true}ok(threw,message)}
const now=Date.UTC(2026,8,23);
const fresh=(ore=100,wood=Math.ceil(ore/5))=>{let state=createCharacter(newGame(now),'IRONWARDEN','Processor');state={...state,character:{...state.character!,gold:10000},inventory:{...state.inventory,stacks:[{itemId:'COPPER_ORE',quantity:ore},...(wood?[{itemId:'GREENWOOD_LOG',quantity:wood}]:[])]}};return state;};
const qty=(state:GameState,id:string)=>(state.inventory.stacks.find(row=>row.itemId===id)?.quantity??0)+(state.bank.stacks.find(row=>row.itemId===id)?.quantity??0)+(state.overflow.stacks.find(row=>row.itemId===id)?.quantity??0);

const v33GearRecipe=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T1')!;
ok(processingRecipeDef('SMELT_COPPER_INGOT'),'repeatable material processing is timed');
ok(processingRecipeDef('COOK_SILVERFIN'),'repeatable cooking is timed');
ok(!processingRecipeDef(v33GearRecipe.id),'Equipment 2.0 gear uses the Forge instead of stackable processing');

let cooking=createCharacter(newGame(now),'IRONWARDEN','Cook');
cooking={...cooking,character:{...cooking.character!,gold:10000},inventory:{...cooking.inventory,stacks:[{itemId:'SILVERFIN',quantity:5},{itemId:'GREENWOOD_LOG',quantity:1}]}};
const cookingReady=processingAvailability(cooking,'COOK_SILVERFIN',1);
ok(cookingReady.ready,'regional fish Cooking batch is ready with fish and wood fuel');
cooking=executeGameCommand(cooking,{type:'processing_start',args:{id:'COOK_SILVERFIN',batches:1}},now).state;
equal(qty(cooking,'SILVERFIN'),0,'Cooking reserves the fish ingredient');
equal(qty(cooking,'GREENWOOD_LOG'),0,'Cooking reserves its wood fuel');
const cooked=claimActivity(cooking,now+36_000);
equal(qty(cooked.state,'COOKED_SILVERFIN'),5,'completed Cooking batch produces edible fish');
equal(cooked.state.skills.find(row=>row.skillId==='cooking')?.xp,100,'non-affinity Cooking retains base XP');

let stackedFish=createCharacter(newGame(now),'IRONWARDEN','Stacked Fish');
stackedFish={...stackedFish,character:{...stackedFish.character!,gold:10000},
  inventory:{...stackedFish.inventory,stacks:[{itemId:'SILVERFIN',quantity:6},{itemId:'GREENWOOD_LOG',quantity:1}]},
  bank:{...stackedFish.bank,stacks:[{itemId:'SILVERFIN',quantity:100},{itemId:'SILVERFIN',quantity:100},{itemId:'GREENWOOD_LOG',quantity:40}]}};
const fishCapacity=processingRunCapacity(stackedFish,'COOK_SILVERFIN',offlineCapSeconds(stackedFish),true);
equal(fishCapacity.inputs.find(row=>row.itemId==='SILVERFIN')?.inventory,6,'recipe capacity sees the six fish in Inventory');
equal(fishCapacity.inputs.find(row=>row.itemId==='SILVERFIN')?.bank,200,'recipe capacity totals multiple full Bank stacks');
equal(fishCapacity.maxBatches,41,'206 Silverfin and 41 logs fund 41 five-fish cooking batches');
equal(fishCapacity.availableBatches,41,'preview reports exactly the batches automatic cooking will reserve');
equal(processingRunCapacity(stackedFish,'COOK_SILVERFIN',70,true).availableBatches,1,'shorter AFK window limits displayed available batches');
const goldLimited={...stackedFish,character:{...stackedFish.character!,gold:100}};
equal(processingRunCapacity(goldLimited,'COOK_SILVERFIN',offlineCapSeconds(goldLimited),true).availableBatches,2,'displayed batches obey Gold limits');
const startedFish=executeGameCommand(stackedFish,{type:'processing_start',args:{id:'COOK_SILVERFIN'}},now).state;
equal(startedFish.activity?.processing?.totalBatches,41,'server reserves exactly the displayed 41 batches');
equal(qty(startedFish,'SILVERFIN'),1,'only one raw fish remains after the reservation');
equal(qty(startedFish,'GREENWOOD_LOG'),0,'all 41 required fuel logs are reserved');
equal(processingRunCapacity(startedFish,'COOK_SILVERFIN',offlineCapSeconds(startedFish),true).availableBatches,0,'reserved fish are no longer counted as available for a second run');
equal(startedFish.activity?.processing?.remainingBatches,41,'existing reserved batches remain visible to the recipe card');

// Every bar batch needs its region's timber, with fuel rising by ore tier.
for(const [id,ore,wood,qtyFuel] of [
 ['SMELT_COPPER_INGOT','COPPER_ORE','GREENWOOD_LOG',2],
 ['SMELT_ASTER_IRON_INGOT','ASTER_IRON_ORE','IRONWOOD_LOG',2],
 ['SMELT_OATHSTONE_INGOT','OATHSTONE_ORE','CROWNWOOD_LOG',3],
 ['SMELT_SUNSTONE_INGOT','SUNSTONE_ORE','DUNEWOOD',4],
 ['SMELT_FROSTIRON_INGOT','FROSTIRON','WHITEPINE_LOG',4],
 ['SMELT_BLACKGLASS_INGOT','BLACKGLASS_ORE','CINDERWOOD_LOG',4],
] as const){
 const recipe=RECIPES.find(row=>row.id===id);
 ok(recipe?.inputs.some(input=>input.itemId===ore),'ore remains a smelting ingredient: '+id);
 equal(recipe?.inputs.find(input=>input.itemId===wood)?.quantity,qtyFuel,'fuel per batch must scale with the ore tier: '+id);
}
const noFuel=processingAvailability(fresh(100,0),'SMELT_COPPER_INGOT',1);
ok(!noFuel.ready&&noFuel.maxBatches===0,'copper ore alone cannot smelt without Greenwood fuel');
equal(processingRunCapacity(fresh(100,19),'SMELT_COPPER_INGOT',offlineCapSeconds(fresh(100,19)),true).availableBatches,9,'wood is an authoritative batch limit');
let state=fresh();
const availability=processingAvailability(state,'SMELT_COPPER_INGOT',1);
ok(availability.ready&&availability.maxBatches===10,'processing exposes all resource-limited crafts');
throws(()=>executeGameCommand(state,{type:'processing_start',args:{id:'SMELT_COPPER_INGOT',batches:5}},now),'client-selected processing batch counts remain rejected');
const automatic=executeGameCommand(state,{type:'processing_start',args:{id:'SMELT_COPPER_INGOT'}},now).state;
equal(automatic.activity?.processing?.remainingBatches,10,'processing start reserves every affordable material batch');
equal(qty(automatic,'GREENWOOD_LOG'),0,'automatic smelting reserves all 20 Greenwood logs for ten batches');
const longRun={...fresh(100_000),character:{...fresh(100_000).character!,gold:1_000_000}};
const afkLimited=executeGameCommand(longRun,{type:'processing_start',args:{id:'SMELT_COPPER_INGOT'}},now).state;
equal(afkLimited.activity?.processing?.remainingBatches,Math.floor(offlineCapSeconds(longRun)/afkLimited.activity!.processing!.cycleSeconds),'processing reservation stops at the normal AFK time allowance');
const copperTraining=RECIPES.find(row=>row.id==='SMELT_COPPER_INGOT');
ok(copperTraining&&recipeTrainingReady(state,copperTraining),'skill training recommendations recognize a ready timed-processing recipe');
const beforeGold=state.character!.gold;
state=legacyCraftingReservation(state,'processing','SMELT_COPPER_INGOT',5,now);
equal(state.activity?.kind,'processing','processing command creates a timed activity');
equal(state.activity?.processing?.remainingBatches,5,'all selected batches are reserved');
equal(qty(state,'COPPER_ORE'),50,'inputs are reserved up front');
equal(qty(state,'GREENWOOD_LOG'),10,'ten Greenwood logs are reserved for five copper batches');
equal(state.character!.gold,beforeGold-150,'Gold is reserved up front');
equal(qty(state,'COPPER_INGOT'),0,'processing does not grant output immediately');
const cycleMs=36_000/1.03;
const at=(cycles:number)=>now+Math.ceil(cycleMs*cycles);
ok(Math.abs(state.activity!.processing!.cycleSeconds*1000-cycleMs)<.0001,'Ironwarden applies +3% Smithing speed once');
let preview=previewActivityReward(state,at(.5));
equal(preview.craftingActions,0,'partial cycle does not complete a batch');
ok((preview.nextProgressFraction??0)>.49&&(preview.nextProgressFraction??0)<.51,'partial processing cycle is visible');
let claimed=claimActivity(state,at(1));
equal(claimed.reward.craftingActions,1,'one effective cycle completes one batch');
equal(qty(claimed.state,'COPPER_INGOT'),5,'completed batch grants its output');
equal(claimed.state.skills.find(row=>row.skillId==='smithing')?.xp,84,'Ironwarden earns base 80 plus 5% Smithing XP');
equal(claimed.state.activity?.processing?.remainingBatches,4,'remaining reservation persists');
const partial=claimActivity(claimed.state,at(1.5));
equal(partial.reward.craftingActions,0,'claiming midway does not lose or invent a batch');
ok((partial.state.activity?.progressFraction??0)>.49,'partial processing progress persists in the activity');
const resumed=claimActivity(partial.state,at(2));
equal(resumed.reward.craftingActions,1,'saved partial progress finishes on the next settlement');
equal(qty(resumed.state,'COPPER_INGOT'),10,'second completed cycle grants the second output batch');
const refundable=stopActivity(partial.state);
equal(refundable.activity,null,'stopping processing clears the activity');
equal(qty(refundable,'COPPER_ORE'),90,'only four unprocessed batches are refunded after one completed batch');
equal(qty(refundable,'GREENWOOD_LOG'),18,'eight Greenwood logs refund when four unfinished batches are stopped');
equal(refundable.character!.gold,beforeGold-30,'only the completed batch keeps its Gold cost');
const switched=transitionActivity(partial.state,at(1.5),{kind:'gathering',id:'GREENWOOD_TREE'}).state;
equal(switched.activity?.kind,'woodcutting','switching replaces processing with gathering');
equal(qty(switched,'COPPER_ORE'),90,'switching refunds every unfinished reserved batch');
equal(qty(switched,'GREENWOOD_LOG'),18,'changing activity refunds unused smelting fuel');
equal(switched.character!.gold,beforeGold-30,'switching refunds unfinished crafting Gold');
let drills=startClassTraining(fresh(),now);
drills=executeGameCommand(drills,{type:'processing_start',args:{id:'SMELT_COPPER_INGOT',batches:1}},now+60000).state;
ok(!drills.character!.classTraining&&drills.activity?.kind==='processing','starting processing cleanly replaces safe class drills');
equal(drills.character!.classSkills?.reduce((sum,row)=>sum+row.xp,0),24,'earned class-drill XP settles before processing starts');
let replaced=startCombat(fresh(),'MOSS_RAT',now);
replaced=executeGameCommand(replaced,{type:'processing_start',args:{id:'SMELT_COPPER_INGOT',batches:1}},now+60_000).state;
equal(replaced.activity?.kind,'processing','starting processing settles and replaces an active hunt');
equal(replaced.activity?.processing?.remainingBatches,10,'replacement reserves every affordable processing batch');
const normalized=normalizeSave(structuredClone(state));
equal(normalized.activity?.kind,'processing','save normalization preserves processing reservations');
equal(normalized.activity?.processing?.remainingBatches,5,'save normalization preserves reserved batch count');
// Pre-fuel saved reservations had only ore. They must remain claimable/refundable
// without charging fuel retroactively or inventing a free wood refund.
const preFuelState={...state,inventory:{...state.inventory,stacks:state.inventory.stacks.map(row=>
 row.itemId==='GREENWOOD_LOG'?{...row,quantity:row.quantity+10}:row)},
 activity:{...state.activity!,processing:{...state.activity!.processing!,inputsPerBatch:[{itemId:'COPPER_ORE',quantity:10}]}}};
const preFuelRestored=normalizeSave(structuredClone(preFuelState));
equal(preFuelRestored.activity?.processing?.inputsPerBatch.length,1,'old ore-only reservation survives normalization');
const preFuelCancelled=stopActivity(preFuelRestored);
equal(qty(preFuelCancelled,'COPPER_ORE'),100,'old processing returns reserved unspent ore');
equal(qty(preFuelCancelled,'GREENWOOD_LOG'),20,'old ore-only reservation neither consumes nor refunds unreserved wood');
const malformedLegacy=structuredClone(preFuelState);
malformedLegacy.activity!.processing!.inputsPerBatch[0].quantity=1;
throws(()=>normalizeSave(malformedLegacy),'only exact pre-fuel ore-only ingredient snapshots may be restored');
throws(()=>executeGameCommand(fresh(),{type:'craft',args:{id:'SMELT_COPPER_INGOT'}},now),'public instant-craft command cannot bypass timed processing');
throws(()=>executeGameCommand(fresh(2000),{type:'processing_start',args:{id:'SMELT_COPPER_INGOT',batches:101}},now),'client-selected processing batch counts are server-authoritatively rejected');
throws(()=>executeGameCommand(fresh(),{type:'processing_start',args:{id:v33GearRecipe.id,batches:1}},now),'Equipment 2.0 gear recipes cannot enter the stackable processing activity');
console.log('PASS: reserved timed processing, class affinity, offline progress, refunds and command authority');
