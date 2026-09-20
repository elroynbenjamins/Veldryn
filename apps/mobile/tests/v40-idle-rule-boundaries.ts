import {claimActivity,createCharacter,newGame,startCombat,startGathering,BASE_OFFLINE_CAP_HOURS,MAX_OFFLINE_CAP_HOURS} from '../src/core/game';
import {totalXpAtLevel} from '../src/core/progression';
import type {GameState} from '../src/core/types';
import type {IdleStopCondition,IdleRuleSet} from '../src/core/idle-rules-v40';
import {DEFAULT_WEEKLY_ORDER_POLICY,generateWeeklyOrders,type WeeklyOrderCandidate} from '../src/core/weekly-orders-v41';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function eq(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
const T0=Date.UTC(2026,8,14,12);

function base(){
 let state=createCharacter(newGame(T0),'IRONWARDEN','IdleBoundary','male');
 return state;
}
function withRule(state:GameState,condition:IdleStopCondition,options?:Partial<Pick<IdleRuleSet,'stopIfOutOfFood'|'stopIfRewardsWouldOverflow'>>){
 const rule:IdleRuleSet={id:'boundary',characterId:state.character!.id,name:'Boundary',conditions:[condition],stopIfOutOfFood:options?.stopIfOutOfFood??true,stopIfRewardsWouldOverflow:options?.stopIfRewardsWouldOverflow??true,finishCurrentCycle:true};
 return {...state,character:{...state.character!,idleRulesV40:[rule],activeIdleRuleIdV40:rule.id}};
}

// Item quantity: stop on the first Greenwood Log-producing cycle.
{
 let state=base();
 state=withRule(state,{id:'logs',kind:'item_quantity',targetId:'GREENWOOD_LOG',value:1,enabled:true});
 state=startGathering(state,'GREENWOOD_TREE',T0+1000);
 const result=claimActivity(state,T0+6*3600_000);
 eq(result.state.activity,null,'item quantity rule should stop gathering');
 eq(result.reward.kills,1,'item quantity rule should settle at first producing cycle');
 ok(result.reward.items.some(row=>row.itemId==='GREENWOOD_LOG'&&row.quantity>=1),'item quantity reward should include target item');
}

// Skill level: put Woodcutting one XP below level 2; the first action must stop it.
{
 let state=base();
 const targetXp=totalXpAtLevel(2);
 state={...state,skills:state.skills.map(row=>row.skillId==='woodcutting'?{...row,xp:targetXp-1,level:1}:row)};
 state=withRule(state,{id:'woodcutting-2',kind:'skill_level',targetId:'woodcutting',value:2,enabled:true});
 state=startGathering(state,'GREENWOOD_TREE',T0+2000);
 const result=claimActivity(state,T0+6*3600_000);
 eq(result.state.activity,null,'skill level rule should stop gathering');
 eq(result.reward.kills,1,'skill level rule should stop on the first action that reaches target');
 eq(result.state.skills.find(row=>row.skillId==='woodcutting')?.level,2,'woodcutting should reach level 2');
}

// Monster kills: stop at exactly two trusted kills.
{
 let state=base();
 state=withRule(state,{id:'moss-2',kind:'monster_kills',targetId:'MOSS_RAT',value:2,enabled:true});
 state=startCombat(state,'MOSS_RAT',T0+3000);
 const result=claimActivity(state,T0+6*3600_000);
 eq(result.state.activity,null,'monster kill rule should stop combat');
 eq(result.reward.kills,2,'monster kill rule should settle on the second kill');
}

// Weekly Order: a matching Hunt Order should stop exactly when its target completes.
{
 let state=base();
 const candidate:WeeklyOrderCandidate={id:'moss-weekly',kind:'hunt',title:'Moss Rat Order',monsterId:'MOSS_RAT',regionId:'GREENFIELDS',activityId:'MOSS_RAT',source:{kind:'monster',id:'MOSS_RAT',label:'Moss Rat',available:true},estimatedPerHour:60,available:true,priority:1};
 const weekly=generateWeeklyOrders('account-test',T0,[candidate],{...DEFAULT_WEEKLY_ORDER_POLICY,huntSlots:1,professionSlots:0,regionalSlots:0,huntTargetMinutes:1,minimumHuntTarget:1,defaultHuntReward:{rewardRef:'hunt',label:'Hunt'},defaultProfessionReward:{rewardRef:'profession',label:'Profession'},completionReward:{rewardRef:'completion',label:'Completion'}});
 const order=weekly.orders[0];order.target=1;
 state={...state,account:{...state.account,weeklyOrders:weekly}};
 state=withRule(state,{id:'weekly',kind:'weekly_order_progress',targetId:order.id,value:1,enabled:true});
 state=startCombat(state,'MOSS_RAT',T0+4000);
 const result=claimActivity(state,T0+6*3600_000);
 eq(result.state.activity,null,'weekly order rule should stop combat');
 eq(result.reward.kills,1,'weekly order rule should settle on the completing kill');
 eq(result.state.account.weeklyOrders?.orders[0].progress,1,'weekly order should receive the trusted completing kill');
}

// Food threshold: with one ration and low HP, stop once the last carried food is consumed.
{
 let state=base();
 state={...state,settings:{...state.settings,autoEatThresholdPct:90},character:{...state.character!,currentHp:12},inventory:{...state.inventory,stacks:[{itemId:'TRAVEL_RATION',quantity:1}]}};
 state=withRule(state,{id:'food',kind:'food_below',value:0,enabled:true});
 state=startCombat(state,'MOSS_RAT',T0+5000);
 const result=claimActivity(state,T0+6*3600_000);
 eq(result.state.activity,null,'food threshold should stop combat');
 eq(result.state.inventory.stacks.find(row=>row.itemId==='TRAVEL_RATION')?.quantity??0,0,'food threshold should stop after the final ration is consumed');
}

// Free storage: one new stack reduces combined free Inventory+Bank slots from 120 to 119.
{
 let state=base();
 state={...state,inventory:{...state.inventory,capacity:1},bank:{...state.bank,capacity:120,stacks:[]}};
 state=withRule(state,{id:'slots',kind:'free_slots_below',value:119,enabled:true},{stopIfRewardsWouldOverflow:false});
 state=startGathering(state,'GREENWOOD_TREE',T0+6000);
 const result=claimActivity(state,T0+6*3600_000);
 eq(result.state.activity,null,'free-slot threshold should stop gathering');
 eq(result.reward.kills,1,'free-slot threshold should stop on first new storage stack');
}

eq(BASE_OFFLINE_CAP_HOURS,24,'Advanced Idle Rules must not alter 24h base reserve');
eq(MAX_OFFLINE_CAP_HOURS,36,'Advanced Idle Rules must not alter 36h hard maximum');
console.log('PASS: all V40 Advanced Idle Rule kinds stop at trusted settlement boundaries without extending Offline Reserve');
