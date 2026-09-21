import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {createCharacter,newGame} from '../src/core/game';
import {cancelEquipmentCraft,equipmentCraftQueueModel,equipmentCraftingQueue,MAX_WAITING_EQUIPMENT_CRAFTS,moveWaitingEquipmentCraft,startEquipmentCraft} from '../src/core/equipment-crafting-queue';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function qty(state:GameState,id:string){return (state.inventory.stacks.find(row=>row.itemId===id)?.quantity??0)+(state.bank.stacks.find(row=>row.itemId===id)?.quantity??0);}

const recipes=V33_EQUIPMENT_RECIPES.filter(row=>row.v33SetId==='T1_001').slice(0,8);
const first=recipes[0];
let state=createCharacter(newGame(0),first.classId,'Backlog Tester','male');
const materialIds=[...new Set(recipes.flatMap(recipe=>recipe.inputs.map(input=>input.itemId)))];
state={...state,character:{...state.character!,level:10,gold:500000},skills:state.skills.map(row=>row.skillId==='smithing'?{...row,level:20,xp:50000}:row),inventory:{...state.inventory,capacity:100,stacks:materialIds.map(itemId=>({itemId,quantity:2000}))},bank:{...state.bank,capacity:200,stacks:[]}};

for(let i=0;i<3;i++)state=startEquipmentCraft(state,recipes[i].id,1000+i).state;
const firstActiveModel=equipmentCraftQueueModel(state,1010);
ok(firstActiveModel.active===3&&firstActiveModel.waiting===0,'Base forge must begin with three active crafts');

for(let i=3;i<6;i++)state=startEquipmentCraft(state,recipes[i].id,1010+i).state;
let model=equipmentCraftQueueModel(state,1020);
ok(model.active===3&&model.waiting===3,'Overflow equipment crafts should reserve into the waiting backlog');
const waiting=model.jobs.filter(job=>job.waiting);
ok(waiting.every(job=>job.startedAtMs>1020&&job.waitingPosition>0),'Waiting jobs must have scheduled future starts and visible priority positions');
ok(waiting[0].startedAtMs===Math.min(...firstActiveModel.jobs.filter(job=>job.active).map(job=>job.completesAtMs)),'First waiting craft must start when the earliest active forge slot becomes free');

const lastWaiting=waiting[2];
state=moveWaitingEquipmentCraft(state,lastWaiting.id,'up',1020);
state=moveWaitingEquipmentCraft(state,lastWaiting.id,'up',1020);
model=equipmentCraftQueueModel(state,1020);
ok(model.jobs.filter(job=>job.waiting)[0].id===lastWaiting.id,'Waiting craft should move to highest backlog priority');
ok(validateGameCommand({type:'craft_move',args:{id:lastWaiting.id,direction:'down'}}).type==='craft_move','Online validator must accept forge backlog moves');

const earliestActiveEnd=Math.min(...model.jobs.filter(job=>job.active).map(job=>job.completesAtMs));
const afterSlotFrees=equipmentCraftQueueModel(state,earliestActiveEnd);
ok(afterSlotFrees.active===3&&afterSlotFrees.waiting===2,'First waiting craft must auto-start when a slot frees without requiring a claim');
ok(afterSlotFrees.jobs.find(job=>job.id===lastWaiting.id)?.active===true,'Highest-priority waiting craft should be the one that auto-starts');

const waitingBeforeCancel=equipmentCraftQueueModel(state,1020).jobs.find(job=>job.waiting)!;
const reservedGold=equipmentCraftingQueue(state).find(job=>job.id===waitingBeforeCancel.id)!.reservedGold!;
const ownerGoldBefore=state.character!.gold;
const materialBefore=Object.fromEntries((equipmentCraftingQueue(state).find(job=>job.id===waitingBeforeCancel.id)!.reservedInputs??[]).map(input=>[input.itemId,qty(state,input.itemId)]));
const cancelledWaiting=cancelEquipmentCraft(state,waitingBeforeCancel.id,1020);
ok(cancelledWaiting.waiting&&cancelledWaiting.feeGold===0&&cancelledWaiting.refundGold===reservedGold,'Waiting cancellation must refund 100% Gold with no setup fee');
ok(cancelledWaiting.state.character!.gold===ownerGoldBefore+reservedGold,'Waiting cancellation must restore all reserved Gold');
for(const input of cancelledWaiting.refundedInputs)ok(qty(cancelledWaiting.state,input.itemId)===materialBefore[input.itemId]+input.quantity,'Waiting cancellation must restore all reserved '+input.itemId);

let full=cancelledWaiting.state;
while(equipmentCraftQueueModel(full,1020).waiting<MAX_WAITING_EQUIPMENT_CRAFTS){
  const pick=recipes[equipmentCraftingQueue(full).length%recipes.length];
  full=startEquipmentCraft(full,pick.id,1030+equipmentCraftingQueue(full).length).state;
}
let backlogBlocked=false;try{startEquipmentCraft(full,recipes[0].id,1100)}catch(error){backlogBlocked=error instanceof Error&&error.message.includes('backlog is full')}
ok(backlogBlocked,'A sixth waiting craft must be blocked');

const commandMoved=executeGameCommand(state,{type:'craft_move',args:{id:model.jobs.filter(job=>job.waiting)[1].id,direction:'up'}},1020);
ok(commandMoved.message==='Forge backlog priority updated','Authoritative forge move command must update waiting priority');

console.log('PASS: forge backlog holds five reserved jobs, auto-starts offline, reorders priority and fully refunds waiting cancellations');
