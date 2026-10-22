import {claimActivity,createCharacter,newGame,offlineCapSeconds,startCombat,stopActivity,travelToRegion} from '../src/core/game';
import {activityQueueCapacity,activityQueueRegion,activityQueueLocationIssue,activityQueueGoalCurrentValue,activityQueueGoalIssue,activityQueueHandoffStatus,enqueueActivity,moveQueuedActivity,queuedActivityPlanningReadiness,queuedActivityReadiness,queueSkillReadiness} from '../src/core/activity-queue';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import {activityStopPresentation} from '../src/core/activity-stop-presentation';
import {totalXpAtLevel,characterTotalXpAtLevel} from '../src/core/progression';
import {normalizeSave} from '../src/core/save-normalization';
import {weeklyOrderBoardForState} from '../src/core/long-term-progression-runtime';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function rejects(fn:()=>unknown,message:string){let caught=false;try{fn()}catch{caught=true}ok(caught,message)}
const now=1_000_000;

let capped=createCharacter(newGame(now),'WAYFINDER','Queue Cap');
for(let i=0;i<activityQueueCapacity(capped);i++)capped=enqueueActivity(capped,{kind:'combat',targetId:'MOSS_RAT',huntGoalId:'kills_50'});
ok(capped.character?.activityQueue?.length===2,'Action Queue should accept two waiting entries');
rejects(()=>enqueueActivity(capped,{kind:'combat',targetId:'MOSS_RAT'}),'Action Queue should reject a third waiting entry');
let vipQueue=createCharacter(newGame(now),'WAYFINDER','VIP Queue');
vipQueue={...vipQueue,account:{...vipQueue.account,entitlements:{vip_plus:true}}};
ok(activityQueueCapacity(vipQueue)===3,'VIP+ should add one permanent Action Queue slot');
for(let i=0;i<3;i++)vipQueue=enqueueActivity(vipQueue,{kind:'combat',targetId:'MOSS_RAT'});
ok(vipQueue.character?.activityQueue?.length===3,'VIP+ should retain three queued actions');
rejects(()=>enqueueActivity(vipQueue,{kind:'combat',targetId:'MOSS_RAT'}),'VIP+ should reject a fourth waiting entry');
ok(normalizeSave(structuredClone(vipQueue)).character?.activityQueue?.length===3,'VIP+ third slot survives save loading');
ok(activityQueueCapacity({...capped,account:{...capped.account,entitlements:{vip:true}}})===2,'VIP without plus retains two waiting slots');
ok(queueSkillReadiness(capped,'woodcutting').ready,'Local unlocked woodcutting is available');
ok(!queueSkillReadiness(capped,'mining').ready&&queueSkillReadiness(capped,'mining').blocker?.includes('Not available in Greenfields'),'Unavailable regional skill explains the region');
const frost={...capped,currentRegionId:'FROSTMARCH'};
ok(!queueSkillReadiness(frost,'woodcutting').ready&&queueSkillReadiness(frost,'woodcutting').blocker?.includes('level 46'),'Local locked skill explains minimum level');
ok(queueSkillReadiness({...frost,skills:frost.skills.map(row=>row.skillId==='woodcutting'?{...row,level:46}:row)},'woodcutting').ready,'Meeting local minimum unlocks skill choice');
ok(!queueSkillReadiness({...capped,unlockedMonsterIds:[]},'combat').ready,'Combat requires an unlocked local enemy');

const dirty:any=structuredClone(capped);
dirty.character.activityQueue=[...dirty.character.activityQueue,{kind:'combat',targetId:''},{kind:'gathering',targetId:'EXTRA'}];
dirty.character.activityQueuePausedReason='x'.repeat(400);
const normalized=normalizeSave(dirty);
ok(normalized.character?.activityQueue?.length===2,'Save normalization should keep only two valid queued actions');
ok((normalized.character?.activityQueuePausedReason?.length??0)<=180,'Save normalization should bound the queue pause message');

let reordered=createCharacter(newGame(now),'WAYFINDER','Queue Reorder');
reordered={...reordered,account:{...reordered.account,entitlements:{vip_plus:true}}};
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
const clearedWaiting=executeGameCommand(commandQueued,{type:'queue_clear'},now+60_003).state;
ok((clearedWaiting.character?.activityQueue?.length??0)===0,'Clear queue removes waiting entries only');
ok(clearedWaiting.activity?.targetId===commandQueued.activity?.targetId&&clearedWaiting.activity?.lastClaimAtMs===lastClaim,
 'Clear queue preserves the running hunt and its last-claim clock without extra settlement');
const withSecond=executeGameCommand(commandQueued,{type:'queue_add',args:{kind:'combat',id:'FIELD_WISP'}},now+60_001).state;
const reorderedCommand=executeGameCommand(withSecond,{type:'queue_move',args:{index:1,direction:'up'}},now+60_002).state;
ok(reorderedCommand.activity?.lastClaimAtMs===lastClaim,'Reordering the queue must remain settlement-free');
ok(reorderedCommand.character?.activityQueue?.[0]?.targetId==='FIELD_WISP'&&reorderedCommand.character?.activityQueue?.[1]?.targetId==='MOSS_RAT','Trusted queue_move should reorder adjacent entries');
rejects(()=>executeGameCommand(withSecond,{type:'queue_move',args:{index:1,direction:'sideways'}},now+60_002),'Queue move should reject unknown directions');
rejects(()=>validateGameCommand({type:'queue_add',args:{kind:'gathering',id:'X',goalId:'kills_50'}}),'Gathering queue entries must reject combat-only options');
rejects(()=>validateGameCommand({type:'queue_add',args:{kind:'faith',id:'FAITH_QUIET'}}),'Faith queue entries require a practice count');
rejects(()=>validateGameCommand({type:'queue_add',args:{kind:'exploration',id:'SCOUT_GREENFIELDS',goal:{kind:'item_quantity',value:1}}}),'Exploration queue entries only accept duration goals');
let alchemyQueued=createCharacter(newGame(now),'WAYFINDER','Alchemy Queue');
alchemyQueued={...alchemyQueued,inventory:{...alchemyQueued.inventory,stacks:[...alchemyQueued.inventory.stacks,{itemId:'DEWLEAF',quantity:20}]}};
ok(queueSkillReadiness(alchemyQueued,'alchemy').ready,'Alchemy becomes queueable when a brew is ready');
alchemyQueued=executeGameCommand(alchemyQueued,{type:'queue_add',args:{kind:'alchemy',id:'BREW_DEWLEAF_DRAUGHT'}},now).state;
ok(queuedActivityReadiness(alchemyQueued,alchemyQueued.character?.activityQueue?.[0]).ready,'Queued Alchemy checks its recipe, materials and Gold');
alchemyQueued=executeGameCommand(alchemyQueued,{type:'queue_start'},now).state;
ok(alchemyQueued.activity?.kind==='alchemy'&&(alchemyQueued.activity.brew?.remainingBatches??0)>1,'Queue start launches an Alchemy run until the normal AFK cap');
let alchemyHandoff=createCharacter(newGame(now),'WAYFINDER','Alchemy Handoff');
alchemyHandoff={...alchemyHandoff,inventory:{...alchemyHandoff.inventory,stacks:[...alchemyHandoff.inventory.stacks,{itemId:'DEWLEAF',quantity:2}]}};
alchemyHandoff=executeGameCommand(alchemyHandoff,{type:'queue_add',args:{kind:'alchemy',id:'BREW_DEWLEAF_DRAUGHT'}},now).state;
alchemyHandoff=executeGameCommand(alchemyHandoff,{type:'queue_add',args:{kind:'gathering',id:'GREENWOOD_TREE',goal:{kind:'duration_seconds',value:60}}},now).state;
alchemyHandoff=executeGameCommand(alchemyHandoff,{type:'queue_start'},now).state;
const alchemyAdvanced=claimActivity(alchemyHandoff,now+60_000);
ok(alchemyAdvanced.state.activity?.kind==='woodcutting'&&alchemyAdvanced.state.activity.targetId==='GREENWOOD_TREE','Finished queued Alchemy should hand off to the next queued activity');
const alchemyLate=claimActivity(alchemyHandoff,now+600_000);
ok(alchemyLate.reward.activityResults?.some(row=>row.activity.kind==='woodcutting'&&row.activity.startedAtMs===now+60_000&&row.reward.items.length>0),'Late login must apply the remaining offline time after the brewing completion boundary');
const alchemySplit=claimActivity(alchemyAdvanced.state,now+600_000);
ok(JSON.stringify(alchemyLate.reward.items)===JSON.stringify([...alchemyAdvanced.reward.items,...alchemySplit.reward.items]),'Late and split queue claims should preserve the same brewing and gathering outputs');
const partialBrew=claimActivity(alchemyHandoff,now+30_000),afterPartialBrew=claimActivity(partialBrew.state,now+600_000);
ok(JSON.stringify(afterPartialBrew.reward.items)===JSON.stringify(alchemyLate.reward.items),'A partial brew claim must preserve the exact completion boundary and later gathering output');
const cappedAlchemyHandoff=claimActivity(alchemyHandoff,now+24*3600_000);
ok(cappedAlchemyHandoff.reward.elapsedSeconds<=offlineCapSeconds(alchemyHandoff),'Alchemy handoff must share one AFK allowance with its successor');
ok(claimActivity(cappedAlchemyHandoff.state,now+24*3600_000).reward.items.length===0,'Repeating a capped queue claim must not grant another offline allowance');
const noIngredients=createCharacter(newGame(now),'WAYFINDER','Future Brew'),futureBrew={kind:'alchemy' as const,targetId:'BREW_DEWLEAF_DRAUGHT'};
ok(queuedActivityPlanningReadiness(noIngredients,futureBrew).ready&&!queuedActivityReadiness(noIngredients,futureBrew).ready,'An unlocked brew may be planned before gathering its materials but must not execute without them');
ok(!queuedActivityPlanningReadiness(noIngredients,{kind:'alchemy',targetId:'BREW_CINDERHEART_ELIXIR'}).ready,'Planning must retain Alchemy level gates');

let faithAndExploration=createCharacter(newGame(now),'WAYFINDER','Faith Queue');
faithAndExploration={...faithAndExploration,inventory:{...faithAndExploration.inventory,stacks:[...faithAndExploration.inventory.stacks,{itemId:'HOLY_WATER',quantity:2}]}};
faithAndExploration=executeGameCommand(faithAndExploration,{type:'queue_add',args:{kind:'faith',id:'FAITH_QUIET',count:1}},now).state;
faithAndExploration=executeGameCommand(faithAndExploration,{type:'queue_add',args:{kind:'exploration',id:'SCOUT_GREENFIELDS',goal:{kind:'duration_seconds',value:60}}},now).state;
ok(queuedActivityReadiness(faithAndExploration,faithAndExploration.character?.activityQueue?.[0]).ready,'Queued Faith practice checks tier and Holy Water readiness');
ok(queuedActivityReadiness(faithAndExploration,faithAndExploration.character?.activityQueue?.[1]).ready,'Queued Exploration checks the route and current region');
faithAndExploration=executeGameCommand(faithAndExploration,{type:'queue_start'},now).state;
ok(faithAndExploration.activity?.kind==='faith'&&faithAndExploration.activity.faithPractice?.remainingPractices===1,'Queue start reserves the selected Faith practices');
const faithAdvanced=claimActivity(faithAndExploration,now+30_000);
ok(faithAdvanced.state.activity?.kind==='exploration'&&faithAdvanced.state.activity.targetId==='SCOUT_GREENFIELDS','Finished queued Faith practice advances into queued Exploration');
const faithLate=claimActivity(faithAndExploration,now+600_000);
ok(faithLate.reward.activityResults?.some(row=>row.activity.kind==='exploration'&&row.activity.startedAtMs===now+30_000&&row.reward.elapsedSeconds>0),'Late login must carry remaining offline time from Faith into Exploration');
const faithPartial=claimActivity(faithAndExploration,now+15_000),faithAfterPartial=claimActivity(faithPartial.state,now+600_000);
ok(faithAfterPartial.reward.activityResults?.some(row=>row.activity.kind==='exploration'&&row.activity.startedAtMs===now+30_000),'A partial Faith claim must preserve its completion boundary');

let planned=createCharacter(newGame(now),'WAYFINDER','Planned Queue');
planned={...planned,unlockedMonsterIds:['MOSS_RAT','FIELD_WISP']};
planned=startCombat(planned,'MOSS_RAT',now,'balanced','kills_50');
planned=enqueueActivity(planned,{kind:'combat',targetId:'FIELD_WISP',combatTacticId:'guarded',huntGoalId:'kills_50'});
const huntHandoff=activityQueueHandoffStatus(planned);ok(huntHandoff.armed&&huntHandoff.nextReady&&huntHandoff.sourceLabel==='50 kills'&&huntHandoff.nextLabel?.includes('Field Wisp'),'Queue panel status should expose the armed, startable Hunt Goal handoff');
const advanced=claimActivity(planned,now+4*60*60*1000);
ok(advanced.reward.activityResults?.[0]?.reward.kills===50,'First queued transition should settle exactly at the Hunt Goal');
ok(advanced.reward.activityResults?.[1]?.activity.targetId==='FIELD_WISP','Planned Hunt Goal stop should start the next queued hunt');
ok(advanced.reward.activityResults?.[1]?.activity.combatTacticId==='guarded','Queued hunt should start with its saved tactic');
ok((advanced.state.character?.activityQueue?.length??0)===0,'Successful transition should consume exactly one queue entry');
ok((advanced.reward.activityResults?.[1]?.activity.startedAtMs??Infinity)<now+4*60*60*1000,'Queued hunt should begin at the planned stop boundary, not login time');

let unsafe=createCharacter(newGame(now),'WAYFINDER','Safety Queue');
unsafe={...unsafe,unlockedMonsterIds:['MOSS_RAT','FIELD_WISP'],inventory:{...unsafe.inventory,stacks:[]}};
unsafe=startCombat(unsafe,'MOSS_RAT',now,'balanced','open');
unsafe=enqueueActivity(unsafe,{kind:'combat',targetId:'FIELD_WISP'});
const waitingHandoff=activityQueueHandoffStatus(unsafe);ok(!waitingHandoff.armed&&waitingHandoff.nextReady&&waitingHandoff.nextLabel?.includes('Field Wisp'),'Queue without a planned stop should report waiting even when the next action itself is startable');
unsafe={...unsafe,character:{...unsafe.character!,currentHp:1}};
const safetyStop=claimActivity(unsafe,now+180_000);
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
wrongRegion=startCombat(wrongRegion,'MOSS_RAT',now,'balanced','kills_50');
const remoteCombat={kind:'combat' as const,targetId:'SILVERFIN_SWARM'};
ok(activityQueueRegion(remoteCombat)?.name==='Silverbrook','Queued location lookup should resolve the authored combat region');
ok((activityQueueLocationIssue(wrongRegion,remoteCombat)??'').includes('Travel to Silverbrook'),'Cross-region schedule explains location before sending the request');
rejects(()=>enqueueActivity(wrongRegion,remoteCombat),'Queue must refuse combat located outside the current region');
rejects(()=>executeGameCommand(wrongRegion,{type:'queue_add',args:{kind:'combat',id:'SILVERFIN_SWARM'}},now),'Trusted server command refuses cross-region combat');
rejects(()=>enqueueActivity(wrongRegion,{kind:'gathering',targetId:'SILVERBROOK_SHOAL'}),'Queue must refuse gathering in a different region');
rejects(()=>executeGameCommand(wrongRegion,{type:'queue_add',args:{kind:'gathering',id:'SILVERBROOK_SHOAL'}},now),'Trusted server command refuses cross-region gathering');
rejects(()=>enqueueActivity(wrongRegion,{kind:'exploration',targetId:'SCOUT_SILVERBROOK',goal:{kind:'duration_seconds',value:60}}),'Queue must refuse remote exploration routes');
rejects(()=>executeGameCommand(wrongRegion,{type:'queue_add',args:{kind:'exploration',id:'SCOUT_SILVERBROOK',goal:{kind:'duration_seconds',value:60}}},now),'Trusted server command refuses cross-region exploration');
rejects(()=>enqueueActivity(wrongRegion,{kind:'combat',targetId:'NONEXISTENT_MONSTER'}),'Queue must refuse targets without a valid region');
// Older saves may still contain entries from another region; those must remain
// in the queue, display the travel requirement and never auto-teleport.
wrongRegion={...wrongRegion,character:{...wrongRegion.character!,activityQueue:[remoteCombat]}};
const queuedRowReadiness=queuedActivityReadiness(wrongRegion,wrongRegion.character!.activityQueue![0]);
ok(!queuedRowReadiness.ready&&(queuedRowReadiness.blocker??'').includes('Travel to Silverbrook'),'Each queued row should expose its own travel blocker before becoming next');
const blockedPreview=activityQueueHandoffStatus(wrongRegion);
ok(blockedPreview.armed&&!blockedPreview.nextReady,'Cross-region queued hunt should predict that an armed stop will pause rather than advance');
ok((blockedPreview.nextBlocker??'').includes('Travel to Silverbrook'),'Cross-region handoff preview should explain the required travel before settlement');
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
let blockedStart=createCharacter(newGame(now),'WAYFINDER','Blocked Start');
blockedStart={...blockedStart,unlockedMonsterIds:['MOSS_RAT','SILVERFIN_SWARM']};
blockedStart={...blockedStart,character:{...blockedStart.character!,activityQueue:[remoteCombat]}};
const blockedStartStatus=activityQueueHandoffStatus(blockedStart);
ok(!blockedStartStatus.nextReady&&(blockedStartStatus.nextBlocker??'').includes('Travel to Silverbrook'),'Idle queue preflight should block a known cross-region manual start before the command is sent');

// Travelling manually keeps waiting regional work without quietly moving or dropping it.
let traveller=createCharacter(newGame(now),'WAYFINDER','Queue Traveller');
traveller={...traveller,character:{...traveller.character!,level:8,xp:characterTotalXpAtLevel(8)}};
traveller=enqueueActivity(traveller,{kind:'gathering',targetId:'GREENWOOD_TREE',goal:{kind:'duration_seconds',value:60}});
const travelledAway=travelToRegion(traveller,'SILVERBROOK',now+5_000).state;
ok(travelledAway.currentRegionId==='SILVERBROOK','Explicit travel moves player to chosen region');
ok(travelledAway.character?.activityQueue?.[0]?.targetId==='GREENWOOD_TREE','Travel must preserve queued activities from former region');
ok((travelledAway.character?.activityQueuePausedReason??'').includes('Travel to Greenfields'),'Travel marks former-region pending work as blocked');
ok(!queuedActivityReadiness(travelledAway,travelledAway.character?.activityQueue?.[0]).ready,'Travel does not allow queued gathering to start in another location');
const returnedHome=travelToRegion(travelledAway,'GREENFIELDS',now+10_000).state;
ok(!returnedHome.character?.activityQueuePausedReason,'Returning to queued job region removes obsolete location warning');
ok(queuedActivityReadiness(returnedHome,returnedHome.character?.activityQueue?.[0]).ready,'Returning to required region restores queued gathering readiness');
const legacyAtDestination={...blockedStart,currentRegionId:'SILVERBROOK',character:{...blockedStart.character!,level:8,xp:characterTotalXpAtLevel(8)}};
ok(queuedActivityReadiness(legacyAtDestination,legacyAtDestination.character?.activityQueue?.[0]).ready,'Legacy cross-region entry becomes valid when player explicitly travels to its region');
const localRegion={...wrongRegion,currentRegionId:'SILVERBROOK'};
ok(!activityQueueLocationIssue(localRegion,remoteCombat),'Current-region queue creation passes location restriction');

// Regression: existing holdings and skill levels are not valid future queue goals.
let strict=createCharacter(newGame(now),'WAYFINDER','Strict Queue');
strict={...strict,
 inventory:{...strict.inventory,stacks:[...strict.inventory.stacks,{itemId:'GREENWOOD_LOG',quantity:140}]},
 bank:{...strict.bank,stacks:[...strict.bank.stacks,{itemId:'GREENWOOD_LOG',quantity:60}]},
 overflow:{...strict.overflow,stacks:[...strict.overflow.stacks,{itemId:'GREENWOOD_LOG',quantity:10}]},
};
const storageGoal={kind:'gathering' as const,targetId:'GREENWOOD_TREE',goal:{kind:'item_quantity' as const,value:210}};
ok(activityQueueGoalCurrentValue(strict,storageGoal)===210,'Queue storage baseline includes inventory, bank and overflow');
ok((activityQueueGoalIssue(strict,storageGoal)??'').includes('Already holding 210'),'Already met goal explains the stored amount');
rejects(()=>enqueueActivity(strict,storageGoal),'Client scheduling refuses an already reached storage goal');
rejects(()=>executeGameCommand(strict,{type:'queue_add',args:{kind:'gathering',id:'GREENWOOD_TREE',goal:storageGoal.goal}},now),'Authoritative queue add refuses a reached storage goal');
ok(!queuedActivityReadiness(strict,storageGoal).ready,'Old saved queues with already-met goals must not auto-start');
ok(queuedActivityReadiness(strict,{...storageGoal,goal:{kind:'item_quantity',value:211}}).ready,'A higher storage goal remains startable');
strict={...strict,skills:strict.skills.map(row=>row.skillId==='woodcutting'?{...row,level:12,xp:totalXpAtLevel(12)}:row)};
const levelGoal={kind:'gathering' as const,targetId:'GREENWOOD_TREE',goal:{kind:'skill_level' as const,value:12}};
rejects(()=>enqueueActivity(strict,levelGoal),'Client scheduling refuses same-level goals');
rejects(()=>executeGameCommand(strict,{type:'queue_add',args:{kind:'gathering',id:'GREENWOOD_TREE',goal:levelGoal.goal}},now),'Trusted commands reject same-level goals');
ok(!queuedActivityReadiness(strict,levelGoal).ready,'Old saved queue skill goals below the current level cannot instantly advance');
ok(queuedActivityReadiness(strict,{...levelGoal,goal:{kind:'skill_level',value:13}}).ready,'Next skill level is a valid goal');
const activeStrict=executeGameCommand(strict,{type:'start',args:{kind:'gathering',id:'GREENWOOD_TREE'}},now).state;
rejects(()=>executeGameCommand(activeStrict,{type:'queue_set_goal',args:{id:'GREENWOOD_TREE',goal:storageGoal.goal}},now),'Setting an already-met goal on the current activity must be rejected');
rejects(()=>executeGameCommand(activeStrict,{type:'queue_set_goal',args:{id:'GREENWOOD_TREE',goal:levelGoal.goal}},now),'Current activity cannot set a past skill-level goal');
const allowedStrict=executeGameCommand(activeStrict,{type:'queue_set_goal',args:{id:'GREENWOOD_TREE',goal:{kind:'duration_seconds',value:60}}},now).state;
ok(allowedStrict.activity?.queueGoal?.value===60,'Duration-based goals still work after goal safeguards');

ok(activityStopPresentation('Hunt goal reached: 50 kills.').category==='completed','Completed hunt goal is not mislabeled as injury');
ok(activityStopPresentation('Queue goal reached.').category==='completed','Queued goals show a completion state');
ok(activityStopPresentation('Too injured').category==='recovery','Combat injuries explain food and healing');
ok(activityStopPresentation('Out of food / too injured').category==='recovery','Missing combat food explains recovery');
ok(activityStopPresentation('Storage cannot safely accept the next reward.').category==='storage','Overflow safety instructs storage cleanup');
ok(activityStopPresentation('Server interrupted the activity').category==='paused','Unexpected stops have a generic actionable fallback');

console.log(JSON.stringify({status:'PASS',plannedNext:advanced.state.activity?.targetId,safetyReason:safetyStop.state.character?.activityQueuePausedReason,regionReason:paused.state.character?.activityQueuePausedReason}));
