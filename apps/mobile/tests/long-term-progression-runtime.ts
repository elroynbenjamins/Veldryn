import {createCharacter,newGame} from '../src/core/game';
import {applyTrustedLongTermProgression} from '../src/core/long-term-progression-runtime';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

let state=createCharacter(newGame(Date.UTC(2026,8,14)),'IRONWARDEN','ProgressionTester','male');
let first=applyTrustedLongTermProgression(state,[],undefined,Date.UTC(2026,8,14,0,1),{accountId:'acct-runtime',eventId:'setup'});
state=first.state;
ok(state.account.weeklyOrders?.orders.length===4,'Trusted runtime creates 2 Hunt + 2 Profession Weekly Orders');
ok(state.account.journalState?.schemaVersion===42,'Trusted runtime initializes Journal state');
const order=state.account.weeklyOrders!.orders[0];
const kind=order.kind==='hunt'?'combat':order.activityId.startsWith('CRAFT_')||order.targetId.startsWith('SMELT_')||order.targetId.startsWith('SMITH_')?'crafting':'gathering';
const units=order.target;
const progressed=applyTrustedLongTermProgression(state,[{kind,contentId:order.targetId,units,startedAtMs:Date.UTC(2026,8,14,0,1)}],{xp:500,gold:40,items:[{itemId:'GREENWOOD_LOG',quantity:10}],kills:units,elapsedSeconds:1800},Date.UTC(2026,8,14,0,31),{accountId:'acct-runtime',eventId:'settlement-1'});
state=progressed.state;
const updated=state.account.weeklyOrders!.orders.find(row=>row.id===order.id)!;
equal(updated.progress,updated.target,'Verified activity advances the matching Weekly Order');
ok(progressed.weeklyOrderCompletions.includes(order.id),'Weekly completion is detected once');
ok(state.account.weeklyOrderPendingRewards?.some(row=>row.orderId===order.id),'Weekly reward is queued automatically without a claim tap');
if(kind==='gathering'||kind==='crafting')ok((state.account.professionMasteryByAction?.[order.targetId]?.points??0)>=units,'Verified profession activity advances mastery');
if(kind==='combat')ok((state.account.longTermMetrics?.['combat.total_kills']??0)>=units,'Verified combat advances long-term kill metric');
ok((state.account.longTermMetrics?.['weekly_orders.completed']??0)>=1,'Weekly completion increments Journal metric');
ok(state.account.journalState?.records.most_xp_single_settlement?.value===500,'Trusted settlement updates Personal Records');
const duplicate=applyTrustedLongTermProgression(state,[{kind,contentId:order.targetId,units,startedAtMs:Date.UTC(2026,8,14,0,1)}],undefined,Date.UTC(2026,8,14,0,32),{accountId:'acct-runtime',eventId:'settlement-2'});
equal(duplicate.state.account.weeklyOrders!.orders.find(row=>row.id===order.id)!.progress,order.target,'Completed Weekly Order stays capped');
equal(duplicate.state.account.weeklyOrderPendingRewards?.filter(row=>row.orderId===order.id).length,1,'Weekly reward outbox remains unique');
console.log('PASS: trusted gameplay progression runtime advances mastery/orders/journal from verified activity');
