import {claimActivity,createCharacter,newGame,offlineCapSeconds,startClassTraining,startCombat,startGathering,startNextQueuedActivity} from '../src/core/game';
import {activityQueueAvailableRegions,activityQueueCrossRegionAllowed,activityQueueLocationIssue,activityQueueSchedulingIssue,enqueueActivity,queuedActivityPlanningReadiness,queuedActivityReadiness} from '../src/core/activity-queue';
import {accountEntitlementBenefits,withServerCommerceEntitlements} from '../src/core/account-entitlements';
import {executeGameCommand,validateGameSettings} from '../src/core/game-commands';
import {normalizeSave} from '../src/core/save-normalization';
import {characterTotalXpAtLevel} from '../src/core/progression';
import type {GameState} from '../src/core/types';
import {startProcessingBatch} from '../src/core/processing';
import {startAlchemyBatch} from '../src/core/alchemy';
import {recipeDef} from '../src/content/skills';

function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message)}
function eq(a:unknown,b:unknown,message:string){if(a!==b)throw new Error(message+' ('+String(a)+' !== '+String(b)+')')}
function rejects(fn:()=>unknown,message:string){let rejected=false;try{fn()}catch{rejected=true}ok(rejected,message)}
const t=Date.UTC(2026,9,22,12);
const base=()=>createCharacter(newGame(t),'WAYFINDER','Premium Route');
const leveled=()=>{const s=base();return {...s,character:{...s.character!,level:8,xp:characterTotalXpAtLevel(8)}} as GameState;};
const vip=(s:GameState)=>({...s,account:{...s.account,entitlements:{...s.account.entitlements,vip:true}}}) as GameState;
const vipPlus=(s:GameState)=>({...s,account:{...s.account,entitlements:{...s.account.entitlements,vip_plus:true}}}) as GameState;
const supporter=(s:GameState)=>({...s,account:{...s.account,entitlements:{...s.account.entitlements,supporter:true}}}) as GameState;
const enabled=(s:GameState)=>({...s,settings:{...s.settings,autoTravelQueuedActivities:true}}) as GameState;
const remote={kind:'gathering' as const,targetId:'SILVERBROOK_SHOAL',goal:{kind:'duration_seconds' as const,value:60}};
const local={kind:'gathering' as const,targetId:'GREENWOOD_TREE',goal:{kind:'duration_seconds' as const,value:60}};

ok(!activityQueueCrossRegionAllowed(leveled()),'Free players do not get cross-region queue');
ok(!activityQueueAvailableRegions(leveled()).some(z=>z.id==='SILVERBROOK'),'Free list remains local');
for(const grant of [vip,vipPlus,supporter]){
 const s=grant(leveled());
 ok(activityQueueCrossRegionAllowed(s),'Each paid entitlement independently grants remote scheduling');
 ok(activityQueueAvailableRegions(s).some(z=>z.id==='SILVERBROOK'),'Unlocked region is selectable for paid player');
 ok(!activityQueueAvailableRegions(s).some(z=>z.id==='FROSTMARCH'),'Still-locked regions must remain absent');
 ok(!activityQueueSchedulingIssue(s,remote),'Remote unlocked gathering is scheduleable with auto travel disabled');
 const planned=enqueueActivity(s,remote);
 ok(!queuedActivityReadiness(planned,remote).ready,'Remote execution blocked until toggle is enabled');
 ok(queuedActivityPlanningReadiness(planned,remote).ready,'Planning should not require auto-travel toggle');
 rejects(()=>startNextQueuedActivity(planned,t),'Off toggle must not silently transport player');
 const started=startNextQueuedActivity(enabled(planned),t);
 eq(started.currentRegionId,'SILVERBROOK','Remote job automatically enters its unlocked region');
 eq(started.activity?.targetId,remote.targetId,'Remote queued work starts after travel');
 eq(started.activity?.startedAtMs,t,'Auto-travel never backdates the activity clock');
}
rejects(()=>enqueueActivity(leveled(),remote),'Free remote schedule blocked');
rejects(()=>enqueueActivity(enabled(leveled()),remote),'Free user cannot turn on auto travel to bypass paid gate');
rejects(()=>enqueueActivity(vip(base()),remote),'Premium status cannot bypass region level unlock');
rejects(()=>enqueueActivity(vip(leveled()),{kind:'combat',targetId:'SILVERFIN_SWARM'}),'Premium status cannot queue an enemy that is not yet unlocked');
ok(!accountEntitlementBenefits(leveled()).crossRegionActivityQueue,'Default entitlement omits cross-region travel');
eq(validateGameSettings({...base().settings,autoTravelQueuedActivities:true}).autoTravelQueuedActivities,true,'Trusted settings command accepts the toggle');
rejects(()=>validateGameSettings({...base().settings,autoTravelQueuedActivities:'yes'}),'Trusted settings reject an invalid toggle');
eq(normalizeSave(JSON.parse(JSON.stringify(enabled(vip(leveled()))))).settings.autoTravelQueuedActivities,true,'Auto travel preference survives save normalization');
eq(normalizeSave(JSON.parse(JSON.stringify(leveled()))).settings.autoTravelQueuedActivities,false,'Old saves default to auto-travel off');

// Two consecutive auto-travels must settle exactly at 60s and 120s,
// and keep all reward time within the shared AFK cap.
let journey=enabled(vip(leveled()));
journey=startGathering(journey,'GREENWOOD_TREE',t);
journey=executeGameCommand(journey,{type:'queue_set_goal',args:{id:'GREENWOOD_TREE',goal:{kind:'duration_seconds',value:60}}},t).state;
journey=enqueueActivity(journey,remote);
journey=enqueueActivity(journey,local);
const full=claimActivity(journey,t+180000);
eq(full.reward.activityResults?.[0].activity.targetId,'GREENWOOD_TREE','First interval uses original region');
eq(full.reward.activityResults?.[1].activity.targetId,'SILVERBROOK_SHOAL','Second interval uses Silverbrook');
eq(full.reward.activityResults?.[2].activity.targetId,'GREENWOOD_TREE','Third interval returns to Greenfields');
eq(full.reward.activityResults?.[1].activity.startedAtMs,t+60000,'First travel occurs at the source completion boundary');
eq(full.reward.activityResults?.[2].activity.startedAtMs,t+120000,'Second travel occurs at the source completion boundary');
eq(full.state.currentRegionId,'GREENFIELDS','Player location reflects final queued region');
eq(full.state.activity?.targetId,'GREENWOOD_TREE','Last activity continues normally');
eq(full.reward.elapsedSeconds,180,'Auto travel neither loses nor grants extra activity time');
const splitA=claimActivity(journey,t+60000);
const splitB=claimActivity(splitA.state,t+120000);
const splitC=claimActivity(splitB.state,t+180000);
eq(splitC.state.currentRegionId,full.state.currentRegionId,'Split and single claims end in the same region');
eq(splitC.state.activity?.targetId,full.state.activity?.targetId,'Split and single claims keep same final activity');
eq(splitA.reward.elapsedSeconds+splitB.reward.elapsedSeconds+splitC.reward.elapsedSeconds,full.reward.elapsedSeconds,'Split claims and late claim reward the same elapsed time');
const limit=offlineCapSeconds(journey);
const capped=claimActivity(journey,t+(limit+3600)*1000);
ok(capped.reward.elapsedSeconds<=limit,'Auto travel shares one offline cap');
eq(claimActivity(capped.state,t+(limit+3600)*1000).reward.kills,0,'Capped remote queue cannot double claim');

// Changing commerce eligibility must stop any remote handoff and preserve pending work.
let expiring=enabled(supporter(leveled()));
expiring=startGathering(expiring,'GREENWOOD_TREE',t);
expiring=executeGameCommand(expiring,{type:'queue_set_goal',args:{id:'GREENWOOD_TREE',goal:{kind:'duration_seconds',value:60}}},t).state;
expiring=enqueueActivity(expiring,remote);
const expired=withServerCommerceEntitlements(expiring,{vip:false,vipPlus:false,supporter:false,supporterExpiresAt:null});
ok(!activityQueueCrossRegionAllowed(expired),'Expired Supporter loses remote travel immediately');
ok(!!activityQueueLocationIssue(expired,remote),'Remote queue becomes blocked without entitlement');
const halted=claimActivity(expired,t+180000);
eq(halted.state.currentRegionId,'GREENFIELDS','Expired entitlement never teleports during claim');
eq(halted.state.character?.activityQueue?.[0].targetId,remote.targetId,'Expired entitlement does not delete queued activity');
ok(!halted.state.activity,'Normal source finishes and blocked queue pauses');
ok(!!halted.state.character?.activityQueuePausedReason,'Paused remote handoff explains eligibility');

// A safety injury must not initiate a cross-region handoff, even for VIP with auto-travel on.
let injured=enabled(vip(leveled()));
injured=startCombat(injured,'MOSS_RAT',t);
injured=enqueueActivity(injured,remote);
injured={...injured,inventory:{...injured.inventory,stacks:[]},character:{...injured.character!,currentHp:1}};
const stopped=claimActivity(injured,t+3600000);
eq(stopped.state.currentRegionId,'GREENFIELDS','Combat safety stop cannot auto travel');
eq(stopped.state.character?.activityQueue?.[0].targetId,remote.targetId,'Safety stop preserves remote queue for manual recovery');
ok(!!stopped.reward.activityResults?.[0].reward.stoppedReason,'Safety stop remains visible in offline results');

console.log('PASS: VIP/VIP+/Supporter regional planning, auto travel, premium expiry, manual toggle, safe handoffs and offline cap');


// A regional change must never erase prepaid Cooking/Alchemy work.
// In particular, completed batches are credited before travel and unfinished
// batches remain in their reservation rather than vanishing with activity:null.
const stock=(state:GameState,id:string)=>[...state.inventory.stacks,...state.bank.stacks,...state.overflow.stacks].filter(row=>row.itemId===id).reduce((n,row)=>n+row.quantity,0);
let kitchen=leveled();
kitchen={...kitchen,character:{...kitchen.character!,gold:10000},inventory:{...kitchen.inventory,stacks:[{itemId:'MEADOW_PERCH',quantity:20},{itemId:'GREENWOOD_LOG',quantity:20}]}} as GameState;
const preparedCooking=startProcessingBatch(kitchen,'COOK_MEADOW_PERCH',4,t);
const cookingCycle=preparedCooking.activity!.processing!.cycleSeconds;
eq(stock(preparedCooking,'MEADOW_PERCH'),0,'Cooking inputs are reserved at start');
const travelledCooking=executeGameCommand(preparedCooking,{type:'travel',args:{id:'SILVERBROOK'}},t+1000).state;
eq(travelledCooking.currentRegionId,'SILVERBROOK','Travel should still switch regions during Cooking');
eq(travelledCooking.activity?.kind,'processing','Travel must not cancel portable Cooking');
eq(travelledCooking.activity?.processing?.remainingBatches,4,'All unpaid Cooking batches remain reserved');
const finishedCooking=claimActivity(travelledCooking,t+Math.ceil((cookingCycle*4+2)*1000));
eq(finishedCooking.state.activity,null,'All completed Cooking batches clear normally');
eq(stock(finishedCooking.state,'COOKED_MEADOW_PERCH'),20,'Cooking rewards arrive after region travel');
eq(claimActivity(finishedCooking.state,t+Math.ceil((cookingCycle*4+2)*1000)).reward.craftingActions??0,0,'Travel cannot duplicate completed Cooking');

const partialCooking=executeGameCommand(preparedCooking,{type:'travel',args:{id:'SILVERBROOK'}},t+Math.ceil((cookingCycle+1)*1000)).state;
eq(partialCooking.activity?.processing?.remainingBatches,3,'Travel settles completed batches before preserving the remainder');
const cancelledCooking=executeGameCommand(partialCooking,{type:'stop'},t+Math.ceil((cookingCycle+1)*1000)).state;
eq(cancelledCooking.activity,null,'Explicit Stop still ends Cooking');
eq(stock(cancelledCooking,'COOKED_MEADOW_PERCH'),5,'Completed output survives manual stop after travel');
eq(stock(cancelledCooking,'MEADOW_PERCH'),15,'Stop returns ingredients from unfinished Cooking batches');
eq(stock(cancelledCooking,'GREENWOOD_LOG'),15,'Stop returns unused Cooking fuel');
eq(cancelledCooking.character!.gold,kitchen.character!.gold-(preparedCooking.activity!.processing!.goldPerBatch),'Only completed Cooking consumes Gold');
const repeatedStop=executeGameCommand(cancelledCooking,{type:'stop'},t+Math.ceil((cookingCycle+1)*1000)).state;
eq(stock(repeatedStop,'MEADOW_PERCH'),15,'Repeated Stop cannot refund ingredients twice');

const brewInputs=recipeDef('BREW_DEWLEAF_DRAUGHT')!.inputs;
const brewBase=leveled();
const brewery={...brewBase,character:{...brewBase.character!,gold:10000},inventory:{...brewBase.inventory,stacks:brewInputs.map(input=>({itemId:input.itemId,quantity:input.quantity*3}))}} as GameState;
const preparedAlchemy=startAlchemyBatch(brewery,'BREW_DEWLEAF_DRAUGHT',3,t);
const travelledAlchemy=executeGameCommand(preparedAlchemy,{type:'travel',args:{id:'SILVERBROOK'}},t+1000).state;
eq(travelledAlchemy.activity?.kind,'alchemy','Travel must not cancel a reserved brew');
eq(travelledAlchemy.activity?.brew?.remainingBatches,3,'All unfinished brews stay reserved');
const cancelledAlchemy=executeGameCommand(travelledAlchemy,{type:'stop'},t+1000).state;
for(const input of brewInputs)eq(stock(cancelledAlchemy,input.itemId),input.quantity*3,`Stop refunds all reserved ${input.itemId} inputs`);
eq(cancelledAlchemy.character!.gold,brewery.character!.gold,'Stop refunds unfinished Alchemy Gold');

const walking=startGathering(leveled(),'GREENWOOD_TREE',t);
const walked=executeGameCommand(walking,{type:'travel',args:{id:'SILVERBROOK'}},t+1000).state;
eq(walked.activity,null,'Region-bound gathering still stops on travel');
eq(walked.currentRegionId,'SILVERBROOK','Region-bound gathering travel still succeeds');
const drills=startClassTraining(leveled(),t);
const travellingDrills=executeGameCommand(drills,{type:'travel',args:{id:'SILVERBROOK'}},t+1000).state;
ok(!!travellingDrills.character?.classTraining,'Region-independent class drills must continue after travel');
eq(travellingDrills.currentRegionId,'SILVERBROOK','Class drills do not block travel');

console.log('PASS: travel preserves prepaid Cooking/Alchemy, stop refunds only remaining batches, regional work stops');