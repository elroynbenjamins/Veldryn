import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {createCharacter,newGame} from '../src/core/game';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import {equipmentCraftAvailability,equipmentCraftQueueModel,equipmentCraftSlotBreakdown,equipmentCraftingQueue,MAX_WAITING_EQUIPMENT_CRAFTS,startEquipmentCraft,claimEquipmentCraft} from '../src/core/equipment-crafting-queue';
import {normalizeSave} from '../src/core/save-normalization';
import {accountBonusOverview} from '../src/core/account-bonuses';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.v33SetId==='T1_001'&&row.output.itemId==='T1P_001')!;
const tailoringRecipe=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T1'&&row.skillId==='tailoring'&&row.classId==='WAYFINDER')!;

function prepared(){
 let state=createCharacter(newGame(0),'IRONWARDEN','Queue Tester','male');
 state={...state,character:{...state.character!,level:recipe.characterLevel,gold:500000},skills:state.skills.map(row=>row.skillId==='smithing'?{...row,level:Math.max(recipe.level,10),xp:0}:row),inventory:{...state.inventory,capacity:60,stacks:recipe.inputs.map(input=>({itemId:input.itemId,quantity:input.quantity*12}))},bank:{...state.bank,capacity:200,stacks:[]}};
 return state;
}

let state=prepared();
ok(equipmentCraftAvailability(state,recipe.id,999).ready,'Forge availability must recognize a valid timed equipment recipe before queueing');
let slots=equipmentCraftSlotBreakdown(state);
ok(slots.capacity===3&&slots.base===3&&slots.max===5,'Fresh account must start with 3 equipment crafting slots and cap at 5');

slots=equipmentCraftSlotBreakdown({...state,account:{...state.account,entitlements:{supporter:true}}});
ok(slots.capacity===4,'Supporter must add one crafting slot');
ok(accountBonusOverview({...state,account:{...state.account,entitlements:{supporter:true}}}).sources.some(row=>row.id==='equipment-craft-slot:supporter'),'Supporter crafting-slot benefit must appear in Account Bonuses');
slots=equipmentCraftSlotBreakdown({...state,account:{...state.account,entitlements:{vip_plus:true}}});
ok(slots.capacity===4,'VIP+ must add one crafting slot');
slots=equipmentCraftSlotBreakdown({...state,account:{...state.account,unlockedCharacterSlots:2}});
ok(slots.capacity===4,'Unlocking character slot #2 must add one crafting slot');
slots=equipmentCraftSlotBreakdown({...state,account:{...state.account,unlockedCharacterSlots:4}});
ok(slots.capacity===5,'Unlocking character slot #4 must reach the hard cap through character progression');
slots=equipmentCraftSlotBreakdown({...state,account:{...state.account,unlockedCharacterSlots:4,entitlements:{supporter:true,vip_plus:true}}});
ok(slots.capacity===5&&slots.raw===7,'All bonuses may overlap but active queue capacity must never exceed 5');

const started1=startEquipmentCraft(state,recipe.id,1000);state=started1.state;
const started2=startEquipmentCraft(state,recipe.id,1001);state=started2.state;
const started3=startEquipmentCraft(state,recipe.id,1002);state=started3.state;
const baseActiveState=state;
ok(equipmentCraftingQueue(state).length===3,'Three base slots should allow three parallel equipment crafts');
ok(new Set(equipmentCraftingQueue(state).map(row=>row.id)).size===3,'Parallel identical recipes need unique job IDs');
const fourth=startEquipmentCraft(state,recipe.id,1003);state=fourth.state;
ok(fourth.waiting&&equipmentCraftQueueModel(state,1003).waiting===1,'Fourth base-account craft should reserve and enter the waiting backlog');
for(let i=1;i<MAX_WAITING_EQUIPMENT_CRAFTS;i++)state=startEquipmentCraft(state,recipe.id,1003+i).state;
ok(equipmentCraftQueueModel(state,1010).waiting===MAX_WAITING_EQUIPMENT_CRAFTS,'Base account should support five reserved waiting crafts behind three active slots');
let ninthBlocked=false;try{startEquipmentCraft(state,recipe.id,1010)}catch(error){ninthBlocked=error instanceof Error&&error.message.includes('backlog is full')}
ok(ninthBlocked,'Ninth craft must be blocked when 3 active + 5 waiting positions are occupied');
const fullAvailability=equipmentCraftAvailability(state,recipe.id,1010);
ok(!fullAvailability.ready&&fullAvailability.reason.includes('backlog is full'),'Forge availability must mirror the real full-backlog blocker used by execution');

const supporterState={...prepared(),account:{...prepared().account,entitlements:{supporter:true}}};
let supporterQueue:GameState=supporterState;
for(let i=0;i<4;i++)supporterQueue=startEquipmentCraft(supporterQueue,recipe.id,2000+i).state;
ok(equipmentCraftQueueModel(supporterQueue,2005).active===4,'Supporter account should run four crafts concurrently');

const doneAt=Math.max(...equipmentCraftingQueue(baseActiveState).map(row=>row.completesAtMs));
const finishedModel=equipmentCraftQueueModel(baseActiveState,doneAt);
ok(finishedModel.active===0&&finishedModel.ready===3&&finishedModel.freeSlots===3,'Finished unclaimed jobs must free their active slots');
const fourthAfterFinish=startEquipmentCraft(baseActiveState,recipe.id,doneAt).state;
ok(equipmentCraftQueueModel(fourthAfterFinish,doneAt).active===1,'A new craft may start as soon as earlier jobs finish even before they are claimed');

let earlyClaimBlocked=false;try{claimEquipmentCraft(baseActiveState,equipmentCraftingQueue(baseActiveState)[0].id,1001)}catch(error){earlyClaimBlocked=error instanceof Error&&error.message.includes('still in progress')}
ok(earlyClaimBlocked,'Equipment cannot be claimed before its timer ends');
const smithBefore=baseActiveState.skills.find(row=>row.skillId==='smithing')!.xp;
const claimed=claimEquipmentCraft(baseActiveState,equipmentCraftingQueue(baseActiveState)[0].id,doneAt);
ok(claimed.state.inventory.stacks.some(row=>row.itemId===recipe.output.itemId),'Claiming a finished craft must grant the equipment');
ok(claimed.state.skills.find(row=>row.skillId==='smithing')!.xp===smithBefore+recipe.xp,'Smithing XP must be awarded on completion, not on reservation');

ok(validateGameCommand({type:'craft_claim',args:{id:'job'}}).type==='craft_claim','Online command validator must accept equipment craft claims');
ok(validateGameCommand({type:'craft_claim_all'}).type==='craft_claim_all','Online command validator must accept claim-all');
let online=prepared();
const commandStart=executeGameCommand(online,{type:'craft',args:{id:recipe.id}},3000);
online=commandStart.state;
ok(equipmentCraftingQueue(online).length===1&&!online.inventory.stacks.some(row=>row.itemId===recipe.output.itemId),'Authoritative craft command must reserve equipment instead of granting it instantly');
const commandJob=equipmentCraftingQueue(online)[0];
const commandClaim=executeGameCommand(online,{type:'craft_claim',args:{id:commandJob.id}},commandJob.completesAtMs,{randomRoll:.5});
ok(commandClaim.state.inventory.stacks.some(row=>row.itemId===recipe.output.itemId),'Authoritative claim command must grant finished equipment');
ok(commandClaim.contributions.some(row=>row.kind==='crafting'&&row.contentId===recipe.id),'Verified crafting contribution must occur on completion');

let tailor=createCharacter(newGame(0),tailoringRecipe.classId,'Tailor Queue','male');
tailor={...tailor,character:{...tailor.character!,level:tailoringRecipe.characterLevel,gold:500000},skills:tailor.skills.map(row=>row.skillId==='tailoring'?{...row,level:tailoringRecipe.level,xp:0}:row),inventory:{...tailor.inventory,capacity:60,stacks:tailoringRecipe.inputs.map(input=>({...input,quantity:input.quantity*2}))},bank:{...tailor.bank,capacity:200,stacks:[]}};
const tailorBefore=tailor.skills.find(row=>row.skillId==='tailoring')!.xp,smithBeforeTailor=tailor.skills.find(row=>row.skillId==='smithing')!.xp;
const tailorStarted=startEquipmentCraft(tailor,tailoringRecipe.id,4000);
const tailorClaimed=claimEquipmentCraft(tailorStarted.state,tailorStarted.job.id,tailorStarted.job.completesAtMs,.5);
ok(tailorClaimed.state.skills.find(row=>row.skillId==='tailoring')!.xp===tailorBefore+tailoringRecipe.xp,'Tailoring V33 craft must award Tailoring XP');
ok(tailorClaimed.state.skills.find(row=>row.skillId==='smithing')!.xp===smithBeforeTailor,'Tailoring V33 craft must not award Smithing XP');

const save:any={...supporterQueue,version:6};
const normalized=normalizeSave(save);
ok(normalized.account.entitlements?.supporter===true,'Save normalization must preserve Supporter entitlement');
ok(normalized.account.equipmentCraftingQueue?.length===4,'Save normalization must preserve valid timed crafting jobs');

console.log('PASS: timed equipment crafting uses 3–5 active slots plus a five-job waiting backlog, authoritative timers and completion claims');
