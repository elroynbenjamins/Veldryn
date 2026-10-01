import {claimActivity,createCharacter,newGame,offlineCapSeconds,startCombat,startGathering,startNextQueuedActivity,stopActivity} from '../src/core/game';
import {enqueueActivity,normalizeActivityQueueGoal} from '../src/core/activity-queue';
import {executeGameCommand} from '../src/core/game-commands';
import {normalizeSave} from '../src/core/save-normalization';
import {settleStartupActivity} from '../src/core/playability';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function eq(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${actual} !== ${expected}`);}
function rejects(fn:()=>unknown,message:string){let thrown=false;try{fn();}catch{thrown=true;}ok(thrown,message);}
const t=Date.UTC(2026,8,27,12);
const base=()=>createCharacter(newGame(t),'WAYFINDER','Queue Test');
function queue(state:GameState,id:string,seconds:number){return enqueueActivity(state,{kind:'gathering',targetId:id,goal:{kind:'duration_seconds',value:seconds}});}

let state=startNextQueuedActivity(queue(queue(base(),'GREENWOOD_TREE',60),'MEADOW_PERCH_POOL',60),t);
const completed=claimActivity(state,t+180_000);
eq(completed.state.activity?.targetId,'MEADOW_PERCH_POOL','last activity continues');
eq(completed.state.activity?.queueGoalCompletedAtMs,t+120_000,'final goal is recorded once');
eq(completed.reward.activityResults?.length,3,'two goals and continued rewards are reported');
eq(completed.reward.activityResults?.filter(row=>row.goalReached).length,2,'both goals complete');
eq(completed.reward.elapsedSeconds,180,'remaining time is credited after the final goal');
eq(completed.reward.stoppedReason,undefined,'continued activity is not reported as stopped');
ok(completed.reward.items.some(row=>row.itemId==='GREENWOOD_LOG'),'woodcutting rewards retained');
ok(completed.reward.items.some(row=>row.itemId==='MEADOW_PERCH'),'fishing rewards retained');
const repeated=claimActivity(completed.state,t+180_000);
eq(repeated.reward.kills,0,'repeated claim cannot duplicate rewards');
eq(repeated.state.activity?.queueGoalCompletedAtMs,t+120_000,'completed goal cannot retrigger');
const restored=normalizeSave(JSON.parse(JSON.stringify(completed.state)));
eq(restored.activity?.queueGoalCompletedAtMs,t+120_000,'completed queue status survives reload');
ok(claimActivity(restored,t+240_000).reward.kills>0,'reloaded final activity keeps progressing');
eq(stopActivity(restored,t+240_000).activity,null,'manual stop still stops');

const cap=offlineCapSeconds(base());
state=startNextQueuedActivity(queue(queue(base(),'GREENWOOD_TREE',60),'MEADOW_PERCH_POOL',60),t);
const capped=claimActivity(state,t+(cap+3600)*1000);
eq(capped.reward.elapsedSeconds,cap,'one shared offline cap spans all entries');
ok(capped.reward.offlineCapReached,'cap is exposed to the summary');
eq(claimActivity(capped.state,t+(cap+3600)*1000).reward.kills,0,'excess offline time cannot be claimed twice');

state=startNextQueuedActivity(queue(queue(base(),'GREENWOOD_TREE',cap-60),'MEADOW_PERCH_POOL',180),t);
const partial=claimActivity(state,t+(cap+3600)*1000);
eq(partial.state.activity?.queueGoalCompletedAtMs,undefined,'partially completed final goal remains active');
const later=claimActivity(partial.state,t+(cap+3600+120)*1000);
ok(later.state.activity?.queueGoalCompletedAtMs!==undefined,'remaining duration excludes capped time');

state=base();
state={...state,inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'GREENWOOD_LOG',quantity:500}]}};
state=enqueueActivity(state,{kind:'gathering',targetId:'GREENWOOD_TREE',goal:{kind:'item_quantity',value:500}});
state=startNextQueuedActivity(state,t);
const instant=settleStartupActivity(state,t);
ok(instant.reward,'zero-time goal completion is presented and persisted');
eq(instant.state.activity?.queueGoalCompletedAtMs,t,'startup keeps an already-reached goal completion');
const already=claimActivity(state,t+120_000);
eq(already.state.activity?.queueGoalCompletedAtMs,t,'already completed goal advances at the boundary');
ok(already.reward.kills>0,'zero-duration goal does not prevent continuing');

state=enqueueActivity(base(),{kind:'gathering',targetId:'GREENWOOD_TREE',goal:{kind:'skill_level',value:2}});
state=startNextQueuedActivity(state,t);
const skilled=claimActivity(state,t+3600_000);
ok(skilled.state.activity?.queueGoalCompletedAtMs!==undefined,'level goal completes');
ok((skilled.state.skills.find(row=>row.skillId==='woodcutting')?.level??0)>=2,'level rewards are committed');

let unsafe=startNextQueuedActivity(enqueueActivity(base(),{kind:'combat',targetId:'MOSS_RAT',goal:{kind:'duration_seconds',value:1}}),t);
unsafe={...unsafe,inventory:{...unsafe.inventory,stacks:[]},character:{...unsafe.character!,currentHp:1}};
const safety=claimActivity(unsafe,t+3600_000);
eq(safety.state.activity,null,'injury or food exhaustion still stops after a final goal');
ok(safety.reward.stoppedReason,'safety reason survives aggregation');
ok(safety.reward.elapsedSeconds<3600,'safety stop records the actual stop boundary');

state=startNextQueuedActivity(queue(base(),'GREENWOOD_TREE',1),t);
state={...state,character:{...state.character!,idleRulesV40:[{id:'safe',characterId:state.character!.id,name:'Safety',conditions:[{id:'slots',kind:'free_slots_below',value:1000,enabled:true}],stopIfOutOfFood:false,stopIfRewardsWouldOverflow:false,finishCurrentCycle:true}],activeIdleRuleIdV40:'safe'}};
eq(claimActivity(state,t+600_000).state.activity,null,'storage safety overrides queue continuation');

const standalone=startCombat(base(),'MOSS_RAT',t,'balanced','kills_50');
eq(claimActivity(standalone,t+4*3600_000).state.activity,null,'standalone hunt goal still stops');

const command=executeGameCommand(base(),{type:'queue_add',args:{kind:'gathering',id:'GREENWOOD_TREE',goal:{kind:'duration_seconds',value:60}}},t);
eq(command.state.character?.activityQueue?.[0].goal?.value,60,'trusted command saves per-entry goals');
const commandStart=executeGameCommand(command.state,{type:'queue_start'},t);
const commandClaim=executeGameCommand(commandStart.state,{type:'claim'},t+180_000);
eq(commandClaim.contributions.reduce((sum,row)=>sum+row.units,0),commandClaim.reward?.kills,'segment contribution totals are not duplicated');
ok(commandClaim.contributions.every(row=>row.contentId==='GREENWOOD_TREE'),'contributions preserve activity source');
const mixed=executeGameCommand(startNextQueuedActivity(queue(queue(base(),'GREENWOOD_TREE',60),'MEADOW_PERCH_POOL',60),t),{type:'claim'},t+180_000);
ok(mixed.contributions.some(row=>row.contentId==='GREENWOOD_TREE')&&mixed.contributions.some(row=>row.contentId==='MEADOW_PERCH_POOL'),'different sources are credited separately');

for(const value of [0,-1,1.5,Infinity,NaN,108001])eq(normalizeActivityQueueGoal({kind:'duration_seconds',value}),undefined,'invalid duration rejected');
rejects(()=>executeGameCommand(base(),{type:'queue_add',args:{kind:'gathering',id:'GREENWOOD_TREE',goal:{kind:'duration_seconds',value:-1}}},t),'invalid command goal rejected');
rejects(()=>executeGameCommand(base(),{type:'queue_add',args:{kind:'combat',id:'MOSS_RAT',goal:{kind:'skill_level',value:10}}},t),'combat cannot accept a gathering goal');
const active=startGathering(base(),'GREENWOOD_TREE',t);
const waiting=queue(queue(active,'MEADOW_PERCH_POOL',60),'DEWLEAF_PATCH',60);
eq(waiting.activity?.targetId,'GREENWOOD_TREE','adding two waiting skills does not interrupt current skill');
eq(waiting.character?.activityQueue?.length,2,'active activity does not occupy a waiting slot');
eq(claimActivity(waiting,t+60_000).state.activity?.targetId,'GREENWOOD_TREE','current skill without a goal keeps running');
const scheduled=executeGameCommand(waiting,{type:'queue_set_goal',args:{id:'GREENWOOD_TREE',goal:{kind:'duration_seconds',value:60}}},t).state;
const threeSkills=claimActivity(scheduled,t+240_000);
eq(threeSkills.state.activity?.targetId,'DEWLEAF_PATCH','current goal hands off through both waiting skills');
eq(threeSkills.reward.activityResults?.filter(row=>row.goalReached).length,3,'all three goals complete offline');
let interrupted=startCombat(base(),'MOSS_RAT',t);
interrupted=queue(interrupted,'MEADOW_PERCH_POOL',60);
interrupted=enqueueActivity(interrupted,{kind:'combat',targetId:'MOSS_RAT',goal:{kind:'duration_seconds',value:60}});
interrupted={...interrupted,inventory:{...interrupted.inventory,stacks:[]},character:{...interrupted.character!,currentHp:1}};
const interruptedResult=claimActivity(interrupted,t+3600_000);
eq(interruptedResult.state.activity?.targetId,'MEADOW_PERCH_POOL','unsafe combat hands off to safe gathering');
eq(interruptedResult.state.character?.activityQueue?.length,1,'later combat stays queued while gathering continues');
ok(interruptedResult.reward.queuePausedReason,'blocked combat is reported in offline results');
ok(interruptedResult.reward.activityResults?.[0].reward.stoppedReason,'interrupted combat reason remains in its timeline');
eq(interruptedResult.reward.continuingActivity?.queueGoalsCompleted,false,'blocked combat is not reported as all goals completed');
const edited=executeGameCommand(active,{type:'queue_set_goal',args:{id:'GREENWOOD_TREE',goal:{kind:'duration_seconds',value:60}}},t+1000);
eq(edited.state.activity?.queueGoal?.value,60,'current activity can receive a goal');
rejects(()=>executeGameCommand(active,{type:'queue_set_goal',args:{id:'MEADOW_PERCH_POOL',goal:{kind:'duration_seconds',value:60}}},t+1000),'stale activity selection rejected');
const combatGoal=executeGameCommand(base(),{type:'queue_add',args:{kind:'combat',id:'MOSS_RAT',goal:{kind:'session_kills',value:2}}},t).state;
const combatResult=claimActivity(startNextQueuedActivity(combatGoal,t),t+60_000);
eq(combatResult.reward.activityResults?.[0]?.reward.kills,2,'combat goal completes at the requested defeat count');
ok(combatResult.state.activity?.queueGoalCompletedAtMs!==undefined,'final combat goal continues after completion');
ok(combatResult.reward.kills>2,'continued combat rewards are included');
console.log('PASS: queue continuation, offline handoffs, cap, safety, goals, persistence and trusted contributions');
