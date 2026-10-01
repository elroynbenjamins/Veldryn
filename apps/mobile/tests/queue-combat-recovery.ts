import {claimActivity,createCharacter,newGame,startCombat,stopActivity,effectiveStats,offlineCapSeconds} from '../src/core/game';
import {enqueueActivity,queuedActivityReadiness} from '../src/core/activity-queue';
import {normalizeSave} from '../src/core/save-normalization';
import {executeGameCommand} from '../src/core/game-commands';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function eq(a:unknown,b:unknown,message:string){if(a!==b)throw new Error(`${message}: ${a} !== ${b}`);}
const t=Date.UTC(2026,8,27,12);
const base=()=>createCharacter(newGame(t),'WAYFINDER','Recovery Test');
const gather=(s:GameState,id='GREENWOOD_TREE')=>enqueueActivity(s,{kind:'gathering',targetId:id,goal:{kind:'duration_seconds',value:60}});
const combat=(s:GameState)=>enqueueActivity(s,{kind:'combat',targetId:'MOSS_RAT',goal:{kind:'duration_seconds',value:60}});
function injured(){let s=startCombat(base(),'MOSS_RAT',t);return {...s,inventory:{...s.inventory,stacks:[]},character:{...s.character!,currentHp:1}};}

const input=combat(gather(injured()));
const result=claimActivity(input,t+3600000);
eq(result.state.activity?.targetId,'GREENWOOD_TREE','Gathering continues while later combat is blocked');
eq(result.state.character?.activityQueue?.length,1,'Blocked hunt is preserved');
ok(result.reward.elapsedSeconds>=3599&&result.reward.elapsedSeconds<=3600,'Remaining offline time goes to gathering, allowing per-segment display rounding');
eq(result.reward.activityResults?.filter(row=>row.activity.kind==='combat').length,1,'No repeated combat deaths');
ok(result.reward.activityResults?.[0].reward.stoppedReason?.includes('injured'),'Combat interruption recorded');
eq(result.reward.activityResults?.[0].goalReached,false,'Interrupted hunt is not complete');
eq(result.reward.continuingActivity?.queueGoalsCompleted,false,'Outstanding hunt prevents all-goals-complete label');
eq(claimActivity(result.state,t+3600000).reward.kills,0,'Claim cannot duplicate recovery rewards');
const reloaded=normalizeSave(JSON.parse(JSON.stringify(result.state)));
ok(reloaded.character?.activityQueueCombatRecovery?.needsHealing,'Recovery survives save/load');
eq(queuedActivityReadiness(reloaded,reloaded.character?.activityQueue?.[0]).ready,false,'Reload cannot bypass injury');
eq(claimActivity(reloaded,t+3660000).state.activity?.targetId,'GREENWOOD_TREE','Blocked hunt does not interrupt continued gathering');
eq(stopActivity(reloaded,t+3660000).activity,null,'Manual stop remains effective');
const cap=offlineCapSeconds(input),capped=claimActivity(input,t+(cap+3600)*1000);
ok(capped.reward.offlineCapReached,'Recovery shares the existing offline cap');
ok(capped.reward.elapsedSeconds<=cap&&capped.reward.elapsedSeconds>=cap-2,'Recovery does not reset offline allowance');
eq(claimActivity(capped.state,t+(cap+3600)*1000).reward.kills,0,'Capped time cannot be claimed again');

const skipped=claimActivity(gather(combat(injured())),t+3600000);
eq(skipped.state.activity?.targetId,'GREENWOOD_TREE','Safe gathering can run after a blocked combat slot');
eq(skipped.state.character?.activityQueue?.[0].kind,'combat','Skipping preserves the blocked slot');
const onlyCombat=claimActivity(combat(injured()),t+3600000);
eq(onlyCombat.state.activity,null,'No safe work available means pause');
eq(onlyCombat.state.character?.activityQueue?.length,1,'Paused combat not dropped');
let vip=injured();vip={...vip,account:{...vip.account,entitlements:{vip_plus:true}}};
const multiple=claimActivity(gather(combat(gather(vip)),'MEADOW_PERCH_POOL'),t+3600000);
eq(multiple.state.activity?.targetId,'MEADOW_PERCH_POOL','Multiple safe gathering slots advance past blocked combat');
eq(multiple.state.character?.activityQueue?.length,1,'Only blocked combat remains after both gathering goals');
eq(multiple.reward.activityResults?.filter(row=>row.goalReached).length,2,'Only the two gathering goals are reported complete');

let foodStop=startCombat(base(),'MOSS_RAT',t);
foodStop={...foodStop,inventory:{...foodStop.inventory,stacks:[]},character:{...foodStop.character!,idleRulesV40:[{id:'food',characterId:foodStop.character!.id,name:'Food',conditions:[],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:false,finishCurrentCycle:true}],activeIdleRuleIdV40:'food'}};
const noFood=claimActivity(combat(gather(foodStop)),t+3600000);
eq(noFood.state.activity?.targetId,'GREENWOOD_TREE','Combat food rule does not stop gathering');
eq(noFood.reward.elapsedSeconds,3600,'Zero-time food handoff does not lose offline time');
eq(noFood.state.character?.activityQueueCombatRecovery?.needsHealing,false,'Food stop does not invent an injury');
ok(noFood.reward.queuePausedReason?.includes('Restock'),'Food blocker is actionable');

const storage={...input,character:{...input.character!,idleRulesV40:[{id:'storage',characterId:input.character!.id,name:'Storage',conditions:[{id:'slots',kind:'free_slots_below' as const,value:10000,enabled:true}],stopIfOutOfFood:false,stopIfRewardsWouldOverflow:false,finishCurrentCycle:true}],activeIdleRuleIdV40:'storage'}};
eq(claimActivity(storage,t+3600000).state.activity,null,'Storage safety still stops all work');

let ready={...reloaded,inventory:{...reloaded.inventory,stacks:[{itemId:'COOKED_MEADOW_PERCH',quantity:100}]},character:{...reloaded.character!,currentHp:effectiveStats(reloaded).hp,equippedFoodId:'COOKED_MEADOW_PERCH'}};
const resumed=executeGameCommand(ready,{type:'queue_start'},t+3660000);
eq(resumed.state.activity?.kind,'combat','Explicit resume starts saved combat after healing/restocking');
eq(resumed.state.character?.activityQueueCombatRecovery,undefined,'Successful combat resume clears recovery guard');
ok(resumed.reward?.kills,'Resume settles continued gathering first');
ok(resumed.contributions.some(row=>row.kind==='gathering'),'Resume credits continued gathering');
eq(resumed.state.activity?.startedAtMs,t+3660000,'Combat never backdates into offline recovery time');
console.log('PASS: combat recovery, safe handoffs, blocked-slot preservation, persistence, storage protection and explicit resume');
