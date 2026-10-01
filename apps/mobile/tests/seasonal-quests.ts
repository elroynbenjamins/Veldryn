import {claimActivity,claimSeasonalContract,createCharacter,newGame,startCombat,startGathering,startExploration,craftRecipe} from '../src/core/game';
import {QUEST_RARITIES,seasonalQuestBoard,recordSeasonalActivity,normalizeSeasonalProgress} from '../src/core/seasonal-quests';
import {normalizeSave} from '../src/core/save-normalization';
import {CLASSES} from '../src/content/classes';
import type {GameState} from '../src/core/types';
import {executeGameCommand} from '../src/core/game-commands';
const state=createCharacter(newGame(0),'BASTION','Tester');
const date=new Date('2026-09-05T12:00:00Z'),daily=seasonalQuestBoard(state,'daily',date),a=seasonalQuestBoard(state,'weekly',date),b=seasonalQuestBoard(state,'weekly',date),m=seasonalQuestBoard(state,'monthly',date);
if(daily.length!==2||a.length!==3||m.length!==4)throw new Error('Seasonal board sizes are incorrect');
if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('Same seasonal period must be deterministic');
if(a.some(q=>q.className!=='Bastion'||!q.id.startsWith('WEEKLY_')))throw new Error('Class-aligned weekly quests missing');
if(m.some(q=>q.rewardGold<=a[0].rewardGold))throw new Error('Monthly rewards should exceed weekly rewards');
if([...daily,...a,...m].some(q=>!QUEST_RARITIES[q.rarity]||q.rewardGold<=0||q.rewardXp<=0||q.rewardItemQty<=0||!q.rewardItemId))throw new Error('Contracts require a valid rarity reward structure');
if(daily.some(q=>q.rarity==='epic'||q.rarity==='legendary')||m.some(q=>q.rarity==='common'||q.rarity==='uncommon'))throw new Error('Period rarity pools are incorrect');
const complete={...state,character:{...state.character!,xp:100000,equipment:{weapon:'basic_sword',helmet:'ASTER_IRON_HELM',chest:'ASTER_IRON_CHEST',legs:'ASTER_IRON_LEGS',boots:'ASTER_IRON_BOOTS',gloves:'ASTER_IRON_GLOVES'},craftedNoviceItemIds:['a','b','c','d','e','f','g']},skills:state.skills.map(skill=>({...skill,xp:10000,level:20})),unlockedMonsterIds:['MOSS_RAT','FIELD_WISP','ROADSIDE_BOAR','SILVERFIN_SWARM','IRONWOOD_WOLF','VENOM_WEAVER','THORNLING']};
if(seasonalQuestBoard(complete,'daily',date)[0].progress!==0)throw new Error('Lifetime XP must not complete a new combat contract');
const earned=recordSeasonalActivity(complete,'combat',100,date.getTime());
const ready=seasonalQuestBoard(earned,'daily',date)[0];
const claimed=claimSeasonalContract(earned,'daily',ready.id,date.getTime());
if(claimed.character!.gold!==complete.character!.gold+ready.rewardGold||claimed.character!.xp!==complete.character!.xp+ready.rewardXp||!claimed.account.seasonalContractClaimIds?.includes(ready.id))throw new Error('Contract claim must award and persist exactly once');
let duplicateRejected=false;try{claimSeasonalContract(claimed,'daily',ready.id,date.getTime())}catch{duplicateRejected=true}if(!duplicateRejected)throw new Error('Contract cache cannot be claimed twice');
const other=seasonalQuestBoard(createCharacter(newGame(0),'WAYFINDER','Scout'),'weekly',date);
if(JSON.stringify(a.map(q=>q.name))===JSON.stringify(other.map(q=>q.name)))throw new Error('Class layouts should differ');
console.log('PASS: deterministic class-aligned weekly and monthly quest boards');

function check(value:unknown,message:string){if(!value)throw new Error(message);}
const t=date.getTime();
for(const classDef of CLASSES){
 const s=createCharacter(newGame(t),classDef.id,'Equipment test');
 for(const period of ['daily','weekly','monthly'] as const){
  for(const quest of seasonalQuestBoard(s,period,date))if(quest.tag==='equipment')check(quest.required<=10,'Equipment objective exceeds ten slots');
 }
}
const tomorrow=new Date('2026-09-06T12:00:00Z'),monday=new Date('2026-09-07T12:00:00Z'),nextMonth=new Date('2026-10-01T12:00:00Z');
check(seasonalQuestBoard(earned,'daily',tomorrow)[0].progress===0,'Daily progress must expire without a write');
check(seasonalQuestBoard(earned,'weekly',monday)[0].progress===0,'Weekly progress must expire on Monday UTC');
check(seasonalQuestBoard(earned,'monthly',nextMonth)[0].progress===0,'Monthly progress must expire');
const rolled=recordSeasonalActivity(earned,'combat',1,tomorrow.getTime());
check(rolled.account.seasonalContractProgress?.daily?.counts.combat===1,'Next day must start from zero');
check(rolled.account.seasonalContractProgress?.weekly?.counts.combat===101,'Same week must retain progress');
check(rolled.account.seasonalContractProgress?.monthly?.counts.combat===101,'Same month must retain progress');
check(earned.account.seasonalContractProgress?.daily?.counts.combat===100,'Recording must not mutate prior saves');
check(JSON.stringify(normalizeSave(rolled).account.seasonalContractProgress)===JSON.stringify(rolled.account.seasonalContractProgress),'Counters must survive save normalization');
check(Object.keys(normalizeSave(state).account.seasonalContractProgress??{}).length===0,'Legacy saves must not gain unearned progress');
check(normalizeSeasonalProgress({daily:{key:'2026-09-05',counts:{combat:NaN,crafting:-1,gathering:Infinity,exploration:2.9}}}).daily?.counts.exploration===2,'Normalize persisted counters');
let rejected=false;try{claimSeasonalContract(earned,'daily',ready.id,tomorrow.getTime());}catch{rejected=true;}check(rejected,'Expired contracts cannot be claimed');
check(seasonalQuestBoard(claimed,'daily',date)[0].progress===ready.progress,'Quest reward XP must not create combat progress');

const fighting=startCombat(createCharacter(newGame(t),'BASTION','Fighter'),'MOSS_RAT',t);
const settled=claimActivity(fighting,t+60000);
check(settled.reward.kills>0&&settled.state.account.seasonalContractProgress?.daily?.counts.combat===settled.reward.kills,'Actual combat must credit kills, not XP');
const repeated=claimActivity(settled.state,t+60000);
check(repeated.state.account.seasonalContractProgress?.daily?.counts.combat===settled.reward.kills,'Repeated settlement must not double credit');
const scouting=startExploration(createCharacter(newGame(t),'WAYFINDER','Scout'),'SCOUT_GREENFIELDS',t);
const explored=claimActivity(scouting,t+120000);
check(explored.reward.kills>0&&explored.state.account.seasonalContractProgress?.daily?.counts.exploration===explored.reward.kills,'Exploration credits repeatable route actions');
check(!explored.state.account.seasonalContractProgress?.daily?.counts.gathering,'Exploration is not gathering');
const gathering=startGathering(createCharacter(newGame(t),'HEXWEAVER','Gatherer'),'GREENWOOD_TREE',t);
const gathered=claimActivity(gathering,t+120000);
check(gathered.reward.kills>0&&gathered.state.account.seasonalContractProgress?.daily?.counts.gathering===gathered.reward.kills,'Gathering credits actual actions');
const crafter:GameState={...state,character:{...state.character!,gold:10000},bank:{...state.bank,stacks:[{itemId:'MEADOW_PERCH',quantity:100},{itemId:'GREENWOOD_LOG',quantity:10}]}};
const cooked=craftRecipe(crafter,'COOK_MEADOW_PERCH',t);
check(cooked.account.seasonalContractProgress?.daily?.counts.crafting===1,'A completed recipe must count as a craft');
const monthlyReady=seasonalQuestBoard(earned,'monthly',date)[0];
const unlocked:GameState={...earned,character:{...earned.character!,equipment:state.character!.equipment},quests:earned.quests.map(q=>q.questId==='QST_005'?{...q,status:'claimed'}:q)};
const monthlyClaim=executeGameCommand(unlocked,{type:'seasonal',args:{period:'monthly',id:monthlyReady.id}},t).state;
check(monthlyClaim.account.seasonalContractClaimIds?.includes(monthlyReady.id),'Monthly claims must work through the command dispatcher');
console.log('PASS: seasonal action accounting, UTC rollovers, equipment limits, claims and save round trips');
