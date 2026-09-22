import {createCharacter,newGame} from '../src/core/game';
import {progressionGoalContext,progressionGoalDestination,workingTowardReadyCount,workingTowardTrackableItems} from '../src/core/working-toward';
import {MASTERY_GOAL_RANKS,masteryGoalForAction,nextMasteryGoalRank,progressionGoalView,type ProgressionGoal} from '../src/core/progression-goals-v40';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

let state=createCharacter(newGame(0),'IRONWARDEN','Planner Test');
const characterId=state.character!.id;

const skillGoal:ProgressionGoal={id:'goal-skill',characterId,kind:'skill_level',title:'Mining 10',createdAtMs:0,pinnedAtMs:0,skillId:'mining',targetLevel:10};
const skillDestination=progressionGoalDestination(state,skillGoal);
equal(skillDestination.kind,'skills','skill goal routes to Skills');
if(skillDestination.kind==='skills'){equal(skillDestination.mode,'gathering','Mining routes to gathering mode');equal(skillDestination.skillId,'mining','Mining remains selected');}

const huntGoal:ProgressionGoal={id:'goal-hunt',characterId,kind:'monster_kills',title:'Moss Rat kills',createdAtMs:0,pinnedAtMs:0,monsterId:'MOSS_RAT',targetKills:50};
const huntDestination=progressionGoalDestination(state,huntGoal);
equal(huntDestination.kind,'combat','monster kill goal routes to Combat');
if(huntDestination.kind==='combat'){equal(huntDestination.monsterId,'MOSS_RAT','exact monster is retained');equal(huntDestination.regionId,'GREENFIELDS','hunt goal identifies the correct travel region');}

const copper=workingTowardTrackableItems().find(item=>item.id==='COPPER_ORE');
ok(copper,'direct-source materials are authorable Working Toward items');
const itemGoal:ProgressionGoal={id:'goal-item',characterId,kind:'item_quantity',title:'Copper stockpile',createdAtMs:0,pinnedAtMs:0,itemId:'COPPER_ORE',targetQuantity:25};
const itemDestination=progressionGoalDestination(state,itemGoal);
equal(itemDestination.kind,'skills','gathered item goal routes to Skills');
if(itemDestination.kind==='skills'){equal(itemDestination.actionId,'COPPER_VEIN','item goal deep-links its gathering source');equal(itemDestination.regionId,'OLD_MINES','item source carries its region');}

const weeklyGoal:ProgressionGoal={id:'goal-weekly',characterId,kind:'weekly_order',title:'Weekly job',createdAtMs:0,pinnedAtMs:0,orderId:'example',targetProgress:10};
equal(progressionGoalDestination(state,weeklyGoal).kind,'contracts','weekly goal routes to Contract Board');

equal(nextMasteryGoalRank(0),10,'Untrained action mastery should suggest the first bonus rank');
equal(nextMasteryGoalRank(10),20,'R10 action mastery should suggest the next authored bonus rank');
equal(nextMasteryGoalRank(41),50,'Late action mastery should suggest R50 completion');
equal(MASTERY_GOAL_RANKS.join(','),'10,20,30,40,50','Working Toward mastery targets must stay aligned to authored bonus ranks');
const masteryGoal=masteryGoalForAction({characterId,actionId:'GREENWOOD_TREE',actionName:'Greenwood Tree',targetRank:20,nowMs:123});
equal(masteryGoal.kind,'mastery_rank','quick mastery tracking must create a mastery rank goal');
if(masteryGoal.kind==='mastery_rank'){equal(masteryGoal.actionId,'GREENWOOD_TREE','quick mastery goal retains its exact action');equal(masteryGoal.targetRank,20,'quick mastery goal retains the selected bonus rank');}
equal(progressionGoalDestination(state,masteryGoal).kind,'skills','mastery goals deep-link back into the profession action');

state={...state,character:{...state.character!,progressionGoals:[{...skillGoal,targetLevel:1}]}};
const context=progressionGoalContext(state),view=progressionGoalView(state.character!.progressionGoals![0],context);
equal(view.status,'complete','completed goal is detected by the shared planner context');
equal(workingTowardReadyCount(state),1,'Home/Account attention detects a completed pinned goal');

console.log('PASS: actionable Working Toward navigation and progress');
