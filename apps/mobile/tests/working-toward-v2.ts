import {createCharacter,newGame} from '../src/core/game';
import {progressionGoalContext,progressionGoalDestination,workingTowardItemSourceEntries,workingTowardReadyCount,workingTowardTrackableItems} from '../src/core/working-toward';
import {MASTERY_GOAL_RANKS,masteryGoalForAction,nextMasteryGoalRank,normalizeProgressionGoals,progressionGoalView,recipePreparationGoal,type ProgressionGoal} from '../src/core/progression-goals-v40';
import {recipePreparationGoalRuntime,recipePreparationReadyCount} from '../src/core/recipe-preparation-tracking';

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

const copperSources=workingTowardItemSourceEntries(state,'COPPER_ORE');
ok(copperSources.some(source=>source.type==='gathering'&&source.typeLabel==='Gathering'),'Copper source presentation includes its authored gathering route');
ok(copperSources.some(source=>source.type==='monster_drop'&&source.typeLabel==='Monster Drop'),'Copper source presentation includes authored monster-drop alternatives');
ok(copperSources.find(source=>source.type==='gathering')?.destination.detail.includes('/action'),'Gathering source detail exposes authored per-action yield');
ok(copperSources.find(source=>source.type==='monster_drop')?.destination.detail.includes('% drop'),'Monster source detail exposes authored drop odds');
const catalystSources=workingTowardItemSourceEntries(state,'REGIONAL_CATALYST');
const catalystDungeons=catalystSources.filter(source=>source.type==='dungeon'),catalystCrafting=catalystSources.filter(source=>source.type==='crafting');
equal(catalystDungeons.length,6,'Regional Catalyst retains all six authoritative live dungeon sources');
equal(catalystCrafting.length,1,'Regional Catalyst adds exactly one Enchanting synthesis source');
ok(catalystDungeons.every(source=>source.typeLabel==='Dungeon'),'Dungeon material sources carry a distinct source type');
ok(catalystDungeons.every(source=>source.availability.status==='locked'),'Fresh characters see level-gated dungeon material sources as locked rather than falsely ready');
ok(catalystDungeons.every(source=>source.destination.detail.includes('% boss reward chance')),'Dungeon material source detail exposes the canonical boss reward chance');
ok(catalystCrafting[0]?.destination.detail.includes('Enchanting Lv 70'),'Catalyst synthesis source must expose its Enchanting level gate');

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
const prepState={...createCharacter(newGame(0),'IRONWARDEN','Preparation Tracker'),character:{...createCharacter(newGame(0),'IRONWARDEN','Preparation Tracker').character!,level:20,gold:100000}} as typeof state;
prepState.skills=prepState.skills.map(skill=>skill.skillId==='smithing'?{...skill,level:12}:skill.skillId==='mining'?{...skill,level:8}:skill.skillId==='woodcutting'?{...skill,level:7}:skill);
const prepGoal=recipePreparationGoal({characterId:prepState.character!.id,recipeId:'FORGE_REINFORCED_FITTING',recipeName:'Forge Reinforced Fitting',nowMs:456});
equal(normalizeProgressionGoals([prepGoal],prepState.character!.id)[0]?.kind,'recipe_preparation','Recipe preparation goals survive authoritative normalization');
const prepRuntime=recipePreparationGoalRuntime(prepState,prepGoal as Extract<ProgressionGoal,{kind:'recipe_preparation'}>);
equal(prepRuntime.status,'active','Unprepared tracked recipe stays active');
ok(prepRuntime.detail.startsWith('Next · '),'Tracked preparation exposes its live next dependency');
ok(prepRuntime.destination.kind!=='info','Tracked preparation next dependency remains actionable');
const readyPrepState={...prepState,inventory:{...prepState.inventory,stacks:[...prepState.inventory.stacks,{itemId:'ASTER_IRON_INGOT',quantity:2},{itemId:'IRONWOOD_LOG',quantity:2}]},character:{...prepState.character!,progressionGoals:[prepGoal]}} as typeof prepState;
const readyPrepRuntime=recipePreparationGoalRuntime(readyPrepState,prepGoal as Extract<ProgressionGoal,{kind:'recipe_preparation'}>);
equal(readyPrepRuntime.status,'complete','Tracked preparation becomes craft-ready when final inputs and Gold are ready');
equal(readyPrepRuntime.statusLabel,'CRAFT READY','Craft-ready tracked preparation gets a distinct status label');
if(readyPrepRuntime.destination.kind==='skills')equal(readyPrepRuntime.destination.recipeId,'FORGE_REINFORCED_FITTING','Craft-ready preparation deep-links the exact final recipe');
equal(recipePreparationReadyCount(readyPrepState),1,'Home ready summary counts craft-ready tracked preparation');
const poorPrepState={...readyPrepState,character:{...readyPrepState.character!,gold:0}};
const poorPrepRuntime=recipePreparationGoalRuntime(poorPrepState,prepGoal as Extract<ProgressionGoal,{kind:'recipe_preparation'}>);
equal(poorPrepRuntime.status,'blocked','Tracked preparation becomes blocked when only Gold remains');
ok(poorPrepRuntime.detail.includes('more Gold'),'Gold-blocked preparation explains the remaining Gold requirement');


state={...state,character:{...state.character!,progressionGoals:[{...skillGoal,targetLevel:1}]}};
const context=progressionGoalContext(state),view=progressionGoalView(state.character!.progressionGoals![0],context);
equal(view.status,'complete','completed goal is detected by the shared planner context');
equal(workingTowardReadyCount(state),1,'Home/Account attention detects a completed pinned goal');

console.log('PASS: actionable Working Toward navigation and progress');
