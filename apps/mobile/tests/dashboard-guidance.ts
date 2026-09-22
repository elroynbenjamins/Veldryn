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

const firstSession=homeSessionSummary(state,Date.UTC(2026,8,22,12));
ok(firstSession.dailyReady,'Fresh session exposes the Daily Supplies claim in Home session priorities');
equal(firstSession.primaryReady?.kind,'daily','Daily Supplies becomes the primary ready action when no story reward is waiting');
ok(firstSession.goalTotal===0&&firstSession.goalReady===0,'Home session priorities do not invent Working Toward progress');

state={...state,character:{...state.character!,level:7},quests:state.quests.map(row=>row.questId==='QST_005'?{...row,status:'active',progress:7}:{...row,status:'locked',progress:0})};
const storyReadyState={...state,quests:state.quests.map((row,index)=>index===0?{...row,status:'complete' as const,progress:5}:row)};
const storySession=homeSessionSummary(storyReadyState,Date.UTC(2026,8,22,12));
equal(storySession.primaryReady?.kind,'quests','Story rewards outrank Daily Supplies in Home ready-now priority');
ok(storySession.readyTotal>=2,'Home ready total can combine story and Daily Supplies attention without duplicating cards');

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
