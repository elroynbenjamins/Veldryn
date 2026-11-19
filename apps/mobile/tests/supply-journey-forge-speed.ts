import {createCharacter,newGame} from '../src/core/game';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {normalizeSave} from '../src/core/save-normalization';
import type {EquipmentCraftJob,GameState} from '../src/core/types';
import {activateDailySupplyBoost,activeDailySupplyBoosts,dailySupplyBank} from '../src/core/daily-supplies';
import {advanceForgeSupply,cancelEquipmentCraft,claimEquipmentCraft,equipmentCraftingQueue,equipmentCraftQueueModel,moveWaitingEquipmentCraft,startEquipmentCraft} from '../src/core/equipment-crafting-queue';

function equal(actual:unknown,expected:unknown,label:string){
 if(actual!==expected)throw new Error(label+': expected '+String(expected)+', received '+String(actual));
}
function ok(condition:unknown,label:string){if(!condition)throw new Error(label)}
const t0=Date.UTC(2026,10,19,10),HOUR=3_600_000;
const setup=()=>createCharacter(newGame(t0),'WAYFINDER','Forge Supply');
const job=(id:string,start:number,duration:number):EquipmentCraftJob=>({
 id,recipeId:'TEST_FORGE_RECIPE',ownerCharacterId:'test-account-character',startedAtMs:start,completesAtMs:start+duration,
});
function scenario(jobs:EquipmentCraftJob[],bonus=.25,remainingSeconds=7200):GameState{
 const state=setup();
 return {...state,account:{...state.account,equipmentCraftingQueue:jobs,
  dailySupplies:{schemaVersion:2,totalClaims:14,lastClaimDayKey:'2026-11-18',forgeSettledAtMs:t0,
   bank:{},active:{crafting_speed:{type:'crafting_speed',bonus,seconds:Math.max(7200,remainingSeconds),remainingSeconds}},queued:{}}}};
}
const three=Array.from({length:3},(_,i)=>job('parallel-'+i,t0,HOUR));
const waiting=job('queued',t0+HOUR,HOUR);
let s=scenario([...three,waiting]);
const initial=equipmentCraftQueueModel(s,t0);
equal(initial.active,3,'Three simultaneous jobs start in separate slots');
equal(initial.waiting,1,'Fourth job begins in the backlog');
for(const j of initial.jobs.filter(j=>j.active)){
 equal(j.remainingSeconds,2880,'+25% should forecast 1h work in 48 minutes');
}
equal(initial.jobs.find(j=>j.id==='queued')?.startInSeconds,2880,'Backlog forecast starts immediately when first slot finishes');
equal(activeDailySupplyBoosts(s).crafting_speed?.remainingSeconds,7200,'Reading projected ETA does not spend charges');
s=advanceForgeSupply(s,t0+3000_000);
equal(equipmentCraftingQueue(s).filter(j=>j.completesAtMs<=t0+3000_000).length,3,'Three jobs actually finish by their boosted deadline');
equal(equipmentCraftingQueue(s).find(j=>j.id==='queued')?.startedAtMs,t0+2880_000,'Backlog starts at completion event, not at the next refresh');
equal(activeDailySupplyBoosts(s).crafting_speed?.remainingSeconds,4200,'Parallel jobs spend one shared timer second, not three');
const repeated=advanceForgeSupply(s,t0+3000_000);
equal(activeDailySupplyBoosts(repeated).crafting_speed?.remainingSeconds,4200,'Same-timestamp settlement is idempotent');
s=advanceForgeSupply(s,t0+10*HOUR);
equal(equipmentCraftingQueue(s).filter(j=>j.completesAtMs<=t0+10*HOUR).length,4,'Queued craft also finishes during offline progress');
equal(activeDailySupplyBoosts(s).crafting_speed?.remainingSeconds,1440,'Supply consumption ends when all Forge jobs are ready');
equal(activeDailySupplyBoosts(advanceForgeSupply(s,t0+12*HOUR)).crafting_speed?.remainingSeconds,1440,'No ongoing Forge work means no additional charge drain');

let tiers=scenario([job('long',t0,5*HOUR)],.2,3600);
tiers={...tiers,account:{...tiers.account,dailySupplies:{...tiers.account.dailySupplies!,queued:{crafting_speed:[{type:'crafting_speed',bonus:.1,seconds:7200,remainingSeconds:7200}]}}}};
tiers=advanceForgeSupply(tiers,t0+5400_000);
equal(activeDailySupplyBoosts(tiers).crafting_speed?.bonus,.1,'Normal-tier Crafting Speed resumes after stronger tier expires');
equal(activeDailySupplyBoosts(tiers).crafting_speed?.remainingSeconds,5400,'Elapsed time crosses tiers without double burn');
const longJob=equipmentCraftingQueue(tiers)[0];
equal(longJob.completesAtMs,t0+5*HOUR-3600_000*.2-1800_000*.1,'Extra work is counted at the correct tier on the actual clock');

let priority=scenario([job('overlap',t0,5*HOUR)]);
priority={...priority,activity:{kind:'processing',lastClaimAtMs:t0} as GameState['activity']};
priority=advanceForgeSupply(priority,t0+HOUR);
equal(activeDailySupplyBoosts(priority).crafting_speed?.remainingSeconds,7200,'Concurrent timed processing owns the shared Crafting Speed timer');
equal(equipmentCraftingQueue(priority)[0].completesAtMs,t0+5*HOUR,'Forge progresses normally without consuming overlapping processing bonus');
priority={...priority,activity:null};
priority=advanceForgeSupply(priority,t0+2*HOUR);
equal(activeDailySupplyBoosts(priority).crafting_speed?.remainingSeconds,3600,'Forge consumes charge once processing is no longer running');

let activation=scenario([job('before-activation',t0,5*HOUR)]);
activation={...activation,account:{...activation.account,dailySupplies:{...activation.account.dailySupplies!,bank:{crafting_speed:[{bonus:.25,seconds:7200}]},active:{}}}};
activation=advanceForgeSupply(activation,t0+HOUR);
activation=activateDailySupplyBoost(activation,'crafting_speed');
activation=advanceForgeSupply(activation,t0+2*HOUR);
equal(equipmentCraftingQueue(activation)[0].completesAtMs,t0+5*HOUR-HOUR*.25,'Activating after one hour does not accelerate the prior hour');
equal(dailySupplyBank(activation).crafting_speed?.length??0,0,'Activation removes exactly one saved account charge');

// The queue-order control must preserve reservations and use the new speed ETA.
const twoWaiting=scenario([...three,job('first-wait',t0+HOUR,HOUR),job('second-wait',t0+2*HOUR,HOUR)]);
const moved=moveWaitingEquipmentCraft(twoWaiting,'second-wait','up',t0);
const movedModel=equipmentCraftQueueModel(moved,t0);
equal(movedModel.jobs.filter(j=>j.waiting)[0].id,'second-wait','Manual backlog priority wins before accelerated scheduling');
equal(movedModel.jobs.filter(j=>j.waiting)[0].startInSeconds,2880,'Reordered first backlog job shares accelerated ready time');

// Real crafting checks ensure reservation cancellation does not mint timer time
// and claim at the accelerated deadline cannot settle a copy twice.
const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.v33SetId==='T1_001')!;
const funded=():GameState=>{
 const state=createCharacter(newGame(t0),recipe.classId,'Forge Reservation','male');
 return {...state,character:{...state.character!,level:Math.max(10,recipe.characterLevel),gold:1000000},
  skills:state.skills.map(skill=>({...skill,level:Math.max(30,recipe.level)})),
  inventory:{...state.inventory,capacity:100,stacks:recipe.inputs.map(input=>({itemId:input.itemId,quantity:input.quantity*10}))},
  bank:{...state.bank,capacity:200,stacks:[]},
  account:{...state.account,dailySupplies:{schemaVersion:2,totalClaims:1,forgeSettledAtMs:t0,
   bank:{},active:{crafting_speed:{type:'crafting_speed',bonus:.25,seconds:7200,remainingSeconds:7200}},queued:{}}}};
};
const started=startEquipmentCraft(funded(),recipe.id,t0);
const normalDuration=started.job.completesAtMs-t0;
const elapsed=Math.max(1000,Math.floor(normalDuration/4));
const mid=advanceForgeSupply(started.state,t0+elapsed);
const remainingBeforeCancel=activeDailySupplyBoosts(mid).crafting_speed?.remainingSeconds;
const cancelled=cancelEquipmentCraft(mid,started.job.id,t0+elapsed);
equal(equipmentCraftingQueue(cancelled.state).length,0,'Cancelled job leaves the reserved Forge queue');
equal(activeDailySupplyBoosts(advanceForgeSupply(cancelled.state,t0+2*HOUR)).crafting_speed?.remainingSeconds,
 remainingBeforeCancel,'Cancellation stops future charge burn, but never refunds elapsed activity seconds');
const startedToClaim=startEquipmentCraft(funded(),recipe.id,t0);
const forecastClaim=equipmentCraftQueueModel(startedToClaim.state,t0).jobs.find(row=>row.id===startedToClaim.job.id)!;
ok(forecastClaim.remainingSeconds>0&&forecastClaim.remainingSeconds<normalDuration/1000,'Forge ETA is shorter while blessing applies');
const claimAt=t0+Math.ceil(normalDuration/1.25)+1000;
const claimed=claimEquipmentCraft(startedToClaim.state,startedToClaim.job.id,claimAt,.45);
equal(equipmentCraftingQueue(claimed.state).length,0,'Accelerated Forge job can be claimed once after real completion');
let duplicateBlocked=false;
try{claimEquipmentCraft(claimed.state,startedToClaim.job.id,claimAt,.45)}catch{duplicateBlocked=true}
ok(duplicateBlocked,'The same accelerated Forge job cannot be claimed twice');

// Sub-second checkpoints must not erase activity charge precision on reload.
const fractional=advanceForgeSupply(scenario([job('millisecond-work',t0,5000)]),t0+333);
const fractionalSeconds=activeDailySupplyBoosts(fractional).crafting_speed?.remainingSeconds??0;
ok(Math.abs(fractionalSeconds-(7200-.333))<.00001,'Sub-second Forge settlement charges actual milliseconds');
const fractionalReload=normalizeSave(fractional);
ok(Math.abs((activeDailySupplyBoosts(fractionalReload).crafting_speed?.remainingSeconds??0)-fractionalSeconds)<.00001,'Sub-second charged time survives save normalization');

const normalized=normalizeSave(activation);
equal(normalized.account.dailySupplies?.forgeSettledAtMs,t0+2*HOUR,'Forge watermark persists in normalized save');
equal(activeDailySupplyBoosts(normalized).crafting_speed?.remainingSeconds,3600,'Remaining Forge time persists in normalized save');
ok(equipmentCraftingQueue(normalized).every(j=>j.completesAtMs>=j.startedAtMs),'All stored jobs retain valid completion intervals');

console.log(JSON.stringify({status:'PASS',cases:['parallel','backlog','idempotent','offline','tier-priority','concurrent-processing','activation','save'],remaining:activeDailySupplyBoosts(s).crafting_speed?.remainingSeconds}));
