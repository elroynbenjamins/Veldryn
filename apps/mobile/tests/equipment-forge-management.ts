import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {RECIPES} from '../src/content/skills';
import {createCharacter,newGame} from '../src/core/game';
import {cancelEquipmentCraft,EQUIPMENT_CRAFT_CANCEL_GOLD_REFUND,equipmentCraftingQueue,startEquipmentCraft} from '../src/core/equipment-crafting-queue';
import {craftEquipmentPrerequisites,equipmentPrerequisiteCraftability} from '../src/core/equipment-crafting-prerequisites';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import type {GameState} from '../src/core/types';
import {totalXpAtLevel} from '../src/core/progression';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function qty(state:GameState,id:string){return (state.inventory.stacks.find(row=>row.itemId===id)?.quantity??0)+(state.bank.stacks.find(row=>row.itemId===id)?.quantity??0);}

const t1=V33_EQUIPMENT_RECIPES.find(row=>row.v33SetId==='T1_001')!;
let state=createCharacter(newGame(0),t1.classId,'Forge Manager','male');
state={...state,character:{...state.character!,level:t1.characterLevel,gold:100000},skills:state.skills.map(row=>row.skillId==='smithing'?{...row,level:Math.max(20,t1.level),xp:0}:row),inventory:{...state.inventory,capacity:80,stacks:t1.inputs.map(input=>({itemId:input.itemId,quantity:input.quantity*3}))},bank:{...state.bank,capacity:200,stacks:[]}};
const initialGold=state.character!.gold,initialMaterials=Object.fromEntries(t1.inputs.map(input=>[input.itemId,qty(state,input.itemId)]));
const started=startEquipmentCraft(state,t1.id,1000);
ok(equipmentCraftingQueue(started.state).length===1,'Starting a timed craft must create one forge job');
const job=equipmentCraftingQueue(started.state)[0];
ok(job.reservedGold===t1.gold&&JSON.stringify(job.reservedInputs)===JSON.stringify(t1.inputs),'Forge jobs must snapshot reserved Gold and material inputs');
const cancelled=cancelEquipmentCraft(started.state,job.id,1001);
ok(equipmentCraftingQueue(cancelled.state).length===0,'Cancelling must remove the active forge job');
ok(cancelled.refundGold===Math.floor(t1.gold*EQUIPMENT_CRAFT_CANCEL_GOLD_REFUND),'Cancellation must refund exactly 90% of reserved Gold');
ok(cancelled.state.character!.gold===initialGold-cancelled.feeGold,'Cancellation should leave only the 10% forge setup fee spent');
for(const input of t1.inputs)ok(qty(cancelled.state,input.itemId)===initialMaterials[input.itemId],'Cancellation must return all reserved '+input.itemId);

let finishedCancelBlocked=false;
try{cancelEquipmentCraft(started.state,job.id,job.completesAtMs)}catch(error){finishedCancelBlocked=error instanceof Error&&error.message.includes('claimed instead of cancelled')}
ok(finishedCancelBlocked,'Finished equipment must be claimed, never cancelled for a refund');

ok(validateGameCommand({type:'craft_cancel',args:{id:'job'}}).type==='craft_cancel','Online validator must accept craft_cancel');
ok(validateGameCommand({type:'craft_prerequisites',args:{id:t1.id}}).type==='craft_prerequisites','Online validator must accept craft_prerequisites');

const t4=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T4'&&row.inputs.some(input=>input.itemId==='OATHSTONE_INGOT'))!;
const smelt=RECIPES.find(row=>row.id==='SMELT_OATHSTONE_INGOT')!;
const ingotNeed=t4.inputs.find(input=>input.itemId==='OATHSTONE_INGOT')!.quantity;
const batches=Math.ceil(ingotNeed/smelt.output.quantity);
let prereqState=createCharacter(newGame(0),t4.classId,'Prereq Tester','male');
const externalInputs=t4.inputs.filter(input=>input.itemId!=='OATHSTONE_INGOT');
const smithingLevel=Math.max(t4.level,smelt.level,30);
prereqState={...prereqState,character:{...prereqState.character!,level:t4.characterLevel,gold:500000},skills:prereqState.skills.map(row=>row.skillId==='smithing'?{...row,level:smithingLevel,xp:totalXpAtLevel(smithingLevel)}:row),inventory:{...prereqState.inventory,capacity:100,stacks:[{itemId:'OATHSTONE_ORE',quantity:batches*6},...externalInputs.map(input=>({...input}))]},bank:{...prereqState.bank,capacity:200,stacks:[]}};
const craftability=equipmentPrerequisiteCraftability(prereqState,t4.id);
ok(craftability.available&&craftability.processableMissing>=1,'Missing processed equipment inputs must expose Craft prerequisites');
const processed=craftEquipmentPrerequisites(prereqState,t4.id,5000);
ok(qty(processed.state,'OATHSTONE_INGOT')>=ingotNeed,'Craft prerequisites must create enough processed material for the equipment recipe');
ok(processed.crafted.some(row=>row.recipeId===smelt.id&&row.batches===batches),'Prerequisite processing must use the exact registered processing recipe and required batch count');
ok(processed.state.inventory.stacks.some(row=>row.itemId==='OATHSTONE_ORE')===false||qty(processed.state,'OATHSTONE_ORE')<batches*6,'Prerequisite processing must consume owned raw material');

const noRaw={...prereqState,inventory:{...prereqState.inventory,stacks:externalInputs.map(input=>({...input}))}};
const before=JSON.stringify(noRaw);
let externalBlocked=false;
try{craftEquipmentPrerequisites(noRaw,t4.id,6000)}catch(error){externalBlocked=error instanceof Error&&error.message.includes('external source')}
ok(externalBlocked,'Craft prerequisites must stop at gathering/combat/external-source requirements');
ok(JSON.stringify(noRaw)===before,'Failed prerequisite processing must not mutate or partially commit the original state');

let commandState=state;
const startedCommand=executeGameCommand(commandState,{type:'craft',args:{id:t1.id}},7000);
const commandJob=equipmentCraftingQueue(startedCommand.state)[0];
const cancelledCommand=executeGameCommand(startedCommand.state,{type:'craft_cancel',args:{id:commandJob.id}},7001);
ok(equipmentCraftingQueue(cancelledCommand.state).length===0,'Authoritative craft_cancel command must remove the forge job');
ok(cancelledCommand.message?.includes('Gold refunded'),'Authoritative cancel should return player-facing refund information');

console.log('PASS: forge cancellation refunds materials/90% Gold, prerequisite processing is atomic, and gathering/combat remain manual');
