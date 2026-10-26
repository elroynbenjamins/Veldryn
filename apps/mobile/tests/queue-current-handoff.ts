import {claimActivity,createCharacter,newGame,offlineCapSeconds,startCombat,startGathering} from '../src/core/game';
import {activityQueueHandoffStatus,currentActivityHandoffGoalIssue,currentActivityNeedsQueueHandoff,normalizeActivityQueueGoal} from '../src/core/activity-queue';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import {totalXpAtLevel} from '../src/core/progression';
import {normalizeSave} from '../src/core/save-normalization';

function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message)}
function eq(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+' ('+String(actual)+' !== '+String(expected)+')')}
function rejects(fn:()=>unknown,message:string){let rejected=false;try{fn()}catch{rejected=true}ok(rejected,message)}
const t=Date.UTC(2026,9,22,14);
const base=()=>createCharacter(newGame(t),'WAYFINDER','Handoff Test');
const chopping=()=>startGathering(base(),'GREENWOOD_TREE',t);
const goal4h={kind:'duration_seconds' as const,value:14400};
const fish={kind:'gathering',id:'MEADOW_PERCH_POOL',goal:{kind:'duration_seconds',value:60}};
const atomic=(args:Record<string,unknown>,now=t)=>executeGameCommand(chopping(),{type:'queue_add',args:{...fish,...args}},now);

ok(currentActivityNeedsQueueHandoff(chopping()),'Open-ended active Woodcutting requires a handoff');
ok(!currentActivityHandoffGoalIssue(chopping(),'GREENWOOD_TREE',goal4h),'4-hour handoff is valid for active Woodcutting');
eq(normalizeActivityQueueGoal(goal4h)?.value,14400,'Duration validated in seconds');
const active=chopping();
const at=t+60_000;
const added=executeGameCommand(active,{type:'queue_add',args:{...fish,handoffTargetId:'GREENWOOD_TREE',handoffGoal:goal4h}},at);
eq(added.state.activity?.targetId,'GREENWOOD_TREE','Scheduling must not interrupt current Woodcutting');
eq(added.state.activity?.queueGoal?.value,14400,'Current activity receives selected 4-hour handoff');
eq(added.state.activity?.startedAtMs,at,'Duration starts from the moment the goal is confirmed');
eq(added.state.activity?.lastClaimAtMs,at,'Original accrued work is settled before resetting the handoff timer');
eq(added.state.character?.activityQueue?.[0].targetId,'MEADOW_PERCH_POOL','The new queued activity is saved in the same operation');
ok(added.reward?.elapsedSeconds===60,'Original minute of woodcutting is credited, not lost');
ok(activityQueueHandoffStatus(added.state).armed,'Handoff status is armed immediately');
ok(!currentActivityNeedsQueueHandoff(added.state),'Do not require another handoff after it was configured');
const reloaded=normalizeSave(JSON.parse(JSON.stringify(added.state)));
eq(reloaded.activity?.queueGoal?.value,14400,'Handoff persists across app restart');
const before=claimActivity(reloaded,at+14399_000);
eq(before.state.activity?.targetId,'GREENWOOD_TREE','Woodcutting continues before the full 4 hours');
eq(before.state.character?.activityQueue?.length,1,'Pending action is not consumed early');
const next=claimActivity(reloaded,at+14400_000);
eq(next.state.activity?.targetId,'MEADOW_PERCH_POOL','Next job starts when the 4-hour target completes while app is closed');
eq(next.state.activity?.startedAtMs,at+14400_000,'Offline handoff begins at planned stop timestamp, not login');
eq(next.state.currentRegionId,'GREENFIELDS','Same-region handoff requires no travel');
const later=claimActivity(reloaded,at+14550_000);
eq(later.state.activity?.targetId,'MEADOW_PERCH_POOL','Queued fishing continues after its own finite stop goal');
eq(later.state.activity?.queueGoalCompletedAtMs,at+14460_000,'Final queued goal is recorded once at its own boundary');
eq(later.reward.elapsedSeconds,14550,'Post-save offline time is credited exactly once across activities');
eq(later.reward.activityResults?.filter(x=>x.goalReached).length,2,'Both stop goals are reported in the offline session');
ok(later.reward.items.some(x=>x.itemId==='GREENWOOD_LOG')&&later.reward.items.some(x=>x.itemId==='MEADOW_PERCH'),'Offline rewards include both woodcutting and fishing');
eq(claimActivity(later.state,at+14550_000).reward.kills,0,'Claim cannot duplicate any rewards');
const cap=offlineCapSeconds(reloaded);
const capped=claimActivity(reloaded,at+(cap+3600)*1000);
ok(capped.reward.offlineCapReached&&capped.reward.elapsedSeconds<=cap,'One offline cap applies across automatic handoff');

const invalidStart=chopping();
rejects(()=>executeGameCommand(invalidStart,{type:'queue_add',args:{...fish,handoffTargetId:'WRONG',handoffGoal:goal4h}},t),'Stale current-activity ID rejects atomic scheduling');
eq(invalidStart.character?.activityQueue?.length??0,0,'Failure leaves queue unchanged');
eq(invalidStart.activity?.queueGoal,undefined,'Failure leaves current woodcutting open-ended');
for(const v of [0,-1,1.5,108001,Infinity,NaN])rejects(()=>atomic({handoffTargetId:'GREENWOOD_TREE',handoffGoal:{kind:'duration_seconds',value:v}}),'Reject invalid current-activity duration '+v);
rejects(()=>atomic({handoffTargetId:'GREENWOOD_TREE',handoffGoal:{kind:'session_kills',value:20}}),'Gathering cannot use a combat defeat handoff');
rejects(()=>atomic({handoffTargetId:'GREENWOOD_TREE',handoffGoal:{kind:'skill_level',value:1}}),'A reached skill target cannot be accepted');
rejects(()=>atomic({handoffTargetId:'GREENWOOD_TREE',handoffGoal:{kind:'item_quantity',value:0}}),'Zero inventory goal cannot be accepted');
rejects(()=>atomic({handoffGoal:goal4h}),'The current activity target must accompany its handoff goal');
rejects(()=>atomic({handoffTargetId:'GREENWOOD_TREE'}),'Cannot send a target without a handoff goal');
rejects(()=>atomic({handoffTargetId:'GREENWOOD_TREE',handoffGoal:goal4h,keepCurrentRunning:true}),'Conflicting explicit handoff choices rejected');
rejects(()=>atomic({handoffTargetId:'GREENWOOD_TREE',handoffGoal:goal4h,keepCurrentRunning:false}),'Explicit keep-running flag must be true or absent');
rejects(()=>atomic({handoffTargetId:'GREENWOOD_TREE',handoffGoal:goal4h,id:'INVALID_GATHERING'}),'Invalid queued activity cannot set a valid handoff');
const fullQueue={...active,character:{...active.character!,activityQueue:[{kind:'gathering' as const,targetId:'GREENWOOD_TREE'},{kind:'gathering' as const,targetId:'MEADOW_PERCH_POOL'}]}};
rejects(()=>executeGameCommand(fullQueue,{type:'queue_add',args:{...fish,handoffTargetId:'GREENWOOD_TREE',handoffGoal:goal4h}},t),'Existing queue cannot receive a first-entry handoff');
const differentActivity=startCombat(base(),'MOSS_RAT',t);
rejects(()=>executeGameCommand(differentActivity,{type:'queue_add',args:{...fish,handoffTargetId:'GREENWOOD_TREE',handoffGoal:goal4h}},t),'Handoff cannot apply to a different running activity');
const noActivity=base();
rejects(()=>executeGameCommand(noActivity,{type:'queue_add',args:{...fish,handoffTargetId:'GREENWOOD_TREE',handoffGoal:goal4h}},t),'Cannot set handoff without a running activity');

const level12={...active,skills:active.skills.map(row=>row.skillId==='woodcutting'?{...row,level:12,xp:totalXpAtLevel(12)}:row)};
rejects(()=>executeGameCommand(level12,{type:'queue_add',args:{...fish,handoffTargetId:'GREENWOOD_TREE',handoffGoal:{kind:'skill_level',value:12}}},t),'Same-level handoff rejected');
const levelGoal=executeGameCommand(level12,{type:'queue_add',args:{...fish,handoffTargetId:'GREENWOOD_TREE',handoffGoal:{kind:'skill_level',value:13}}},t).state;
eq(levelGoal.activity?.queueGoal?.value,13,'Future-level handoff accepted');

const keep=atomic({keepCurrentRunning:true},t).state;
eq(keep.activity?.queueGoal,undefined,'Explicit keep-running choice never adds a stop condition');
eq(keep.character?.activityQueue?.length,1,'Queue saved when player accepts open-ended wait');
const keepLate=claimActivity(keep,t+3600_000);
eq(keepLate.state.activity?.targetId,'GREENWOOD_TREE','Open-ended Woodcutting keeps running offline');
eq(keepLate.state.character?.activityQueue?.length,1,'Open-ended queue remains pending after an hour');
// Older queued jobs with no current handoff can be repaired from the Home queue panel
// without clearing the queue or choosing another activity.
const legacyRunning=chopping();
const legacyWaiting={...legacyRunning,character:{...legacyRunning.character!,activityQueue:[{kind:'gathering' as const,targetId:'MEADOW_PERCH_POOL',goal:{kind:'duration_seconds' as const,value:60}}]}};
ok(!activityQueueHandoffStatus(legacyWaiting).armed,'Existing open-ended queue is not falsely marked as armed');
const repaired=executeGameCommand(legacyWaiting,{type:'queue_set_goal',args:{id:'GREENWOOD_TREE',goal:goal4h}},at);
eq(repaired.state.character?.activityQueue?.[0].targetId,'MEADOW_PERCH_POOL','Repair preserves the old queue');
eq(repaired.state.activity?.startedAtMs,at,'Repair starts the 4-hour timer at confirmation');
eq(claimActivity(repaired.state,at+14460_000).state.activity?.targetId,'MEADOW_PERCH_POOL','Repaired queue runs offline');
const command=validateGameCommand({type:'queue_add',args:{...fish,handoffTargetId:'GREENWOOD_TREE',handoffGoal:goal4h}});
eq(command.type,'queue_add','New atomic fields allowed by trusted validator');

console.log('PASS: atomic 4-hour current-activity handoff, strict goals, explicit open-ended wait, offline queue and AFK cap');
