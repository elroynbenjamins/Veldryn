import {createCharacter,newGame} from '../src/core/game';
import {campaignProgressSummary,dashboardRecommendation,homeSessionSummary} from '../src/core/dashboard';
import {RECIPES} from '../src/content/skills';
import {recipePreparationRoute} from '../src/core/material-acquisition-plan';
import {recipePreparationGoalForRecipe} from '../src/core/recipe-preparation-goals';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)fail(message)}

let state=createCharacter(newGame(1),'IRONWARDEN','Guide Tester');
const first=dashboardRecommendation(state);
equal(first.destination,'World','first kill quest routes to World');
equal(first.zoneId,'GREENFIELDS','first hunt recommendation carries canonical region id');
ok(first.title.includes('A Name in the Ledger'),'first quest is named in Home guidance');

const firstSession=homeSessionSummary(state,Date.UTC(2026,8,22,12));
equal(firstSession.dailyReady,false,'Fresh session keeps Daily Supplies out of Home until its guided skill milestone');
equal(firstSession.primaryReady,undefined,'Fresh session stays focused when no unlocked reward is ready');
ok(firstSession.goalTotal===0&&firstSession.goalReady===0,'Home session priorities do not invent Working Toward progress');
const prepBase=createCharacter(newGame(2),'IRONWARDEN','Home Preparation');
const prepState={...prepBase,quests:prepBase.quests.map(row=>row.questId==='QST_002'?{...row,status:'claimed' as const,progress:2}:row),character:{...prepBase.character!,level:20,gold:100000},skills:prepBase.skills.map(skill=>skill.skillId==='smithing'?{...skill,level:12}:skill.skillId==='mining'?{...skill,level:8}:skill.skillId==='woodcutting'?{...skill,level:7}:skill)};
const prepRecipe=RECIPES.find(row=>row.id==='FORGE_REINFORCED_FITTING')!,prepRoute=recipePreparationRoute(prepState,prepRecipe,1),prepGoal=recipePreparationGoalForRecipe({state:prepState,recipe:prepRecipe,batches:1,initialStepCount:prepRoute.steps.length,nowMs:10});
const trackedHomeState={...prepState,character:{...prepState.character!,progressionGoals:[prepGoal]}};
const prepSession=homeSessionSummary(trackedHomeState,Date.UTC(2026,8,22,12));
ok(prepSession.goalNext?.includes('Aster-Iron Ore'),'Home session exposes the live tracked preparation next step');
equal(prepSession.goalNextStep,`Step 1/${prepRoute.steps.length}`,'Home session exposes exact Step X/Y preparation progress');
ok(!!prepSession.goalNextDestination&&prepSession.goalNextDestination.kind!=='info','Home session carries the exact actionable preparation destination');
equal(prepSession.goalNextBlocked,false,'Actionable tracked preparation is not mislabeled as blocked');
equal(prepSession.primaryReady?.kind,'daily','Higher-priority ready claims still outrank tracked preparation continuation');


state={...state,character:{...state.character!,level:7},quests:state.quests.map(row=>row.questId==='QST_005'?{...row,status:'active',progress:7}:row.questId==='QST_002'?{...row,status:'claimed' as const,progress:2}:{...row,status:'locked',progress:0})};
const storyReadyState={...state,quests:state.quests.map((row,index)=>index===0?{...row,status:'complete' as const,progress:5}:row)};
const storySession=homeSessionSummary(storyReadyState,Date.UTC(2026,8,22,12));
equal(storySession.primaryReady?.kind,'quests','Story rewards outrank Daily Supplies in Home ready-now priority');
ok(storySession.readyTotal>=2,'Home ready total can combine story and Daily Supplies attention without duplicating cards');
const storyNext=dashboardRecommendation(storyReadyState);ok(!storyNext.title.includes('reward ready'),'Home Next Step must remain progression guidance when Session Overview already owns a ready-now claim');
ok(storySession.weeklyRewards>=0&&storySession.forgeReady>=0&&storySession.companionAttention>=0,'Home session summary carries operational ready-now categories');

const levelGuide=dashboardRecommendation(state);
ok(levelGuide.title.includes('Into Ironwood'),'level-gated chapter is named explicitly');
ok(levelGuide.detail.includes('level 10'),'level-gated chapter shows target level');
ok(levelGuide.detail.includes('3 levels remaining'),'level-gated chapter shows remaining levels');
equal(levelGuide.destination,'World','level-gated chapter sends player toward XP activities');

const summary=campaignProgressSummary(state);
equal(summary.currentTitle,'Into Ironwood','campaign summary shows current chapter');
equal(summary.chapter,5,'campaign summary exposes chapter number');
equal(summary.level,7,'campaign summary exposes current level');
equal(summary.bossDefeated,false,'Fallen Knight starts incomplete');

const bossState={...state,defeatedBossIds:['FALLEN_KNIGHT'],character:{...state.character!,level:25},quests:state.quests.map(row=>({...row,status:'claimed' as const}))};
const complete=campaignProgressSummary(bossState);
equal(complete.claimed,complete.total,'complete campaign counts all claimed chapters');
equal(complete.bossDefeated,true,'campaign summary recognizes Fallen Knight victory');
equal(complete.bossReady,true,'level 25 meets Fallen Knight level readiness');

console.log('PASS: dashboard first-session and campaign guidance validate');
