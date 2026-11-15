import {claimActivity,claimSeasonalContract,createCharacter,newGame,startCombat,startGathering,startExploration,craftRecipe} from '../src/core/game';
import {QUEST_RARITIES,seasonalQuestBoard,seasonalQuestCache,recordSeasonalActivity,normalizeSeasonalProgress,seasonalQuestRewardOptions,SEASONAL_ACTIVITY_TAGS,recordSeasonalCraftProfession} from '../src/core/seasonal-quests';
import {FAITH_TIERS,HOLY_WATER_ID} from '../src/content/faith';
import {startFaithPractice} from '../src/core/faith';
import {itemDef} from '../src/content/items';
import {normalizeSave} from '../src/core/save-normalization';
import {CLASSES} from '../src/content/classes';
import type {GameState} from '../src/core/types';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
function creditAll(state:GameState,units:number,nowMs:number):GameState{
 return SEASONAL_ACTIVITY_TAGS.reduce((current,tag)=>recordSeasonalActivity(current,tag,units,nowMs),state);
}
const state=createCharacter(newGame(0),'BASTION','Tester');
const date=new Date('2026-09-05T12:00:00Z'),daily=seasonalQuestBoard(state,'daily',date),a=seasonalQuestBoard(state,'weekly',date),b=seasonalQuestBoard(state,'weekly',date),m=seasonalQuestBoard(state,'monthly',date);
if(daily.length!==2||a.length!==3||m.length!==4)throw new Error('Seasonal board sizes are incorrect');
if([...daily,...a,...m].some(q=>q.required<1))throw new Error('Seasonal targets must require positive verified actions');
if([...daily,...a,...m].some(q=>q.tag==='combat'&&q.required!==({daily:30,weekly:150,monthly:450}[q.period])))throw new Error('Combat goals should retain familiar pacing');
if([...daily,...a,...m].some(q=>q.tag==='crafting'&&q.required>=({daily:30,weekly:150,monthly:450}[q.period])))throw new Error('Crafting goals should be smaller than raw gathering goals');
if([daily,a,m].flat().some(row=>row.tag==='equipment'))throw new Error('Challenges must use completed actions, not equipment slot counts');
if([daily,a,m].flat().some(row=>row.tag==='boss'))throw new Error('Unprepared low-level players must never be assigned bosses');
if(SEASONAL_ACTIVITY_TAGS.some(tag=>['equipment','salvage','upgrade','high_tier_craft','trial','expedition'].includes(tag)))throw new Error('Removed equipment, Trial and Companion quest types must not appear in the available activity catalog');
if([daily,a,m].some(board=>new Set(board.map(q=>q.tag)).size!==board.length))throw new Error('One period must not duplicate an action type');
if(daily[0].rewardGold<60||a[0].rewardGold<260||m[0].rewardGold<660)throw new Error('Challenges should retain slightly improved but recognizable rewards');
if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('Same seasonal period must be deterministic');
if(a.some(q=>q.className!=='Adventurer'||!q.id.startsWith('WEEKLY_')))throw new Error('Shared weekly quests missing');
if(m.some(q=>q.rewardGold<=a[0].rewardGold))throw new Error('Monthly rewards should exceed weekly rewards');
if([...daily,...a,...m].some(q=>{
 const item=!!q.rewardItemId&&Number.isSafeInteger(q.rewardItemQty)&&q.rewardItemQty!>0;
 const essence=!q.rewardItemId&&Number.isSafeInteger(q.rewardCompanionEssence)&&q.rewardCompanionEssence!>0;
 return !QUEST_RARITIES[q.rarity]||q.rewardGold<=0||q.rewardXp<=0||!(item!==essence);
}))throw new Error('Contracts must award exactly one valid progression reward (Essence or equipment material)');
for(const q of [...daily,...a,...m])if(q.rewardItemId&&itemDef(q.rewardItemId).type!=='material')throw new Error('Contract reward must be an existing crafting or upgrade material');
const expectedCaches=[
 ['daily','common',5,undefined,undefined],['daily','uncommon',8,undefined,undefined],['daily','rare',undefined,'TEMPERING_DUST',8],
 ['weekly','uncommon',15,undefined,undefined],['weekly','rare',undefined,'TEMPERING_CORE',1],['weekly','epic',undefined,'ASTERFALL_MINERAL_ESSENCE',1],
 ['monthly','rare',35,undefined,undefined],['monthly','epic',undefined,'TEMPERING_CORE',2],['monthly','legendary',undefined,'TEMPERING_CORE',4],
] as const;
for(const [period,rarity,essence,itemId,qty] of expectedCaches){
 const reward=seasonalQuestCache(period,rarity);
 if(reward.rewardCompanionEssence!==essence||reward.rewardItemId!==itemId||reward.rewardItemQty!==qty)throw new Error('Unexpected quest reward balance: '+period+' '+rarity);
}
if(daily.some(q=>q.rarity==='epic'||q.rarity==='legendary')||m.some(q=>q.rarity==='common'||q.rarity==='uncommon'))throw new Error('Period rarity pools are incorrect');
const complete={...state,character:{...state.character!,xp:100000,equipment:{weapon:'basic_sword',helmet:'ASTER_IRON_HELM',chest:'ASTER_IRON_CHEST',legs:'ASTER_IRON_LEGS',boots:'ASTER_IRON_BOOTS',gloves:'ASTER_IRON_GLOVES'},craftedNoviceItemIds:['a','b','c','d','e','f','g']},skills:state.skills.map(skill=>({...skill,xp:10000,level:20})),unlockedMonsterIds:['MOSS_RAT','FIELD_WISP','ROADSIDE_BOAR','SILVERFIN_SWARM','IRONWOOD_WOLF','VENOM_WEAVER','THORNLING']};
if(seasonalQuestBoard(complete,'daily',date)[0].progress!==0)throw new Error('Lifetime XP must not complete a new combat contract');
const earned=creditAll(complete,100,date.getTime());
const earlyLevelOne=creditAll(state,500,date.getTime());
const levelOneWeekly=seasonalQuestBoard(earlyLevelOne,'weekly',date)[0];
if(levelOneWeekly.progress<levelOneWeekly.required||earlyLevelOne.quests.some(q=>q.questId==='QST_005'&&q.status==='claimed'))throw new Error('The test requires a completed weekly challenge without the Contract Board unlock');
const earlyWeekly=executeGameCommand(earlyLevelOne,{type:'seasonal',args:{period:'weekly',id:levelOneWeekly.id}},date.getTime()).state;
if(!earlyWeekly.account.seasonalContractClaimIds?.includes(levelOneWeekly.id)||earlyWeekly.character!.gold!==earlyLevelOne.character!.gold+levelOneWeekly.rewardGold||earlyWeekly.character!.xp!==earlyLevelOne.character!.xp+levelOneWeekly.rewardXp)throw new Error('Weekly rarity cache must be claimable before QST_005 and award the exact rewards');
let secondWeeklyRejected=false;try{executeGameCommand(earlyWeekly,{type:'seasonal',args:{period:'weekly',id:levelOneWeekly.id}},date.getTime())}catch(e){secondWeeklyRejected=e instanceof Error&&e.message==='This contract reward was already claimed.'}
if(!secondWeeklyRejected)throw new Error('Online command must reject duplicate early weekly cache claims');
const ready=seasonalQuestBoard(earned,'daily',date)[0];
const sourceEssence=earned.account.companionEssence??0;
const claimed=claimSeasonalContract(earned,'daily',ready.id,date.getTime());
if(claimed.character!.gold!==complete.character!.gold+ready.rewardGold||claimed.character!.xp!==complete.character!.xp+ready.rewardXp||!claimed.account.seasonalContractClaimIds?.includes(ready.id))throw new Error('Contract claim must award and persist exactly once');
if((claimed.account.companionEssence??0)!==sourceEssence+(ready.rewardCompanionEssence??0))throw new Error('Contract must credit exactly the previewed Companion Essence');
let duplicateRejected=false;try{claimSeasonalContract(claimed,'daily',ready.id,date.getTime())}catch{duplicateRejected=true}if(!duplicateRejected)throw new Error('Contract cache cannot be claimed twice');
// Find an actual earned Essence reward, then verify exact account credit and claim persistence.
let verifiedEssenceClaim=false;
for(let day=1;day<=20;day++){
 const dateWithEssence=new Date(Date.UTC(2026,8,day,12));
 const withProgress=creditAll(state,1000,dateWithEssence.getTime());
 const essenceContract=seasonalQuestBoard(withProgress,'daily',dateWithEssence).find(q=>!!q.rewardCompanionEssence&&q.progress>=q.required);
 if(!essenceContract)continue;
 const before=withProgress.account.companionEssence??0;
 const credited=claimSeasonalContract(withProgress,'daily',essenceContract.id,dateWithEssence.getTime());
 if((credited.account.companionEssence??0)!==before+essenceContract.rewardCompanionEssence!)
  throw new Error('Essence-only quest rewards must reach the account rather than inventory');
 if(!normalizeSave(credited).account.seasonalContractClaimIds?.includes(essenceContract.id))
  throw new Error('Claim receipt must survive save normalization');
 let rejected=false;try{claimSeasonalContract(credited,'daily',essenceContract.id,dateWithEssence.getTime());}catch{rejected=true}
 if(!rejected)throw new Error('Already-claimed Essence rewards must not be granted again');
 verifiedEssenceClaim=true;
 break;
}
if(!verifiedEssenceClaim)throw new Error('Test must find at least one earned Essence quest to verify actual account settlement');
const other=seasonalQuestBoard(createCharacter(newGame(0),'WAYFINDER','Scout'),'weekly',date);
if(JSON.stringify(a.map(q=>[q.rarity,q.rewardGold]))!==JSON.stringify(other.map(q=>[q.rarity,q.rewardGold])))throw new Error('Quest rarity and cache quality must be class-independent');
// New objectives use the exact paid/settled operation; raw XP and equipped slots never count.
const highLevel={...state,character:{...state.character!,level:70,equipment:{...state.character!.equipment,weapon:'basic_sword'}},defeatedBossIds:['FALLEN_KNIGHT'],skills:state.skills.map(x=>({...x,level:70}))} as GameState;
const forbiddenTags=new Set(['equipment','salvage','upgrade','high_tier_craft','trial','expedition']);
for(let day=1;day<=35;day++){
 const dt=new Date(Date.UTC(2026,8,day,12));
 for(const period of ['daily','weekly','monthly'] as const){
  const board=seasonalQuestBoard(highLevel,period,dt);
  check(!board.some(quest=>forbiddenTags.has(quest.tag)),'Removed equipment, Trial and Companion quests must not return for progressed players');
 }
}
const initiallyOffered=seasonalQuestBoard(state,'monthly',date);
const frozen=recordSeasonalActivity(state,'combat',1,date.getTime());
const improvedAfterStart={...frozen,character:{...frozen.character!,level:70,equipment:{...frozen.character!.equipment,weapon:'basic_sword'}},defeatedBossIds:['FALLEN_KNIGHT'],skills:frozen.skills.map(x=>({...x,level:70}))} as GameState;
check(JSON.stringify(seasonalQuestBoard(frozen,'monthly',date).map(q=>q.tag))===JSON.stringify(initiallyOffered.map(q=>q.tag)),'First verified action should freeze selection');
check(JSON.stringify(seasonalQuestBoard(improvedAfterStart,'monthly',date).map(q=>q.tag))===JSON.stringify(initiallyOffered.map(q=>q.tag)),'Level-ups must not replace active monthly objectives');
check(!!normalizeSave(frozen).account.seasonalContractProgress?.monthly?.tags,'Frozen selections should survive save normalization');
let bossEverOffered=false;
for(let day=1;day<=35;day++){
 const dt=new Date(Date.UTC(2026,8,day,12)),board=seasonalQuestBoard(highLevel,'weekly',dt);
 if(board.some(q=>q.tag==='boss')){bossEverOffered=true;break;}
}
check(bossEverOffered,'Unlocked boss objectives should enter the weekly rotation');
const specialized=recordSeasonalCraftProfession(state,'COOK_MEADOW_PERCH',2,date.getTime());
check(specialized.account.seasonalContractProgress?.daily?.counts.cooking===2,'Trusted recipe type should credit its profession');
check(!recordSeasonalCraftProfession(state,'UNKNOWN_RECIPE',3,date.getTime()).account.seasonalContractProgress?.daily?.counts.cooking,'Unknown recipes must not credit a profession');
console.log('PASS: deterministic unlock-aware seasonal quest boards with verified activity variety');

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
check(cooked.account.seasonalContractProgress?.daily?.counts.cooking===1,'Cooking a recipe must count specifically toward Cooking contracts');
const faithTier=FAITH_TIERS[0],faithReady:GameState={...state,inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:HOLY_WATER_ID,quantity:faithTier.water*2}]}};
const faithStarted=startFaithPractice(faithReady,faithTier.id,2,t);
const faithSettled=claimActivity(faithStarted,t+faithTier.seconds*2000+1000);
check(faithSettled.reward.faithActions===2,'Faith test must settle two completed practices');
for(const period of ['daily','weekly','monthly'] as const)
 check(faithSettled.state.account.seasonalContractProgress?.[period]?.counts.faith===2,'Completed Faith practices must count toward '+period+' quests');
const faithRepeated=claimActivity(faithSettled.state,t+faithTier.seconds*2000+1000);
check(faithRepeated.state.account.seasonalContractProgress?.daily?.counts.faith===2,'Repeated Faith claim must not double credit');

const monthlyEarned=creditAll(earned,500,t);
const monthlyReady=seasonalQuestBoard(monthlyEarned,'monthly',date)[0];
check(monthlyReady.progress>=monthlyReady.required,'Monthly challenge should require substantial verified monthly progress');
const unlocked:GameState={...monthlyEarned,character:{...monthlyEarned.character!,equipment:state.character!.equipment},quests:monthlyEarned.quests.map(q=>q.questId==='QST_005'?{...q,status:'claimed'}:q)};
const monthlyClaim=executeGameCommand(unlocked,{type:'seasonal',args:{period:'monthly',id:monthlyReady.id}},t).state;
check(monthlyClaim.account.seasonalContractClaimIds?.includes(monthlyReady.id),'Monthly claims must work through the command dispatcher');

/** Choice verification: a completed Quest grants exactly one server-approved path, never a combined cache. */
for(const cadence of ['daily','weekly','monthly'] as const)for(const rarity of ['common','uncommon','rare','epic','legendary'] as const){
 const offers=seasonalQuestRewardOptions(state,cadence,rarity);
 check(offers.length>=1&&offers.length<=3,'Reward menu must stay compact for '+cadence+' '+rarity);
 check(new Set(offers.map(option=>option.id)).size===offers.length,'No duplicate reward choice IDs');
 check(offers.every(option=>Number(option.rewardItemQty??option.rewardCompanionEssence??option.rewardBondstones)>0),'Every published reward must be nonempty');
}
const accepted=validateGameCommand({type:'seasonal',args:{period:'daily',id:'SAMPLE',choiceId:'item:GEM_DUST'}});
check(accepted.args?.choiceId==='item:GEM_DUST','Strict online seasonal command validator must allow a reward choice ID');
let rejectedUnknownField=false;
try{validateGameCommand({type:'seasonal',args:{period:'daily',id:'SAMPLE',choiceId:'item:GEM_DUST',rewardItemQty:999}});}catch{rejectedUnknownField=true}
check(rejectedUnknownField,'Seasonal command validation must reject client-supplied reward quantities');
const dailyAlternatives=seasonalQuestRewardOptions(state,'daily','rare');
check(dailyAlternatives[0].id==='item:TEMPERING_DUST','Existing rare daily reward must remain the default');
check(dailyAlternatives.some(choice=>choice.id==='item:GEM_DUST'&&choice.rewardItemQty===5),'Gem Dust choice must be available on rare daily challenges');
check(dailyAlternatives.some(choice=>choice.id==='essence'&&choice.rewardCompanionEssence===5),'Companion Essence remains a selectable early-game reward');
const midState:GameState={...state,character:{...state.character!,level:25}};
check(!seasonalQuestRewardOptions(state,'weekly','epic').some(choice=>choice.id==='item:OATHGLASS_FRAGMENT'),'Early characters cannot skip regional progression via fragments');
const weeklyAlternatives=seasonalQuestRewardOptions(midState,'weekly','epic');
check(weeklyAlternatives.some(choice=>choice.id==='item:ASTERFALL_BOTANICAL_ESSENCE'&&choice.rewardItemQty===2),'Weekly Epic needs a rare botanical reward');
check(weeklyAlternatives.some(choice=>choice.id==='item:OATHGLASS_FRAGMENT'&&choice.rewardItemQty===2),'Weekly Epic needs a companion/gem fragment reward');
const monthlyAlternatives=seasonalQuestRewardOptions(midState,'monthly','rare');
check(monthlyAlternatives.some(choice=>choice.id==='item:RUNEBOUND_CORE'&&choice.rewardItemQty===3),'Monthly Rare needs a Sanctuary material');
check(monthlyAlternatives.some(choice=>choice.id==='item:ECHO_QUARTZ'&&choice.rewardItemQty===3),'Monthly Rare needs an Echo Quartz material');
check(!seasonalQuestRewardOptions(state,'monthly','epic').some(choice=>choice.id==='item:REGIONAL_CATALYST'),'Locked endgame catalyst must not appear to early accounts');
check(!seasonalQuestRewardOptions(state,'monthly','legendary').some(choice=>choice.id==='item:ASTRAL_SCRIPT'),'Late-region reagents must remain locked before region access');
const highState:GameState={...state,character:{...state.character!,level:70},currentRegionId:'SUNSCAR',skills:state.skills.map(row=>row.skillId==='enchanting'?{...row,level:45}:row)};
check(seasonalQuestRewardOptions(highState,'monthly','epic').some(choice=>choice.id==='item:REGIONAL_CATALYST'),'Qualified Enchanting accounts can select a catalyst');
check(seasonalQuestRewardOptions(highState,'monthly','legendary').some(choice=>choice.id==='item:ASTRAL_SCRIPT'),'Unlocked region grants targeted late-game material choice');
check(!seasonalQuestRewardOptions(highState,'monthly','legendary').some(choice=>choice.id==='item:RADIANT_CATALYST'||choice.id==='item:REGENT_SIGIL'||choice.id==='item:TRIAL_SANCTUARY_MATERIAL'),'Exclusive resources must remain unavailable from quests');
check(seasonalQuestRewardOptions(state,'monthly','legendary').some(choice=>choice.id==='bondstones'&&choice.rewardBondstones===1),'Monthly Legendary must allow one Bondstone');
// Locate a real deterministic Legendary contract (rather than manufacturing an unattainable rarity).
let verifiedBondstoneClaim=false;
for(let month=0;month<48&&!verifiedBondstoneClaim;month++){
 const monthDate=new Date(Date.UTC(2027+Math.floor(month/12),month%12,12,12));
 let earnedForMonth=createCharacter(newGame(0),'BASTION','Reward Choice Tester');
 for(const tag of ['combat','gathering','crafting','exploration','faith','boss'] as const)earnedForMonth=recordSeasonalActivity(earnedForMonth,tag,100000,monthDate.getTime());
 const legendary=seasonalQuestBoard(earnedForMonth,'monthly',monthDate).find(q=>q.rarity==='legendary'&&q.progress>=q.required);
 if(!legendary)continue;
 const beforeStones=earnedForMonth.account.bondstones??0;
 const beforeDust=earnedForMonth.inventory.stacks.filter(row=>row.itemId==='TEMPERING_CORE').reduce((sum,row)=>sum+row.quantity,0);
 const got=executeGameCommand(earnedForMonth,{type:'seasonal',args:{period:'monthly',id:legendary.id,choiceId:'bondstones'}},monthDate.getTime()).state;
 check((got.account.bondstones??0)===beforeStones+1,'Online command must credit the selected Bondstone exactly once');
 check((got.account.seasonalContractRewardChoices??{})[legendary.id]==='bondstones','Chosen reward ID must persist for accurate receipts');
 check(got.inventory.stacks.filter(row=>row.itemId==='TEMPERING_CORE').reduce((sum,row)=>sum+row.quantity,0)===beforeDust,'Choosing Bondstones must not silently grant default Tempering Cores');
 check(normalizeSave(got).account.seasonalContractRewardChoices?.[legendary.id]==='bondstones','Choice receipt must survive save normalization');
 let rejected=false;try{executeGameCommand(got,{type:'seasonal',args:{period:'monthly',id:legendary.id,choiceId:'item:TEMPERING_CORE'}},monthDate.getTime());}catch{rejected=true}
 check(rejected,'One contract must not grant a second selected reward');
 let forged=false;try{executeGameCommand(earnedForMonth,{type:'seasonal',args:{period:'monthly',id:legendary.id,choiceId:'item:RADIANT_CATALYST'}},monthDate.getTime());}catch{forged=true}
 check(forged,'Forged/locked reward IDs must be rejected without paying out');
 verifiedBondstoneClaim=true;
}
check(verifiedBondstoneClaim,'Find and settle a real Monthly Legendary choice through the command dispatcher');
let verifiedGemDustClaim=false;
for(let day=0;day<90&&!verifiedGemDustClaim;day++){
 const dayDate=new Date(Date.UTC(2027,0,1+day,12));
 let withActions=createCharacter(newGame(0),'BASTION','Gem Choice Tester');
 for(const tag of ['combat','gathering','crafting','exploration','faith','boss'] as const)withActions=recordSeasonalActivity(withActions,tag,10000,dayDate.getTime());
 const rare=seasonalQuestBoard(withActions,'daily',dayDate).find(q=>q.rarity==='rare'&&q.progress>=q.required);
 if(!rare)continue;
 const count=(s:GameState,id:string)=>[...s.inventory.stacks,...s.bank.stacks,...s.overflow.stacks].filter(row=>row.itemId===id).reduce((sum,row)=>sum+row.quantity,0);
 const priorDust=count(withActions,'GEM_DUST'),priorTempering=count(withActions,'TEMPERING_DUST');
 const result=executeGameCommand(withActions,{type:'seasonal',args:{period:'daily',id:rare.id,choiceId:'item:GEM_DUST'}},dayDate.getTime()).state;
 check(count(result,'GEM_DUST')===priorDust+5,'Selected Gem Dust must route into player storage');
 check(count(result,'TEMPERING_DUST')===priorTempering,'Alternative Gem Dust claim must not also award Tempering Dust');
 verifiedGemDustClaim=true;
}
check(verifiedGemDustClaim,'Find and settle a real Daily Rare Gem Dust alternative');
// Every real reward-choice assertion above runs against the shared authoritative command path.

console.log('PASS: shared seasonal targets, Faith settlement, UTC rollovers, claims, reward choices and save round trips');
