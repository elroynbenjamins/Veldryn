import {createCharacter,newGame,BASE_OFFLINE_CAP_HOURS,MAX_OFFLINE_CAP_HOURS} from '../src/core/game';
import {grantProfessionMasteryToState,professionMasteryStateView} from '../src/core/profession-mastery-v40';
import {bestiaryProjection,BESTIARY_OWNS_PROGRESS} from '../src/core/bestiary-v40';
import {regionCompletionView} from '../src/core/region-completion-v40';
import {ensureWeeklyOrdersV41,recordWeeklyOrderProgressV41} from '../src/core/weekly-orders-v41';
import {evaluateIdleRuleSet,IDLE_RULES_CAN_AUTO_TRAVEL,IDLE_RULES_CAN_CHAIN_ACTIVITIES} from '../src/core/idle-rules-v40';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function eq(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

let state=createCharacter(newGame(0),'IRONWARDEN','Reconcile','male');
state=grantProfessionMasteryToState(state,'TEST_ACTION',120,1000);
ok(professionMasteryStateView(state,'TEST_ACTION').rank>0,'profession mastery should advance');
const bestiary=bestiaryProjection(state);
ok(bestiary.total>0,'bestiary should project current monster catalog');
eq(BESTIARY_OWNS_PROGRESS,false,'bestiary must stay a read model');
const region=regionCompletionView({regionId:'GREENFIELDS',name:'Greenfields',monsters:{done:1,total:3},mastery:{done:0,total:3},resources:{done:1,total:2},dungeons:{done:0,total:0},equipmentSets:{done:0,total:0},pets:{done:0,total:0},lore:{done:0,total:0}});
ok(region.percent>=0&&region.percent<=100,'region completion should remain bounded');
const weekly=ensureWeeklyOrdersV41(state,Date.UTC(2026,8,14));
eq(weekly.schemaVersion,41,'weekly orders should use v41 schema');
ok(weekly.orders.length<=4,'weekly board should remain light');
if(weekly.orders.length){
 const order=weekly.orders[0];
 const event={eventId:'reconcile-event',characterId:state.character!.id,kind:order.kind,targetId:order.targetId,amount:1,completedAtMs:weekly.startsAtMs+1000};
 const once=recordWeeklyOrderProgressV41({...state,account:{...state.account,weeklyOrdersV41:weekly}},event);
 const progress=once.account.weeklyOrdersV41!.orders.find(row=>row.id===order.id)!.progress;
 const twice=recordWeeklyOrderProgressV41(once,event);
 eq(twice.account.weeklyOrdersV41!.orders.find(row=>row.id===order.id)!.progress,progress,'weekly progress receipt should be idempotent');
}
const idle=evaluateIdleRuleSet({id:'stop',characterId:state.character!.id,name:'Stop at 1h',conditions:[{id:'duration',kind:'duration_seconds',value:3600,enabled:true}],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:true,finishCurrentCycle:true},{itemQuantities:{},skillLevels:{},monsterKills:{},foodRemaining:5,freeStorageSlots:10,elapsedSeconds:3600,projectedRewardFits:true});
ok(idle.shouldStop,'idle rule should stop when configured condition is met');
eq(IDLE_RULES_CAN_AUTO_TRAVEL,false,'idle rules must never auto travel');
eq(IDLE_RULES_CAN_CHAIN_ACTIVITIES,false,'idle rules must never chain activities');
eq(BASE_OFFLINE_CAP_HOURS,24,'offline base cap must remain 24h');
eq(MAX_OFFLINE_CAP_HOURS,36,'offline hard cap must remain 36h');
console.log('PASS: V40-V41 reconciliation primitives are active and preserve hard constraints');
