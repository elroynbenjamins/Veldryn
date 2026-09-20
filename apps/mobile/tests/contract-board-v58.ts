import {createCharacter,newGame} from '../src/core/game';
import {weeklyOrderCandidatesFromCurrentContent} from '../src/core/launch-readiness-v47';
import {applyTrustedLongTermProgression,weeklyOrderBoardForState} from '../src/core/long-term-progression-runtime';
import {applyWeeklyOrderProgress,generateWeeklyOrders} from '../src/core/weekly-orders-v41';
import {weeklyOrderDestination,weeklyOrderGoal,weeklyOrderQueueActivity} from '../src/core/weekly-order-integrations-v41';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const now=Date.UTC(2026,8,21,12,0,0),accountId='contract-board-test';
let state=createCharacter(newGame(now),'WAYFINDER','Contract Tester');
const candidates=weeklyOrderCandidatesFromCurrentContent(state);
ok(candidates.some(row=>row.kind==='hunt'),'Contract Board needs Hunt Order candidates');
ok(candidates.some(row=>row.kind==='profession'),'Contract Board needs Work Order candidates');
const regionalCandidates=candidates.filter(row=>row.kind==='regional');
ok(regionalCandidates.length>0&&regionalCandidates.every(row=>row.regionId),'Contract Board needs real Regional Problem candidates');
ok(regionalCandidates.length>=2&&regionalCandidates.every(row=>row.brief&&row.brief.length>40),'Unlocked regions should offer multiple authored Regional Problem scenarios');
ok(new Set(regionalCandidates.map(row=>row.title)).size===regionalCandidates.length,'Regional Problem scenario titles must remain distinct');
ok(!candidates.some(row=>row.kind==='threat'),'Threat Bounties should not appear before Challenge Hunts are mastered');
let mastered={...state,character:{...state.character!,monsterMasteryPoints:{MOSS_RAT:500}}};const masteredCandidates=weeklyOrderCandidatesFromCurrentContent(mastered),threatCandidates=masteredCandidates.filter(row=>row.kind==='threat');ok(threatCandidates.length===3,'Mastery 20 Moss Rat should expose all three Threat Bounty tiers');

const generated=generateWeeklyOrders(accountId,now,candidates);
ok(generated.orders.filter(row=>row.kind==='hunt').length===Math.min(2,candidates.filter(row=>row.kind==='hunt'&&row.available&&row.source.available).length),'default board should fill available Hunt Order slots');
ok(generated.orders.filter(row=>row.kind==='profession').length===Math.min(2,candidates.filter(row=>row.kind==='profession'&&row.available&&row.source.available).length),'default board should fill available Work Order slots');
ok(generated.orders.filter(row=>row.kind==='regional').length===1,'default board should have one Regional Problem');
const huntOrder=generated.orders.find(row=>row.kind==='hunt')!,workOrder=generated.orders.find(row=>row.kind==='profession')!;
const huntDestination=weeklyOrderDestination(huntOrder),workDestination=weeklyOrderDestination(workOrder),regionalDestination=weeklyOrderDestination(generated.orders.find(row=>row.kind==='regional')!);
ok(huntDestination.kind==='combat'&&huntDestination.monsterId===huntOrder.targetId,'Hunt Order should deep-link to its exact monster');
ok(workDestination.kind==='skills'&&(workDestination.actionId===workOrder.targetId||workDestination.recipeId===workOrder.targetId),'Work Order should deep-link to its exact activity or recipe');
ok(regionalDestination.kind==='world'&&regionalDestination.regionId===generated.orders.find(row=>row.kind==='regional')!.regionId,'Regional Problem should deep-link to its exact region');
const huntQueue=weeklyOrderQueueActivity(huntOrder);ok(huntQueue?.kind==='combat'&&huntQueue.targetId===huntOrder.targetId,'Hunt Order should be directly queueable');
const pinnedGoal=weeklyOrderGoal(huntOrder,state.character!.id,now);ok(pinnedGoal.kind==='weekly_order'&&pinnedGoal.orderId===huntOrder.id&&pinnedGoal.targetProgress===huntOrder.target,'Contract Board pin should track the exact weekly job target');
const generatedRegional=generated.orders.find(row=>row.kind==='regional');ok(!!generatedRegional?.brief&&generatedRegional.reward.label.includes('Relief Cache'),'Generated Regional Problem should preserve authored brief and regional reward identity');
const masteredBoard=generateWeeklyOrders(accountId+'-mastered',now,masteredCandidates),threat=masteredBoard.orders.find(row=>row.kind==='threat');ok(!!threat&&!!threat.challengeId&&threat.reward.label.includes('Bounty Cache'),'Mastered board should generate one tier-specific Threat Bounty');
const threatDestination=weeklyOrderDestination(threat!),threatQueue=weeklyOrderQueueActivity(threat!);ok(threatDestination.kind==='combat'&&threatDestination.monsterId===threat!.targetId.split(':')[0],'Threat Bounty should open its exact monster');ok(threatQueue?.kind==='combat'&&threatQueue.combatChallengeId===threat!.challengeId,'Threat Bounty queue must preserve its exact Challenge Hunt tier');

const regional=generated.orders.find(row=>row.kind==='regional')!;
const direct=applyWeeklyOrderProgress(generated,{eventId:'regional-progress',characterId:state.character!.id,kind:'regional',targetId:regional.targetId,amount:3,completedAtMs:now});
ok(direct.updated.length===1&&regional.progress===3,'Regional Problem progress should use the weekly order engine');

state={...state,account:{...state.account,longTermAccountScopeId:accountId,weeklyOrders:weeklyOrderBoardForState({...state,account:{...state.account,longTermAccountScopeId:accountId}},now)}};
const before=state.account.weeklyOrders!.orders.find(row=>row.kind==='regional');
ok(before?.targetId==='GREENFIELDS','level-one board should target the available Greenfields region');
const settled=applyTrustedLongTermProgression(state,[{kind:'combat',contentId:'MOSS_RAT',units:4,startedAtMs:now-60_000}],undefined,now,{accountId,eventId:'hunt-settlement'}).state;
const after=settled.account.weeklyOrders!.orders.find(row=>row.kind==='regional');
ok((after?.progress??0)>=4,'trusted Greenfields combat should advance the Greenfields Regional Problem');
mastered={...mastered,account:{...mastered.account,longTermAccountScopeId:accountId+'-mastered',weeklyOrders:masteredBoard}};const threatBefore=threat!.progress;let threatState=applyTrustedLongTermProgression(mastered,[{kind:'combat',contentId:'MOSS_RAT',units:4,startedAtMs:now-60_000}],undefined,now,{accountId:accountId+'-mastered',eventId:'normal-hunt'}).state;ok(threatState.account.weeklyOrders!.orders.find(row=>row.id===threat!.id)!.progress===threatBefore,'Normal hunt kills must not advance a Threat Bounty');const wrongTier=threat!.challengeId==='ferocious'?'hardened':'ferocious';threatState=applyTrustedLongTermProgression(threatState,[{kind:'combat',contentId:'MOSS_RAT',units:4,challengeId:wrongTier,startedAtMs:now-30_000}],undefined,now,{accountId:accountId+'-mastered',eventId:'wrong-tier'}).state;ok(threatState.account.weeklyOrders!.orders.find(row=>row.id===threat!.id)!.progress===threatBefore,'Wrong Challenge Hunt tier must not advance a Threat Bounty');threatState=applyTrustedLongTermProgression(threatState,[{kind:'combat',contentId:'MOSS_RAT',units:4,challengeId:threat!.challengeId,startedAtMs:now-10_000}],undefined,now,{accountId:accountId+'-mastered',eventId:'correct-tier'}).state;ok(threatState.account.weeklyOrders!.orders.find(row=>row.id===threat!.id)!.progress===Math.min(threat!.target,threatBefore+4),'Exact Challenge Hunt tier should advance its Threat Bounty');
console.log('PASS: Contract Board Hunt Orders, Work Orders, Regional Problems and Threat Bounties validate');
