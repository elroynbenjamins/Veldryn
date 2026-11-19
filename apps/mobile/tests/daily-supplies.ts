import {migrateSave} from '../src/core/save-migrations';
import {activeCombatRuntimeProjection,claimActivity,createCharacter,newGame,offlineCapBreakdown,previewActivityReward,startCombat,startGathering} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';
import {activateDailySupplyBoost,claimDailySupplies,DAILY_SUPPLY_BOOST_TYPES,DAILY_SUPPLY_CHARGE_SECONDS,DAILY_SUPPLY_MILESTONES,dailySupplyBank,dailySupplyCoverage,dailySupplySpeedMultiplier,dailySuppliesStatus,dailySupplyRewardForDay,activeDailySupplyBoosts,dailySupplyQueued,dailySupplyCraftWorkSeconds,dailySupplyAdjustTimedCraftReward,previewDailySupplyTimedReward,commitDailySupplyTimedBoost,migrateLegacyDailySupplies} from '../src/core/daily-supplies';
import {normalizeSave} from '../src/core/save-normalization';
import {dailySuppliesHomeSummary} from '../src/core/daily-supplies-home';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+': expected '+String(expected)+', got '+String(actual))}
function rejects(fn:()=>unknown,message:string){let caught=false;try{fn()}catch{caught=true}ok(caught,message)}
function unlockDaily(state:any){return {...state,quests:state.quests.map((row:any)=>row.questId==='QST_002'?{...row,status:'claimed'}:row)}}
const DAY=86_400_000,t0=Date.UTC(2026,10,19,12,0,0);
const create=(name:string)=>createCharacter(newGame(t0),'WAYFINDER',name);
const withAccountBoost=(state:any,type:any,bonus=.1,remainingSeconds=7200)=>({...state,account:{...state.account,dailySupplies:{schemaVersion:2,totalClaims:0,bank:{},active:{[type]:{type,bonus,seconds:Math.max(7200,remainingSeconds),remainingSeconds}},queued:{}}}});

let state=create('Supply Tester'),home=dailySuppliesHomeSummary(state,t0);
ok(home.visible&&home.canClaim&&!!home.claimLabel,'Home should show a claimable Supply Journey reward');
let first=claimDailySupplies(state,state.character!.id,t0);
state=first.state;
ok(first.status.reward.kind==='boost'&&first.status.reward.type==='gathering_speed','First claim should be Gathering Speed');
equal(dailySupplyBank(state).gathering_speed?.length,1,'First claim stores one account-wide Gathering Speed charge');
equal(state.character?.dailySupplyBoostBank,undefined,'New supply charges should not be saved on a character');
rejects(()=>claimDailySupplies(state,state.character!.id,t0+1000),'Only one daily claim per UTC day');
rejects(()=>claimDailySupplies(state,'FAKE_CHARACTER',t0+DAY),'Reject non-owned character IDs');
const paused=claimDailySupplies(state,state.character!.id,t0+4*DAY);
equal(paused.state.account.dailySupplies?.totalClaims,2,'Missing days pause rather than reset progression');
ok(paused.status.reward.kind==='boost'&&paused.status.reward.type==='crafting_speed','Second claim rotates to Crafting Speed');

let cycle=create('Journey Cycle'),milestones=0;
for(let day=1;day<=56;day++){
 const status=dailySuppliesStatus(cycle,t0+(day-1)*DAY);
 const isMilestone=status.reward.kind==='milestone';
 if(isMilestone)rejects(()=>claimDailySupplies(cycle,cycle.character!.id,t0+(day-1)*DAY),'Milestones require a blessing choice');
 const result=claimDailySupplies(cycle,cycle.character!.id,t0+(day-1)*DAY,isMilestone?'combat_speed':undefined);
 if(isMilestone)milestones++;
 cycle=result.state;
}
equal(cycle.account.dailySupplies?.totalClaims,56,'Two cycles should have 56 claims');
equal(milestones,8,'Four milestones per journey');
equal(cycle.account.premiumCurrencyBalance??0,0,'New milestones must not mint premium currency');
equal(dailySupplyBank(cycle).combat_speed?.filter(entry=>entry.bonus>.1).length,8,'Chosen enhanced blessings must stay in account vault');
const regularCounts=DAILY_SUPPLY_BOOST_TYPES.map(type=>(dailySupplyBank(cycle)[type]??[]).filter(entry=>entry.bonus===.1).length);
ok(Math.max(...regularCounts)-Math.min(...regularCounts)<=1,'Five regular buffs should rotate evenly across journeys');
equal(dailySupplyRewardForDay(7,1).kind,'milestone','Day 7 is a milestone');
equal(DAILY_SUPPLY_MILESTONES[28].bonus,.25,'Day 28 must grant a +25% blessing');
equal(DAILY_SUPPLY_MILESTONES[28].seconds,14400,'Day 28 blessing lasts 4h');
const normalizedCycle=normalizeSave(structuredClone(cycle));
equal(normalizedCycle.account.dailySupplies?.totalClaims,56,'Normalized saves must preserve Journey claims');
equal(dailySupplyBank(normalizedCycle).combat_speed?.filter(entry=>entry.bonus>.1).length,8,'Normalized saves must preserve milestone bonus tiers');

let roster=create('Main');
roster={...roster,otherCharacters:[{character:{...roster.character!,id:'ALT_CHAR',name:'Alt'},inventory:{stacks:[],capacity:30},overflow:{stacks:[],expiresAtMs:null},activity:null,skills:structuredClone(roster.skills),quests:structuredClone(roster.quests),currentRegionId:'GREENFIELDS'}]};
roster=claimDailySupplies(roster,'ALT_CHAR',t0).state;
equal(dailySupplyBank(roster).gathering_speed?.length,1,'Alt claims must use the same account supply bank');
equal(roster.otherCharacters?.[0].character.dailySupplyBoostBank,undefined,'Alt must not receive private charges');
roster=activateDailySupplyBoost(roster,'gathering_speed');
equal(activeDailySupplyBoosts(roster).gathering_speed?.remainingSeconds,7200,'Account boosts activate regardless of claiming character');
equal(roster.otherCharacters?.[0].character.activeDailySupplyBoost,undefined,'Alt does not duplicate active boost state');

let legacy:any=create('Legacy');
legacy={...legacy,account:{...legacy.account,dailySupplies:{schemaVersion:1,totalClaims:8,lastClaimDayKey:'2026-11-18'}},character:{...legacy.character!,dailySupplyBoostBank:{gathering_yield:2,combat_xp:1} as any,activeDailySupplyBoost:{type:'crafting_output',remainingSeconds:3500} as any}};
const migrated=normalizeSave(legacy);
equal(migrated.account.dailySupplies?.schemaVersion,2,'Legacy v1 track migrates to v2');
equal(dailySupplyBank(migrated).gathering_speed?.length,2,'Legacy Gathering Yield charges convert to Gathering Speed');
equal(dailySupplyBank(migrated).combat_xp?.length,1,'Legacy XP charges survive');
equal(activeDailySupplyBoosts(migrated).crafting_speed?.remainingSeconds,3500,'Legacy Crafting Output activity time survives as speed');
equal(migrated.character?.activeDailySupplyBoost,undefined,'Character-bound legacy data cleared exactly once');
equal(dailySupplyBank(normalizeSave(migrated)).gathering_speed?.length,2,'Repeated migration must not mint duplicate charges');
const migratedDirect=migrateLegacyDailySupplies(legacy);
equal(dailySupplyBank(migratedDirect).gathering_speed?.length,2,'Direct pre-normalized migration works');

let stack=create('Stack');
stack={...stack,account:{...stack.account,dailySupplies:{schemaVersion:2,totalClaims:6,bank:{gathering_speed:[{bonus:.25,seconds:7200}]},active:{gathering_speed:{type:'gathering_speed',bonus:.1,seconds:7200,remainingSeconds:7200}},queued:{}}}};
stack=activateDailySupplyBoost(stack,'gathering_speed');
equal(activeDailySupplyBoosts(stack).gathering_speed?.bonus,.25,'Stronger boost must replace regular active tier');
equal(dailySupplyQueued(stack).gathering_speed?.[0].bonus,.1,'Weaker active tier must be paused rather than consumed');
equal(dailySupplySpeedMultiplier(stack,'gathering_speed',3600),1.25,'Full stronger timer adds exactly 25% speed');
equal(dailySupplySpeedMultiplier(stack,'gathering_speed',10800),1+(7200*.25+3600*.1)/10800,'A long settlement blends stronger and weaker activity windows');
const coverage=dailySupplyCoverage(stack,'gathering_speed',10800);
equal(coverage.consumedSeconds,10800,'Both tiers should provide qualifying activity time without a gap');
const dummy={xp:0,gold:0,items:[],kills:0,elapsedSeconds:10800};
const settled=previewDailySupplyTimedReward(stack,dummy,'gathering');
const committed=commitDailySupplyTimedBoost(stack,settled);
equal(activeDailySupplyBoosts(committed).gathering_speed?.bonus,.1,'Weaker tier resumes after stronger expires');
equal(activeDailySupplyBoosts(committed).gathering_speed?.remainingSeconds,3600,'Weaker tier uses only remaining qualifying time');
equal(dailySupplyQueued(committed).gathering_speed?.length??0,0,'Consumed queued tiers are removed');
const otherCategory=withAccountBoost(create('Combat'), 'combat_xp');
equal(dailySupplySpeedMultiplier(otherCategory,'combat_speed',3600),1,'Combat XP must not affect combat speed');
equal(dailySupplySpeedMultiplier(otherCategory,'gathering_speed',3600),1,'Combat XP must not affect gathering speed');

const craftClock=withAccountBoost(create('Craft Clock'),'crafting_speed',.25,7200);
const craftActivity={...craftClock,activity:{kind:'processing',lastClaimAtMs:t0}} as any;
equal(dailySupplyCraftWorkSeconds(craftActivity,3600),4500,'Active 25% Crafting Speed adds 900s of work per hour');
const workReward={xp:50,gold:0,items:[],kills:0,elapsedSeconds:4500,craftingCompletedAtMs:[t0+4500_000],nextProcessingRemaining:0};
const realReward=dailySupplyAdjustTimedCraftReward(craftActivity,workReward,3600);
equal(realReward.craftingCompletedAtMs?.[0],t0+3600_000,'Accelerated crafting completion timestamps stay on the real clock');
equal(realReward.qualifyingActivitySeconds,3600,'Crafting timer burns real qualifying time, not accelerated work time');
const craftCommitted=commitDailySupplyTimedBoost(craftActivity,previewDailySupplyTimedReward(craftActivity,realReward,'crafting'));
equal(activeDailySupplyBoosts(craftCommitted).crafting_speed?.remainingSeconds,3600,'Partial crafting session preserves the remaining charge');

let boostedGather=withAccountBoost(startGathering(create('Gather Active'),'GREENWOOD_TREE',t0),'gathering_speed');
let baseGather={...boostedGather,account:{...boostedGather.account,dailySupplies:{schemaVersion:2,totalClaims:0,bank:{},active:{},queued:{}}}};
const baseline=previewActivityReward(baseGather,t0+7200_000),fast=previewActivityReward(boostedGather,t0+7200_000);
ok(fast.kills>=baseline.kills,'Gathering Speed must never slow resource gathering');
ok(fast.xp>=baseline.xp,'Gathering Speed rewards completed work naturally, not free item multipliers');
const claim=claimActivity(boostedGather,t0+7200_000);
equal(activeDailySupplyBoosts(claim.state).gathering_speed,undefined,'Exactly two hours of gathering should exhaust a regular speed charge');

let baseCombat=startCombat(create('Ordinary Hunt'),'MOSS_RAT',t0);
const boostedCombat=withAccountBoost(baseCombat,'combat_speed');
baseCombat={...baseCombat,account:{...baseCombat.account,dailySupplies:{schemaVersion:2,totalClaims:0,bank:{},active:{},queued:{}}}};
const huntNormal=previewActivityReward(baseCombat,t0+1800_000),huntFast=previewActivityReward(boostedCombat,t0+1800_000);
const normalProjection=activeCombatRuntimeProjection(baseCombat),speedProjection=activeCombatRuntimeProjection(boostedCombat);
ok(!!normalProjection&&!!speedProjection&&speedProjection.killCycleSeconds<normalProjection.killCycleSeconds,'Combat Speed must reduce ordinary encounter cycle time');
equal(dailySupplySpeedMultiplier(boostedCombat,'combat_speed',1800),1.1,'Combat Speed multiplier is 10% while active');

let xp=withAccountBoost(startGathering(create('Skill XP'),'GREENWOOD_TREE',t0),'skill_xp',.2);
const xpBase={...xp,account:{...xp.account,dailySupplies:{schemaVersion:2,totalClaims:0,bank:{},active:{},queued:{}}}};
const xpPreview=previewActivityReward(xp,t0+3600_000),xpNormal=previewActivityReward(xpBase,t0+3600_000);
ok(xpPreview.xp>=xpNormal.xp,'Stronger milestone Skill XP increases earned XP');
const xpSettled=claimActivity(xp,t0+3600_000);
equal(activeDailySupplyBoosts(xpSettled.state).skill_xp?.remainingSeconds,3600,'Skill XP should consume only qualifying activity time');

let commandState=unlockDaily(create('Command'));
commandState=executeGameCommand(commandState,{type:'daily_supplies_claim',args:{characterId:commandState.character!.id}},t0).state;
equal(dailySupplyBank(commandState).gathering_speed?.length,1,'Game command must bank ordinary Supply rewards');
let milestoneCommand=unlockDaily(create('Milestone Command'));
milestoneCommand={...milestoneCommand,account:{...milestoneCommand.account,dailySupplies:{schemaVersion:2,totalClaims:6,bank:{},active:{},queued:{},lastClaimDayKey:'2026-11-18'}}};
rejects(()=>executeGameCommand(milestoneCommand,{type:'daily_supplies_claim',args:{characterId:milestoneCommand.character!.id}},t0),'Command gateway must require milestone choice');
const selected=executeGameCommand(milestoneCommand,{type:'daily_supplies_claim',args:{characterId:milestoneCommand.character!.id,choiceType:'combat_speed'}},t0).state;
equal(dailySupplyBank(selected).combat_speed?.[0].bonus,.2,'Command gateway honors chosen milestone type');

const regularCap=offlineCapBreakdown(create('Cap Base')).hours;
const boostCap=offlineCapBreakdown(stack).hours;
equal(regularCap,boostCap,'Supply boosts must not extend Offline Reserve');

const quietStart=create('Quiet');
const quietClaim=claimDailySupplies(quietStart,quietStart.character!.id,t0).state;
const quietNoBank={...quietClaim,account:{...quietClaim.account,dailySupplies:{...quietClaim.account.dailySupplies!,bank:{}}}};
home=dailySuppliesHomeSummary(quietNoBank,t0+1000);
ok(!home.visible&&!home.canClaim,'Home should hide after claiming when the vault and active list are empty');
console.log(JSON.stringify({status:'PASS',milestones,regularCounts,convertedLegacy:dailySupplyBank(migrated).gathering_speed?.length,coveredSeconds:coverage.consumedSeconds}));
