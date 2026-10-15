import {createCharacter,newGame} from '../src/core/game';
import {campaignProgressSummary,dashboardRecommendation,homeSessionSummary} from '../src/core/dashboard';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)fail(message)}

let state=createCharacter(newGame(1),'IRONWARDEN','Guide Tester');
const first=dashboardRecommendation(state);
equal(first.destination,'World','first kill quest routes to World');
equal(first.zoneId,'GREENFIELDS','first hunt recommendation carries canonical region id');
ok(first.title.includes('A Name in the Ledger'),'first quest is named in Home guidance');
const lowFood={...createCharacter(newGame(1),'IRONWARDEN','Low Food'),inventory:{...state.inventory,stacks:[]}};
const lowFoodGuide=dashboardRecommendation(lowFood);
equal(lowFoodGuide.destination,'Skills','no carried or banked food routes to Fishing/Cooking');
ok(lowFoodGuide.title.includes('Restock combat sustain')&&lowFoodGuide.detail.includes('Healing companions help'),'low-food guidance teaches sustain loop and healer relationship');
const bankedFood={...lowFood,bank:{...lowFood.bank,stacks:[{itemId:'COOKED_MEADOW_PERCH',quantity:12}]}};
const bankedGuide=dashboardRecommendation(bankedFood);
equal(bankedGuide.destination,'Inventory','banked food routes to Inventory withdrawal');
ok(bankedGuide.button.includes('Withdraw'),'banked-food guidance exposes withdrawal action');

const firstSession=homeSessionSummary(state,Date.UTC(2026,8,22,12));
equal(firstSession.dailyReady,false,'Fresh session should keep Daily Supplies hidden until the guided skill milestone');
const dailyUnlockedState={...state,quests:state.quests.map(row=>row.questId==='QST_002'?{...row,status:'claimed' as const,progress:2}:row)};
const dailyUnlockedSession=homeSessionSummary(dailyUnlockedState,Date.UTC(2026,8,22,12));
ok(dailyUnlockedSession.dailyReady,'Completing QST_002 should expose the Daily Supplies claim immediately');
equal(dailyUnlockedSession.primaryReady?.kind,'daily','Daily Supplies becomes the primary ready action after its onboarding unlock when no story reward is waiting');
state={...state,character:{...state.character!,level:7},quests:state.quests.map(row=>row.questId==='QST_002'?{...row,status:'claimed' as const,progress:2}:row.questId==='QST_005'?{...row,status:'active' as const,progress:7}:{...row,status:'locked' as const,progress:0})};
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
