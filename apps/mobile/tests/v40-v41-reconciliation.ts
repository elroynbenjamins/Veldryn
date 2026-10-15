import {masteryPointsForRank,professionMasteryRank,professionMasteryView,grantProfessionMastery} from '../src/core/profession-mastery-v40';
import {professionMasteryActionDefinition,professionMasteryActionsForSkill} from '../src/core/profession-mastery-presentation';
import {createCharacter,newGame} from '../src/core/game';
import {regionCompletionView} from '../src/core/region-completion-v40';
import {evaluateIdleRuleSet,IDLE_RULES_CAN_AUTO_TRAVEL,IDLE_RULES_CAN_CHAIN_ACTIVITIES,type IdleRuleSet} from '../src/core/idle-rules-v40';
import {applyWeeklyOrderProgress,generateWeeklyOrders,weeklyOrderWindow,type WeeklyOrderCandidate} from '../src/core/weekly-orders-v41';
import {regionWeeklyOrderRows,weeklyOrderIdleCondition} from '../src/core/weekly-order-integrations-v41';

function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)throw new Error(message)}

equal(masteryPointsForRank(50),12750,'Mastery rank-50 curve');
equal(professionMasteryRank(masteryPointsForRank(10)),10,'Mastery rank lookup');
const mastery=professionMasteryView('IRON_VEIN',{actionId:'IRON_VEIN',points:masteryPointsForRank(40),updatedAtMs:0});
equal(mastery.yieldBonusBps,500,'Mastery yield cap at rank 40');
equal(grantProfessionMastery(undefined,'IRON_VEIN',25,10).points,25,'Mastery action grant');
const rawGemMasteryId='gem_refine:stat_might:g1',combineMasteryId='gem_combine:stat_might:g1';
const rawGemDefinition=professionMasteryActionDefinition(rawGemMasteryId),combineDefinition=professionMasteryActionDefinition(combineMasteryId);
equal(rawGemDefinition?.skillId,'enchanting','Gem refinement mastery resolves to Enchanting');
equal(rawGemDefinition?.speedRelevant,true,'Gem refinement mastery keeps timed speed bonuses relevant');
equal(rawGemDefinition?.yieldRelevant,false,'Gem refinement mastery must not gain duplicate gem yield');
equal(combineDefinition?.skillId,'enchanting','Gem combine mastery resolves to Enchanting');
let enchantingState=createCharacter(newGame(0),'IRONWARDEN','Mastery Tester');
enchantingState={...enchantingState,account:{...enchantingState.account,professionMasteryByAction:{
 [rawGemMasteryId]:{actionId:rawGemMasteryId,points:25,updatedAtMs:10},
 [combineMasteryId]:{actionId:combineMasteryId,points:10,updatedAtMs:10},
}}};
const enchantingActions=professionMasteryActionsForSkill(enchantingState,'enchanting');
ok(enchantingActions.some(row=>row.id===rawGemMasteryId)&&enchantingActions.some(row=>row.id===combineMasteryId),'Trained gem forge actions remain visible in Enchanting mastery');
ok(enchantingActions.filter(row=>row.id.startsWith('gem_')).every(row=>row.points>0),'Untrained gem-family mastery actions must not flood the skill view');

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
const stop=weeklyOrderIdleCondition(first);equal(stop.kind,'weekly_order_progress','Weekly order idle stop projection');
const beforePercent=completion.percent;const rows=regionWeeklyOrderRows('R',board);ok(rows.length>0,'Region can show weekly orders');equal(completion.percent,beforePercent,'Weekly orders do not change permanent completion');

console.log('PASS: reconciled V40/V41 profession mastery, region completion, stop-only idle rules, and weekly orders');
