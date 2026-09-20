import {createCharacter,newGame} from '../src/core/game';
import {weeklyOrderCandidatesFromCurrentContent} from '../src/core/launch-readiness-v47';
import {applyTrustedLongTermProgression,weeklyOrderBoardForState} from '../src/core/long-term-progression-runtime';
import {applyWeeklyOrderProgress,DEFAULT_WEEKLY_ORDER_POLICY,generateWeeklyOrders} from '../src/core/weekly-orders-v41';

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

const generated=generateWeeklyOrders(accountId,now,candidates);
const availableHunts=candidates.filter(row=>row.kind==='hunt'&&row.available&&row.source.available).length,availableProfessions=candidates.filter(row=>row.kind==='profession'&&row.available&&row.source.available).length,availableRegional=candidates.filter(row=>row.kind==='regional'&&row.available&&row.source.available).length;
ok(generated.orders.filter(row=>row.kind==='hunt').length===Math.min(DEFAULT_WEEKLY_ORDER_POLICY.huntSlots,availableHunts),'default board fills available Hunt Order slots');
ok(generated.orders.filter(row=>row.kind==='profession').length===Math.min(DEFAULT_WEEKLY_ORDER_POLICY.professionSlots,availableProfessions),'default board fills available Work Order slots');
ok(generated.orders.filter(row=>row.kind==='regional').length===Math.min(DEFAULT_WEEKLY_ORDER_POLICY.regionalSlots,availableRegional),'default board fills available Regional Problem slots');
const generatedRegional=generated.orders.find(row=>row.kind==='regional');ok(!!generatedRegional?.brief&&generatedRegional.reward.label.includes('Relief Cache'),'Generated Regional Problem should preserve authored brief and regional reward identity');

const regional=generated.orders.find(row=>row.kind==='regional')!;
const direct=applyWeeklyOrderProgress(generated,{eventId:'regional-progress',characterId:state.character!.id,kind:'regional',targetId:regional.targetId,amount:3,completedAtMs:now});
ok(direct.updated.length===1&&regional.progress===3,'Regional Problem progress should use the weekly order engine');

state={...state,account:{...state.account,longTermAccountScopeId:accountId,weeklyOrders:weeklyOrderBoardForState({...state,account:{...state.account,longTermAccountScopeId:accountId}},now)}};
const before=state.account.weeklyOrders!.orders.find(row=>row.kind==='regional');
ok(before?.targetId==='GREENFIELDS','level-one board should target the available Greenfields region');
const settled=applyTrustedLongTermProgression(state,[{kind:'combat',contentId:'MOSS_RAT',units:4,startedAtMs:now-60_000}],undefined,now,{accountId,eventId:'hunt-settlement'}).state;
const after=settled.account.weeklyOrders!.orders.find(row=>row.kind==='regional');
ok((after?.progress??0)>=4,'trusted Greenfields combat should advance the Greenfields Regional Problem');
console.log('PASS: Contract Board Hunt Orders, Work Orders and Regional Problems validate');
