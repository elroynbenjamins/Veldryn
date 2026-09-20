import {claimActivity,createCharacter,craftRecipe,newGame,offlineCapBreakdown,previewActivityReward,startCombat,startGathering} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';
import {activateDailySupplyBoost,applyDailySupplyCraft,claimDailySupplies,DAILY_SUPPLY_CHARGE_SECONDS,dailySuppliesStatus,dailySupplyBank} from '../src/core/daily-supplies';
import {normalizeSave} from '../src/core/save-normalization';
import {dailySuppliesHomeSummary} from '../src/core/daily-supplies-home';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+': expected '+String(expected)+', got '+String(actual))}
function rejects(fn:()=>unknown,message:string){let caught=false;try{fn()}catch{caught=true}ok(caught,message)}
function qty(state:any,itemId:string){return [...state.inventory.stacks,...state.bank.stacks].filter((row:any)=>row.itemId===itemId).reduce((sum:number,row:any)=>sum+row.quantity,0)}
const DAY=86_400_000,t0=Date.UTC(2026,8,20,12,0,0);

let state=createCharacter(newGame(t0),'WAYFINDER','Supply Tester');
let home=dailySuppliesHomeSummary(state,t0);
ok(home.visible&&home.canClaim&&!!home.claimLabel,'Home should surface a ready Daily Supplies claim');
const first=claimDailySupplies(state,state.character!.id,t0);
state=first.state;
ok(first.status.reward.kind==='boost'&&first.status.reward.type==='gathering_yield','Claim 1 should bank Gathering Yield');
equal(dailySupplyBank(state.character).gathering_yield,1,'Claim 1 should bank one character-bound charge');
rejects(()=>claimDailySupplies(state,state.character!.id,t0+1000),'A UTC day can only be claimed once');
rejects(()=>claimDailySupplies({...state,account:{...state.account,dailySupplies:{schemaVersion:1,totalClaims:6,lastClaimDayKey:'2026-09-19'}}},'FAKE_CHARACTER',t0+DAY),'Daily Supplies claims must reject a fabricated receiver even on a premium milestone');
const paused=claimDailySupplies(state,state.character!.id,t0+4*DAY);
equal(paused.state.account.dailySupplies?.totalClaims,2,'Missing days must pause rather than reset the claim track');
ok(paused.status.reward.kind==='boost'&&paused.status.reward.type==='crafting_output','Claim 2 should continue the rotating normal reward sequence');

let cycle=createCharacter(newGame(t0),'WAYFINDER','Cycle Tester'),premium=0;
for(let day=1;day<=28;day++){
 const result=claimDailySupplies(cycle,cycle.character!.id,t0+(day-1)*DAY);
 if(result.status.reward.kind==='premium')premium+=result.status.reward.amount;
 cycle=result.state;
}
equal(cycle.account.dailySupplies?.totalClaims,28,'A complete cycle should record 28 claims');
equal(premium,100,'Milestones 7/14/21/28 should award 100 premium currency total');
equal(cycle.account.premiumCurrencyBalance,100,'Premium milestone currency should be account-wide');
const reloadedCycle=normalizeSave(structuredClone(cycle));equal(reloadedCycle.account.premiumCurrencyBalance,100,'Premium milestone currency must survive save normalization');equal(reloadedCycle.account.dailySupplies?.totalClaims,28,'Daily Supplies track must survive save normalization');
for(const type of ['gathering_yield','crafting_output','skill_xp','combat_xp'] as const)equal(dailySupplyBank(cycle.character)[type],6,'Twenty-four normal claims should rotate evenly across all four boosts');
const nextCycle=dailySuppliesStatus(cycle,t0+28*DAY);equal(nextCycle.cycle,2,'The track should roll into a new cycle after claim 28');equal(nextCycle.dayInTrack,1,'The next cycle should restart at claim 1');

let roster=createCharacter(newGame(t0),'WAYFINDER','Main');
roster={...roster,otherCharacters:[{character:{...roster.character!,id:'ALT_CHAR',name:'Alt'},inventory:{stacks:[],capacity:30},overflow:{stacks:[],expiresAtMs:null},activity:null,skills:structuredClone(roster.skills),quests:structuredClone(roster.quests),currentRegionId:'GREENFIELDS'}]};
const altClaim=claimDailySupplies(roster,'ALT_CHAR',t0);
equal(altClaim.state.otherCharacters?.[0].character.dailySupplyBoostBank?.gathering_yield,1,'Normal Daily Supplies can be assigned to another owned character');
ok(!altClaim.state.character?.dailySupplyBoostBank?.gathering_yield,'Assigning a charge to an alt must not also grant it to the active character');

let activation=createCharacter(newGame(t0),'WAYFINDER','Activation');
activation={...activation,character:{...activation.character!,dailySupplyBoostBank:{gathering_yield:1}}};
activation=activateDailySupplyBoost(activation,'gathering_yield');
home=dailySuppliesHomeSummary(activation,t0);
ok(home.visible&&!home.canClaim&&home.activeLabel?.includes('Gathering Yield')&&home.activeRemainingSeconds===DAILY_SUPPLY_CHARGE_SECONDS,'Home should surface the active Daily Supplies boost and remaining qualifying time');
equal(activation.character?.activeDailySupplyBoost?.remainingSeconds,DAILY_SUPPLY_CHARGE_SECONDS,'Activated charge should contain exactly two hours of qualifying time');
equal(activation.character?.dailySupplyBoostBank?.gathering_yield,undefined,'Activation should consume one banked charge');
rejects(()=>activateDailySupplyBoost({...activation,character:{...activation.character!,dailySupplyBoostBank:{combat_xp:1}}},'combat_xp'),'Daily Supplies boosts must not stack percentage-wise');

let baseGather=createCharacter(newGame(t0),'WAYFINDER','Base Gather');
baseGather=startGathering(baseGather,'GREENWOOD_TREE',t0);
const baseGatherPreview=previewActivityReward(baseGather,t0+3600_000);
let boostedGather={...baseGather,character:{...baseGather.character!,activeDailySupplyBoost:{type:'gathering_yield' as const,remainingSeconds:7200}}};
const boostedGatherPreview=previewActivityReward(boostedGather,t0+3600_000);
equal(boostedGatherPreview.xp,baseGatherPreview.xp,'Gathering Yield must not increase Skill XP');
equal(boostedGatherPreview.items[0].quantity,baseGatherPreview.items[0].quantity+Math.floor(baseGatherPreview.items[0].quantity*.10),'Gathering Yield should add exactly 10% stackable output with integer carry');
const gathered=claimActivity(boostedGather,t0+3600_000);
equal(gathered.state.character?.activeDailySupplyBoost?.remainingSeconds,3600,'One hour of qualifying gathering should consume one hour of boost time');

let skillGather={...baseGather,character:{...baseGather.character!,activeDailySupplyBoost:{type:'skill_xp' as const,remainingSeconds:7200}}};
const skillPreview=previewActivityReward(skillGather,t0+3600_000);
equal(skillPreview.items[0].quantity,baseGatherPreview.items[0].quantity,'Skill XP boost must not increase gathered items');
equal(skillPreview.xp,baseGatherPreview.xp+Math.floor(baseGatherPreview.xp*.10),'Skill XP should add exactly 10% qualifying skilling XP');

let baseCombat=createCharacter(newGame(t0),'WAYFINDER','Base Combat');
baseCombat=startCombat(baseCombat,'MOSS_RAT',t0);
const baseCombatPreview=previewActivityReward(baseCombat,t0+3600_000);
let boostedCombat={...baseCombat,character:{...baseCombat.character!,activeDailySupplyBoost:{type:'combat_xp' as const,remainingSeconds:7200}}};
const combatPreview=previewActivityReward(boostedCombat,t0+3600_000);
equal(combatPreview.xp,baseCombatPreview.xp+Math.floor(baseCombatPreview.xp*.10),'Combat XP should add exactly 10% to character combat XP while the charge covers the full qualifying session');
equal(combatPreview.gold,baseCombatPreview.gold,'Combat XP must not increase Gold');
equal(JSON.stringify(combatPreview.items),JSON.stringify(baseCombatPreview.items),'Combat XP must not alter drop rolls or quantities');
const combatClaim=claimActivity(boostedCombat,t0+3600_000),combatRemaining=combatClaim.state.character?.activeDailySupplyBoost?.remainingSeconds??0;
ok(combatRemaining>=3600&&combatRemaining<7200,'Combat boost time should stop draining when combat itself stops early');

let craft=createCharacter(newGame(t0),'WAYFINDER','Craft Output');
craft={...craft,character:{...craft.character!,gold:1000,activeDailySupplyBoost:{type:'crafting_output' as const,remainingSeconds:7200}},inventory:{...craft.inventory,stacks:[...craft.inventory.stacks,{itemId:'COPPER_ORE',quantity:30}]}};
craft=craftRecipe(craft,'SMELT_COPPER_INGOT',t0);
craft=craftRecipe(craft,'SMELT_COPPER_INGOT',t0+1);
equal(qty(craft,'COPPER_INGOT'),11,'Two five-ingot processing batches should produce one carried +10% bonus ingot');
equal(craft.character?.activeDailySupplyBoost?.remainingSeconds,7200-72,'Crafting Output should consume recipe seconds, not menu time');

let craftSkill=createCharacter(newGame(t0),'WAYFINDER','Craft XP');
craftSkill={...craftSkill,character:{...craftSkill.character!,gold:1000,activeDailySupplyBoost:{type:'skill_xp' as const,remainingSeconds:7200}},inventory:{...craftSkill.inventory,stacks:[...craftSkill.inventory.stacks,{itemId:'COPPER_ORE',quantity:10}]}};
craftSkill=craftRecipe(craftSkill,'SMELT_COPPER_INGOT',t0);
equal(craftSkill.skills.find(row=>row.skillId==='smithing')?.xp,88,'Skill XP should add 10% to instant processing XP');
equal(craftSkill.character?.activeDailySupplyBoost?.remainingSeconds,7200-36,'Skill XP should consume the recipe duration');

let noGearDup=createCharacter(newGame(t0),'IRONWARDEN','No Gear Dup');
noGearDup={...noGearDup,character:{...noGearDup.character!,activeDailySupplyBoost:{type:'crafting_output' as const,remainingSeconds:7200}}};
const blockedOutput=applyDailySupplyCraft(noGearDup,{seconds:300,outputQuantity:1,xp:500,outputEligible:false});
equal(blockedOutput.outputQuantity,1,'Crafting Output must never duplicate ineligible equipment/tool output');
equal(blockedOutput.state.character?.activeDailySupplyBoost?.remainingSeconds,7200,'Ineligible equipment crafting should not burn Crafting Output time');

let boundary=createCharacter(newGame(t0),'WAYFINDER','Boundary');
boundary={...boundary,character:{...boundary.character!,dailySupplyBoostBank:{skill_xp:1}}};
boundary=startGathering(boundary,'GREENWOOD_TREE',t0);
const beforeActivation=previewActivityReward(boundary,t0+3600_000);
const activated=executeGameCommand(boundary,{type:'daily_supplies_activate',args:{type:'skill_xp'}},t0+3600_000);
equal(activated.reward?.xp,beforeActivation.xp,'Activation must settle earlier activity without retroactive +10% XP');
equal(activated.state.character?.activeDailySupplyBoost?.remainingSeconds,7200,'Freshly activated boost should start with the full two-hour charge after settlement');

let claimWhileActive=createCharacter(newGame(t0),'WAYFINDER','Claim Boundary');
claimWhileActive=startGathering(claimWhileActive,'GREENWOOD_TREE',t0);
const originalClaimAt=claimWhileActive.activity!.lastClaimAtMs;
const claimedCommand=executeGameCommand(claimWhileActive,{type:'daily_supplies_claim',args:{characterId:claimWhileActive.character!.id}},t0+1800_000);
equal(claimedCommand.state.activity?.lastClaimAtMs,originalClaimAt,'Claiming Daily Supplies should not settle or disturb the running activity');
ok(!claimedCommand.reward,'Settlement-free Daily Supplies claim should not create an unrelated reward popup');

const baselineCap=offlineCapBreakdown(createCharacter(newGame(t0),'WAYFINDER','Cap Base')).hours;
const boostedCap=offlineCapBreakdown({...activation,account:{...activation.account,dailySupplies:{schemaVersion:1,totalClaims:27,lastClaimDayKey:'2026-09-19'},premiumCurrencyBalance:999}}).hours;
equal(baselineCap,24,'Fresh account Offline Reserve baseline should remain 24 hours');
equal(boostedCap,baselineCap,'Daily Supplies ownership, banked boosts and premium milestones must not extend Offline Reserve');

const quiet=createCharacter(newGame(t0),'WAYFINDER','Quiet');
const quietClaim=claimDailySupplies(quiet,quiet.character!.id,t0).state;
const quietNoBank={...quietClaim,character:{...quietClaim.character!,dailySupplyBoostBank:undefined,activeDailySupplyBoost:undefined}};
home=dailySuppliesHomeSummary(quietNoBank,t0+1000);
ok(!home.visible&&!home.canClaim,'Home should hide Daily Supplies after today is claimed when no boost or banked charge needs attention');

console.log(JSON.stringify({status:'PASS',premium,normalBoostCharges:dailySupplyBank(cycle.character),gatherBonus:boostedGatherPreview.items[0].quantity-baseGatherPreview.items[0].quantity,combatRemaining}));
