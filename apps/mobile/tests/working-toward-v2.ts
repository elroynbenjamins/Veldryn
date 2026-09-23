import {createCharacter,newGame} from '../src/core/game';
import {progressionGoalContext,progressionGoalDestination,workingTowardItemSourceEntries,workingTowardReadyCount,workingTowardTrackableItems} from '../src/core/working-toward';
import {MASTERY_GOAL_RANKS,masteryGoalForAction,nextMasteryGoalRank,normalizeProgressionGoals,progressionGoalView,type ProgressionGoal} from '../src/core/progression-goals-v40';
import {RECIPES} from '../src/content/skills';
import {totalXpAtLevel} from '../src/core/progression';
import {recipePreparationRoute} from '../src/core/material-acquisition-plan';
import {recipePreparationGoalForRecipe} from '../src/core/recipe-preparation-goals';
import {recipePreparationTrackingView} from '../src/core/recipe-preparation-tracking';

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

state={...state,character:{...state.character!,progressionGoals:[{...skillGoal,targetLevel:1}]}};
const context=progressionGoalContext(state),view=progressionGoalView(state.character!.progressionGoals![0],context);
equal(view.status,'complete','completed goal is detected by the shared planner context');
equal(workingTowardReadyCount(state),1,'Home/Account attention detects a completed pinned goal');

let prepState=createCharacter(newGame(500),'IRONWARDEN','Preparation Tracker');
prepState={...prepState,character:{...prepState.character!,level:20,gold:100000},skills:prepState.skills.map(skill=>skill.skillId==='smithing'?{...skill,level:12,xp:totalXpAtLevel(12)}:skill.skillId==='mining'?{...skill,level:8,xp:totalXpAtLevel(8)}:skill.skillId==='woodcutting'?{...skill,level:7,xp:totalXpAtLevel(7)}:skill)};
const fittingRecipe=RECIPES.find(row=>row.id==='FORGE_REINFORCED_FITTING')!,initialRoute=recipePreparationRoute(prepState,fittingRecipe,1);
const preparationGoal=recipePreparationGoalForRecipe({state:prepState,recipe:fittingRecipe,batches:1,initialStepCount:initialRoute.steps.length,nowMs:600});
const normalizedPreparation=normalizeProgressionGoals([preparationGoal],prepState.character!.id)[0];
equal(normalizedPreparation.kind,'recipe_preparation','Preparation goal must survive save/command normalization');
if(normalizedPreparation.kind==='recipe_preparation'){equal(normalizedPreparation.initialStepCount,initialRoute.steps.length,'Preparation goal retains its initial route size');equal(normalizedPreparation.outputItemId,'REINFORCED_FITTING','Preparation goal retains its tracked output');}
prepState={...prepState,character:{...prepState.character!,progressionGoals:[preparationGoal]}};
const initialPrepView=recipePreparationTrackingView(prepState,preparationGoal);
ok(initialPrepView.status==='active'&&initialPrepView.nextLabel.includes('Aster-Iron Ore'),'Tracked preparation starts on the first remaining dependency');
ok(initialPrepView.destination.kind!=='info','Tracked preparation next step must be directly navigable when its source is actionable');

prepState={...prepState,inventory:{...prepState.inventory,stacks:[...prepState.inventory.stacks,{itemId:'ASTER_IRON_INGOT',quantity:2},{itemId:'IRONWOOD_LOG',quantity:2}]}};
const finalPrepView=recipePreparationTrackingView(prepState,preparationGoal);
equal(finalPrepView.current,Math.max(0,preparationGoal.initialStepCount-1),'Owning prerequisites advances preparation progress to the final tracked craft');
ok(finalPrepView.nextLabel.includes('Reinforced Fitting')&&finalPrepView.destination.kind==='skills','Preparation tracking automatically advances to the final craft');

prepState={...prepState,inventory:{...prepState.inventory,stacks:[...prepState.inventory.stacks,{itemId:'REINFORCED_FITTING',quantity:1}]}};
const completedPrepView=recipePreparationTrackingView(prepState,preparationGoal);
ok(completedPrepView.status==='complete'&&completedPrepView.progress===1,'Preparation goal completes only after the tracked output is actually produced');
equal(workingTowardReadyCount(prepState),1,'Completed preparation goal contributes to Home Working Toward ready count');


console.log('PASS: actionable Working Toward navigation and progress');
