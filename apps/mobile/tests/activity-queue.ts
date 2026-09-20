import {claimActivity,createCharacter,newGame,startCombat,stopActivity} from '../src/core/game';
import {activityQueueHandoffStatus,enqueueActivity,MAX_ACTIVITY_QUEUE,moveQueuedActivity} from '../src/core/activity-queue';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import {normalizeSave} from '../src/core/save-normalization';
import {weeklyOrderBoardForState} from '../src/core/long-term-progression-runtime';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function rejects(fn:()=>unknown,message:string){let caught=false;try{fn()}catch{caught=true}ok(caught,message)}
const now=1_000_000;

let capped=createCharacter(newGame(now),'WAYFINDER','Queue Cap');
for(let i=0;i<MAX_ACTIVITY_QUEUE;i++)capped=enqueueActivity(capped,{kind:'combat',targetId:'MOSS_RAT',huntGoalId:'kills_50'});
ok(capped.character?.activityQueue?.length===3,'Action Queue should accept three entries');
rejects(()=>enqueueActivity(capped,{kind:'combat',targetId:'MOSS_RAT'}),'Action Queue should reject a fourth entry');
const dirty:any=structuredClone(capped);
dirty.character.activityQueue=[...dirty.character.activityQueue,{kind:'combat',targetId:''},{kind:'gathering',targetId:'EXTRA'}];
dirty.character.activityQueuePausedReason='x'.repeat(400);
const normalized=normalizeSave(dirty);
ok(normalized.character?.activityQueue?.length===3,'Save normalization should keep only three valid queued actions');
ok((normalized.character?.activityQueuePausedReason?.length??0)<=180,'Save normalization should bound the queue pause message');

let reordered=createCharacter(newGame(now),'WAYFINDER','Queue Reorder');
reordered=enqueueActivity(reordered,{kind:'combat',targetId:'MOSS_RAT'});
reordered=enqueueActivity(reordered,{kind:'combat',targetId:'FIELD_WISP'});
reordered=enqueueActivity(reordered,{kind:'combat',targetId:'ROADSIDE_BOAR'});
reordered={...reordered,character:{...reordered.character!,activityQueuePausedReason:'Old blocked next action'}};
reordered=moveQueuedActivity(reordered,2,'up');
ok(reordered.character?.activityQueue?.map(row=>row.targetId).join(',')==='MOSS_RAT,ROADSIDE_BOAR,FIELD_WISP','Move up should swap a queued action with its immediate predecessor');
ok(!reordered.character?.activityQueuePausedReason,'Changing queue order should clear a stale pause explanation');
const boundary=moveQueuedActivity(reordered,0,'up');
ok(boundary.character?.activityQueue?.map(row=>row.targetId).join(',')===reordered.character?.activityQueue?.map(row=>row.targetId).join(','),'Moving the first entry up should be a no-op');

let commandState=createCharacter(newGame(now),'WAYFINDER','Queue Command');
commandState=startCombat(commandState,'MOSS_RAT',now);
const lastClaim=commandState.activity!.lastClaimAtMs;
const commandQueued=executeGameCommand(commandState,{type:'queue_add',args:{kind:'combat',id:'MOSS_RAT',tacticId:'guarded',goalId:'kills_50'}},now+60_000).state;
ok(commandQueued.activity?.lastClaimAtMs===lastClaim,'Editing the queue must not claim or shift the active activity clock');
ok(commandQueued.character?.activityQueue?.[0]?.combatTacticId==='guarded','Trusted queue command should preserve combat options');
const withSecond=executeGameCommand(commandQueued,{type:'queue_add',args:{kind:'combat',id:'FIELD_WISP'}},now+60_001).state;
const reorderedCommand=executeGameCommand(withSecond,{type:'queue_move',args:{index:1,direction:'up'}},now+60_002).state;
ok(reorderedCommand.activity?.lastClaimAtMs===lastClaim,'Reordering the queue must remain settlement-free');
ok(reorderedCommand.character?.activityQueue?.[0]?.targetId==='FIELD_WISP'&&reorderedCommand.character?.activityQueue?.[1]?.targetId==='MOSS_RAT','Trusted queue_move should reorder adjacent entries');
rejects(()=>executeGameCommand(withSecond,{type:'queue_move',args:{index:1,direction:'sideways'}},now+60_002),'Queue move should reject unknown directions');
rejects(()=>validateGameCommand({type:'queue_add',args:{kind:'gathering',id:'X',goalId:'kills_50'}}),'Gathering queue entries must reject combat-only options');

let planned=createCharacter(newGame(now),'WAYFINDER','Planned Queue');
planned={...planned,unlockedMonsterIds:['MOSS_RAT','FIELD_WISP']};
planned=startCombat(planned,'MOSS_RAT',now,undefined,'balanced','kills_50');
planned=enqueueActivity(planned,{kind:'combat',targetId:'FIELD_WISP',combatTacticId:'guarded',huntGoalId:'kills_50'});
const huntHandoff=activityQueueHandoffStatus(planned);ok(huntHandoff.armed&&huntHandoff.sourceLabel==='50 kills'&&huntHandoff.nextLabel?.includes('Field Wisp'),'Queue panel status should expose the armed Hunt Goal handoff');
const advanced=claimActivity(planned,now+4*60*60*1000);
ok(advanced.reward.kills===50,'First queued transition should settle exactly at the Hunt Goal');
ok(advanced.state.activity?.targetId==='FIELD_WISP','Planned Hunt Goal stop should start the next queued hunt');
ok(advanced.state.activity?.combatTacticId==='guarded','Queued hunt should start with its saved tactic');
ok((advanced.state.character?.activityQueue?.length??0)===0,'Successful transition should consume exactly one queue entry');
ok((advanced.state.activity?.startedAtMs??0)<now+4*60*60*1000,'Queued hunt should begin at the planned stop boundary, not login time');

let unsafe=createCharacter(newGame(now),'WAYFINDER','Safety Queue');
unsafe={...unsafe,unlockedMonsterIds:['MOSS_RAT','FIELD_WISP'],inventory:{...unsafe.inventory,stacks:[]},character:{...(unsafe.character!),currentHp:1}};
unsafe=startCombat(unsafe,'MOSS_RAT',now,undefined,'balanced','open');
unsafe=enqueueActivity(unsafe,{kind:'combat',targetId:'FIELD_WISP'});
const waitingHandoff=activityQueueHandoffStatus(unsafe);ok(!waitingHandoff.armed&&waitingHandoff.nextLabel?.includes('Field Wisp'),'Queue without a planned stop should report a waiting handoff');
const safetyStop=claimActivity(unsafe,now+60_000);
ok(!safetyStop.state.activity,'Injury stop should end the current hunt');
ok(safetyStop.state.character?.activityQueue?.length===1,'Safety stop must preserve the queued action');
ok(!!safetyStop.state.character?.activityQueuePausedReason,'Safety stop should expose a visible queue pause reason');

let ruled=createCharacter(newGame(now),'WAYFINDER','Rule Queue');
ruled={...ruled,account:{...ruled.account,longTermAccountScopeId:'queue-rule'}};
const ruledBoard=weeklyOrderBoardForState(ruled,now),ruledOrder=ruledBoard.orders.find(order=>order.kind==='hunt')!;
ruled={...ruled,account:{...ruled.account,weeklyOrders:ruledBoard},unlockedMonsterIds:[...new Set([...ruled.unlockedMonsterIds,ruledOrder.targetId,'FIELD_WISP'])]};
ruled=startCombat(ruled,ruledOrder.targetId,now);
ruled=enqueueActivity(ruled,{kind:'combat',targetId:'FIELD_WISP'});
ruled={...ruled,character:{...ruled.character!,idleRulesV40:[{id:'contract-stop',characterId:ruled.character!.id,name:'Stop · current contract',conditions:[{id:'done',kind:'weekly_order_progress' as const,targetId:ruledOrder.id,value:ruledOrder.target,enabled:true}],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:true,finishCurrentCycle:true}],activeIdleRuleIdV40:'contract-stop'}};
const ruleHandoff=activityQueueHandoffStatus(ruled);ok(ruleHandoff.armed&&ruleHandoff.sourceLabel==='Stop · current contract'&&ruleHandoff.safetyEnabled,'Matching Contract Idle Rule should show an armed handoff while preserving safety');
const futureOrder={...ruledOrder,id:ruledOrder.id+':future',title:'Future queued contract',targetId:'FIELD_WISP',progress:0,target:20};
const futureRuled={...ruled,account:{...ruled.account,weeklyOrders:{...ruledBoard,orders:[...ruledBoard.orders,futureOrder]}},character:{...ruled.character!,idleRulesV40:[{id:'future-stop',characterId:ruled.character!.id,name:'Stop · future contract',conditions:[{id:'done',kind:'weekly_order_progress' as const,targetId:futureOrder.id,value:futureOrder.target,enabled:true}],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:true,finishCurrentCycle:true}],activeIdleRuleIdV40:'future-stop'}};
const futureHandoff=activityQueueHandoffStatus(futureRuled);ok(!futureHandoff.armed&&futureHandoff.nextLabel?.includes('Field Wisp'),'Future Contract rule must not claim the current activity has an armed handoff');

let wrongRegion=createCharacter(newGame(now),'WAYFINDER','Region Queue');
wrongRegion={...wrongRegion,unlockedMonsterIds:['MOSS_RAT','SILVERFIN_SWARM']};
wrongRegion=startCombat(wrongRegion,'MOSS_RAT',now,undefined,'balanced','kills_50');
wrongRegion=enqueueActivity(wrongRegion,{kind:'combat',targetId:'SILVERFIN_SWARM'});
const paused=claimActivity(wrongRegion,now+4*60*60*1000);
ok(!paused.state.activity,'Queue must not auto-travel into another region');
ok(paused.state.character?.activityQueue?.[0]?.targetId==='SILVERFIN_SWARM','Blocked entry should remain at the front of the queue');
ok((paused.state.character?.activityQueuePausedReason??'').includes('Travel'),'Wrong-region transition should explain why the queue paused');

let manual=createCharacter(newGame(now),'WAYFINDER','Manual Queue');
manual=startCombat(manual,'MOSS_RAT',now);
manual=enqueueActivity(manual,{kind:'combat',targetId:'MOSS_RAT'});
manual=stopActivity(manual);
ok(manual.character?.activityQueue?.length===1,'Manual stop should pause rather than consume the queue');

let startNext=createCharacter(newGame(now),'WAYFINDER','Start Next');
startNext=enqueueActivity(startNext,{kind:'combat',targetId:'MOSS_RAT',huntGoalId:'kills_50'});
startNext=executeGameCommand(startNext,{type:'queue_start'},now).state;
ok(startNext.activity?.targetId==='MOSS_RAT'&&!startNext.character?.activityQueue?.length,'Start-next command should consume and start the first valid queued action');

console.log(JSON.stringify({status:'PASS',plannedNext:advanced.state.activity?.targetId,safetyReason:safetyStop.state.character?.activityQueuePausedReason,regionReason:paused.state.character?.activityQueuePausedReason}));
