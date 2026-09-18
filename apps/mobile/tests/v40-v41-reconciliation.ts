import {masteryPointsForRank,professionMasteryRank,professionMasteryView,grantProfessionMastery} from '../src/core/profession-mastery-v40';
import {progressionGoalView,validateProgressionGoals,type ProgressionGoal} from '../src/core/progression-goals-v40';
import {regionCompletionView} from '../src/core/region-completion-v40';
import {evaluateIdleRuleSet,IDLE_RULES_CAN_AUTO_TRAVEL,IDLE_RULES_CAN_CHAIN_ACTIVITIES,type IdleRuleSet} from '../src/core/idle-rules-v40';
import {applyWeeklyOrderProgress,generateWeeklyOrders,weeklyOrderWindow,type WeeklyOrderCandidate} from '../src/core/weekly-orders-v41';
import {regionWeeklyOrderRows,weeklyOrderGoal,weeklyOrderIdleCondition} from '../src/core/weekly-order-integrations-v41';

function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)throw new Error(message)}

equal(masteryPointsForRank(50),12750,'Mastery rank-50 curve');
equal(professionMasteryRank(masteryPointsForRank(10)),10,'Mastery rank lookup');
const mastery=professionMasteryView('IRON_VEIN',{actionId:'IRON_VEIN',points:masteryPointsForRank(40),updatedAtMs:0});
equal(mastery.yieldBonusBps,500,'Mastery yield cap at rank 40');
equal(grantProfessionMastery(undefined,'IRON_VEIN',25,10).points,25,'Mastery action grant');

const goal:ProgressionGoal={id:'g1',characterId:'c1',kind:'skill_level',title:'Mining 20',createdAtMs:0,pinnedAtMs:0,skillId:'mining',targetLevel:20};
const view=progressionGoalView(goal,{skillLevels:{mining:18},skillXp:{mining:8000},skillXpTarget:{'mining:20':10000},itemQuantities:{},recipeCraftCounts:{},monsterKills:{},ownedPetIds:{},craftedSetPieceCounts:{},dungeonClears:{},masteryPoints:{},rates:{skillXpPerHour:{mining:1000}}});
equal(view.etaSeconds,7200,'Goal ETA');
let threw=false;try{validateProgressionGoals([goal,{...goal,id:'g2'},{...goal,id:'g3'},{...goal,id:'g4'}],'c1')}catch{threw=true}ok(threw,'Pinned goals must cap at 3');

const completion=regionCompletionView({regionId:'R',name:'Region',monsters:{done:10,total:10},mastery:{done:5,total:10},resources:{done:5,total:10},dungeons:{done:2,total:4},equipmentSets:{done:0,total:0},pets:{done:1,total:2},lore:{done:2,total:4}});
ok(completion.percent>50&&completion.percent<100,'Weighted region completion');
ok(completion.reachedMilestones.includes(50),'Region milestone');

const rules:IdleRuleSet={id:'r1',characterId:'c1',name:'Stop at 500',conditions:[{id:'q',kind:'item_quantity',targetId:'ORE',value:500,enabled:true}],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:true,finishCurrentCycle:true};
const safety=evaluateIdleRuleSet(rules,{itemQuantities:{ORE:500},skillLevels:{},monsterKills:{},foodRemaining:0,freeStorageSlots:10,elapsedSeconds:0,projectedRewardFits:true});
ok(safety.safety,'Safety condition wins');
equal(IDLE_RULES_CAN_AUTO_TRAVEL,false,'Idle rules cannot auto travel');
equal(IDLE_RULES_CAN_CHAIN_ACTIVITIES,false,'Idle rules cannot chain');

const week=weeklyOrderWindow(Date.UTC(2026,8,17,12));
equal(week.startsAtMs,Date.UTC(2026,8,14),'Weekly orders reset Monday 00:00 UTC');
const candidates:WeeklyOrderCandidate[]=[
 {id:'wolf',kind:'hunt',title:'Cull Wolves',monsterId:'WOLF',regionId:'R',activityId:'hunt:WOLF',source:{kind:'monster',id:'WOLF',label:'Hunt',available:true},estimatedPerHour:120,available:true,priority:10},
 {id:'boar',kind:'hunt',title:'Cull Boars',monsterId:'BOAR',regionId:'R',activityId:'hunt:BOAR',source:{kind:'monster',id:'BOAR',label:'Hunt',available:true},estimatedPerHour:90,available:true,priority:20},
 {id:'iron',kind:'profession',title:'Mine Iron',actionId:'IRON',professionKind:'gathering',regionId:'R',activityId:'IRON',source:{kind:'skill',id:'mining',label:'Mine',available:true},estimatedPerHour:240,available:true,priority:10},
 {id:'stew',kind:'profession',title:'Cook Stew',actionId:'STEW',professionKind:'cooking',regionId:'R',activityId:'STEW',source:{kind:'recipe',id:'STEW',label:'Cook',available:true},estimatedPerHour:80,available:true,priority:20},
];
const board=generateWeeklyOrders('acct',Date.UTC(2026,8,17,12),candidates);
equal(board.orders.length,4,'Default board is 2 Hunt + 2 Profession');
const first=board.orders[0];applyWeeklyOrderProgress(board,{eventId:'evt',characterId:'c2',kind:first.kind,targetId:first.targetId,amount:first.target,completedAtMs:Date.UTC(2026,8,18)});
equal(first.progress,first.target,'Any character can contribute account-wide');
const orderGoal=weeklyOrderGoal(first,'c1',Date.UTC(2026,8,18));equal(orderGoal.kind,'weekly_order','Weekly order goal projection');
const stop=weeklyOrderIdleCondition(first);equal(stop.kind,'weekly_order_progress','Weekly order idle stop projection');
const beforePercent=completion.percent;const rows=regionWeeklyOrderRows('R',board);ok(rows.length>0,'Region can show weekly orders');equal(completion.percent,beforePercent,'Weekly orders do not change permanent completion');

console.log('PASS: reconciled V40/V41 goals, profession mastery, region completion, stop-only idle rules, and weekly orders');
