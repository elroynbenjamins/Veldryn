import {createCharacter,newGame,startGathering} from '../src/core/game';
import {characterTotalXpAtLevel,totalXpAtLevel} from '../src/core/progression';
import {GATHERING,RECIPES} from '../src/content/skills';
import {MONSTERS,NORMAL_GEAR_DROP_FLOOR} from '../src/content/monsters';
import {activeActivityLevelPace,activityProgressFeedback,characterLevelPace,combatBaselineProjection,craftingPaceProjection,dropExpectation,dropPaceBand,formatBalanceDuration,gatheringBalanceProjection,skillTargetEta} from '../src/core/balance-projection';
import {activityCycleSeconds,activityRate} from '../src/core/dashboard';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function close(actual:number,expected:number,tolerance:number,message:string){if(Math.abs(actual-expected)>tolerance)throw new Error(message+': expected '+expected+', got '+actual)}

let state=createCharacter(newGame(1),'IRONWARDEN','Balance Tester');
const greenwood=GATHERING.find(row=>row.id==='GREENWOOD_TREE')!;
const gather=gatheringBalanceProjection(state,greenwood,24);
ok(gather.cycleSeconds>greenwood.seconds,'Gathering projection must include global pacing/tool/weather modifiers');
ok(gather.xpPerHour>0&&gather.levelPace.etaSeconds!==undefined,'Gathering projection must expose XP/hour and next-level ETA');
close(gather.runtimeItemsPerHour,gather.authoredMeanItemsPerHour,.001,'Runtime gathering expectation must honor the authored min/max mean yield');
const target=skillTargetEta(state,'woodcutting',7,gather.xpPerHour);
ok((target.etaSeconds??0)>gather.levelPace.etaSeconds!,'Higher skill unlock ETA must include multiple levels of XP');
const starterToolState={...state,character:{...state.character!,equippedToolIds:{woodcutting:'GREENWOOD_HATCHET'}}};
const ironToolState={...state,character:{...state.character!,equippedToolIds:{woodcutting:'ASTER_IRON_HATCHET'}}};
const oathToolState={...state,character:{...state.character!,equippedToolIds:{woodcutting:'OATHSTONE_HATCHET'}}};
const ironwood=GATHERING.find(row=>row.id==='IRONWOOD_TREE')!,crownwood=GATHERING.find(row=>row.id==='CROWNWOOD_TREE')!;
const starterPace=gatheringBalanceProjection(starterToolState,greenwood,24),midPace=gatheringBalanceProjection(ironToolState,ironwood,24),highPace=gatheringBalanceProjection(oathToolState,crownwood,24);
ok(midPace.xpPerHour>starterPace.xpPerHour,'Recommended tier-2 gathering must improve XP/hour over starter gathering');
ok(highPace.xpPerHour>midPace.xpPerHour,'Recommended tier-3 gathering must improve XP/hour over tier-2 gathering');
ok(crownwood.recommendedToolTier===3,'Level-15 Crownwood must correctly recommend the tier-3 tool');
ok((starterPace.levelPace.etaSeconds??Infinity)>=8*60&&(starterPace.levelPace.etaSeconds??Infinity)<=25*60,'A properly equipped starter skill should gain its first level in roughly 8–25 minutes');
const firstUnlock=skillTargetEta(starterToolState,'woodcutting',7,starterPace.xpPerHour);
ok((firstUnlock.etaSeconds??Infinity)>=4*3600&&(firstUnlock.etaSeconds??Infinity)<=12*3600,'The first major gathering tier should remain reachable within a long playday/offline session');
const level7Wood={...ironToolState,skills:ironToolState.skills.map(row=>row.skillId==='woodcutting'?{...row,level:7,xp:totalXpAtLevel(7)}:row)};
const level15Wood={...oathToolState,skills:oathToolState.skills.map(row=>row.skillId==='woodcutting'?{...row,level:15,xp:totalXpAtLevel(15)}:row)};
const level7Pace=gatheringBalanceProjection(level7Wood,ironwood,24).levelPace,level15Pace=gatheringBalanceProjection(level15Wood,crownwood,24).levelPace;
ok((level7Pace.etaSeconds??Infinity)<=3*3600,'A recommended mid-tier gathering node should keep a level around 7 within a few hours');
ok((level15Pace.etaSeconds??Infinity)<=6*3600,'A recommended high Asterfall gathering node should keep level 15 progression within a long session');

state=startGathering(state,'GREENWOOD_TREE',1000);
const active=activeActivityLevelPace(state,gather.xpPerHour);
ok(active?.label==='Woodcutting'&&active.level===1,'Active gathering pace must resolve the trained skill');
ok((active?.etaSeconds??0)>0,'Active gathering pace must expose a next-level ETA');

const rat=MONSTERS.find(row=>row.id==='MOSS_RAT')!,combat=combatBaselineProjection(rat);
ok(combat.cycleSeconds>rat.secondsPerKill,'Combat baseline must include the global combat-time scale used by settlement');
ok(combat.killsPerHour>0&&combat.xpPerHour>0,'Combat baseline must expose kills/hour and XP/hour');
const combatState=createCharacter(newGame(1),'IRONWARDEN','Combat Pace Tester');
const firstCombatLevel=characterLevelPace(combatState,combat.xpPerHour),firstCombatEta=firstCombatLevel.etaSeconds??Infinity;
ok(firstCombatEta>0&&firstCombatEta<=35*60,'Baseline starter combat should gain the first character level within roughly 35 minutes; got '+firstCombatEta+'s from '+firstCombatLevel.need+' XP at '+Math.round(combat.xpPerHour)+' XP/hr');
const thornling=MONSTERS.find(row=>row.id==='THORNLING')!,revenantLevel=MONSTERS.find(row=>row.id==='OATHGLASS_REVENANT')!;
const level10State={...state,character:{...state.character!,level:10,xp:characterTotalXpAtLevel(10)}},level25State={...state,character:{...state.character!,level:25,xp:characterTotalXpAtLevel(25)}};
const level10Combat=characterLevelPace(level10State,combatBaselineProjection(thornling).xpPerHour),level25Combat=characterLevelPace(level25State,combatBaselineProjection(revenantLevel).xpPerHour);
ok((level10Combat.etaSeconds??Infinity)<=4*3600,'Matching-level combat around level 10 should progress within a few hours');
ok((level25Combat.etaSeconds??Infinity)<=6.5*3600,'Asterfall-end combat levels should remain session-scale rather than day-scale per level');
const glassbound=MONSTERS.find(row=>row.id==='GLASSBOUND_SENTINEL')!,ashen=MONSTERS.find(row=>row.id==='ASHEN_REVENANT')!;
const level40State={...state,character:{...state.character!,level:40,xp:characterTotalXpAtLevel(40)}},level88State={...state,character:{...state.character!,level:88,xp:characterTotalXpAtLevel(88)}};
const level40Combat=characterLevelPace(level40State,combatBaselineProjection(glassbound).xpPerHour),level88Combat=characterLevelPace(level88State,combatBaselineProjection(ashen).xpPerHour);
ok((level40Combat.etaSeconds??Infinity)<=7*3600,'Matching-level combat around level 40 should stay within a long session');
ok((level88Combat.etaSeconds??Infinity)<=10*3600,'Late matching-level combat should remain under roughly ten baseline hours per level');
const gearDrop=rat.drops.find(drop=>drop.chance<.1)!;
const expected=dropExpectation(gearDrop.chance,gearDrop.min,gearDrop.max,combat.killsPerHour);
close(expected.oneIn,1/gearDrop.chance,.001,'Drop odds must be the reciprocal of per-kill chance');
ok(expected.averageFindSeconds>combat.cycleSeconds,'Rare-drop average find time must exceed one kill cycle');
const mossMaterial=rat.drops.find(drop=>drop.itemId==='MOSS_FIBER')!,mossExpected=dropExpectation(mossMaterial.chance,mossMaterial.min,mossMaterial.max,combat.killsPerHour);
ok(mossExpected.averageFindSeconds<5*60,'Starter required materials should arrive frequently rather than carrying the grind');
const revenant=MONSTERS.find(row=>row.id==='OATHGLASS_REVENANT')!,revenantPace=combatBaselineProjection(revenant),normalGear=revenant.drops.find(drop=>drop.itemId==='SPELLGLASS_CHEST')!,normalGearExpected=dropExpectation(normalGear.chance,normalGear.min,normalGear.max,revenantPace.killsPerHour);
ok(normalGear.chance>=NORMAL_GEAR_DROP_FLOOR,'Ordinary non-boss gear must respect the global progression-friendly drop floor');
ok(normalGearExpected.averageFindSeconds>=15*60&&normalGearExpected.averageFindSeconds<=90*60,'Later ordinary gear should average minutes to about an hour, not become a chase grind');
ok(dropPaceBand(normalGearExpected.averageFindSeconds).band==='progression','Ordinary later gear should be classified as progression-paced');
const oracle=MONSTERS.find(row=>row.id==='DUNE_ORACLE')!,oraclePace=combatBaselineProjection(oracle),sigil=oracle.drops.find(drop=>drop.itemId==='SWIFT_SIGIL')!,sigilExpected=dropExpectation(sigil.chance,sigil.min,sigil.max,oraclePace.killsPerHour);
ok(sigilExpected.averageFindSeconds>=3*3600&&sigilExpected.averageFindSeconds<=12*3600,'Rare build-defining sigils should remain multi-hour chase drops');
ok(dropPaceBand(sigilExpected.averageFindSeconds).band==='chase','Build-defining sigils should remain explicitly classified as chase rewards');
const boss=MONSTERS.find(row=>row.id==='FALLEN_KNIGHT')!,bossGear=boss.drops.find(drop=>drop.itemId==='TRACKER_CHEST')!;
ok(bossGear.chance===.01,'Boss-specific gear is excluded from the ordinary-world gear floor and keeps authored boss odds');
ok(dropPaceBand(13*3600).band==='long_chase'&&dropPaceBand(5*60).band==='frequent','Drop pace labels must distinguish frequent and long-chase rewards');
ok(formatBalanceDuration(30)==='<1m'&&formatBalanceDuration(3600)==='1h'&&formatBalanceDuration(90000)==='1d 1h','Balance duration labels must stay compact and readable');
ok(activityProgressFeedback('gathering',.1)==='Preparing tools…'&&activityProgressFeedback('gathering',.8)==='Finishing the action…','Gathering cycle feedback must describe real progress phases');
ok(activityProgressFeedback('combat',.1)==='Tracking the target…'&&activityProgressFeedback('combat',.8)==='Pressing the advantage…','Combat cycle feedback must describe real progress phases');
ok(activityProgressFeedback('crafting',.1)==='Preparing materials…'&&activityProgressFeedback('faith',.8)==='Deepening devotion…','Crafting and Faith must use activity-specific progress language');
ok(activityProgressFeedback('training',.8)==='Refining form…'&&activityProgressFeedback('exploration',.8)==='Following the trail…','Training and Exploration must use activity-specific progress language');
ok(activityProgressFeedback('hunting',.1)==='Reading tracks…'&&activityProgressFeedback('hunting',.8)==='Closing in…','Hunting must use hunt-specific progress language');

const activityBase=createCharacter(newGame(1),'IRONWARDEN','Activity Pace Tester');
const exploreState={...activityBase,activity:{kind:'exploration',targetId:'SCOUT_GREENFIELDS',startedAtMs:1,lastClaimAtMs:1} as any};
close(activityCycleSeconds(exploreState),60,.001,'Exploration Home cycle must use the authored route duration');
const exploreRate=activityRate(exploreState),exploreLevel=activeActivityLevelPace(exploreState,exploreRate.xpPerHour);
close(exploreRate.xpPerHour,1440,.001,'Starter Exploration Home rate must match settlement XP/hour');
ok(exploreLevel?.label==='Exploration','Active Exploration must resolve the Exploration skill level bar');

const faithState={...activityBase,activity:{kind:'faith',targetId:'FAITH_QUIET',startedAtMs:1,lastClaimAtMs:1} as any};
close(activityCycleSeconds(faithState),30,.001,'Faith Home cycle must use the authored practice duration');
const faithRate=activityRate(faithState),faithLevel=activeActivityLevelPace(faithState,faithRate.xpPerHour);
close(faithRate.xpPerHour,14400,.001,'Quiet Prayer Home rate must match 120 XP per 30-second practice');
ok(faithLevel?.label==='Faith','Active Faith must resolve the Faith skill level bar');

const alchemyState={...activityBase,activity:{kind:'alchemy',targetId:'TEST_BREW',startedAtMs:1,lastClaimAtMs:1,brew:{version:1,recipeId:'TEST_BREW',totalBatches:5,remainingBatches:5,inputsPerBatch:[],goldPerBatch:0,outputPerBatch:{itemId:'COPPER_INGOT',quantity:1},cycleSeconds:45,xpPerBatch:150}} as any};
close(activityCycleSeconds(alchemyState),45,.001,'Alchemy Home cycle must use the reserved mastery-adjusted brew snapshot');
const alchemyRate=activityRate(alchemyState),alchemyLevel=activeActivityLevelPace(alchemyState,alchemyRate.xpPerHour);
close(alchemyRate.xpPerHour,12000,.001,'Alchemy Home rate must use reserved XP per batch and cycle duration');
ok(alchemyLevel?.label==='Alchemy','Active Alchemy must resolve the Alchemy skill level bar');
const copperBlade=RECIPES.find(row=>row.id==='SMITH_COPPER_BLADE')!,asterChest=RECIPES.find(row=>row.id==='SMITH_ASTER_IRON_CHEST')!,oathWard=RECIPES.find(row=>row.id==='SMITH_OATHSTONE_WARD')!;
const qty=(recipe:typeof copperBlade,itemId:string)=>recipe.inputs.find(row=>row.itemId===itemId)?.quantity??0;
ok(qty(copperBlade,'COPPER_INGOT')<=12&&qty(copperBlade,'GREENWOOD_LOG')<=24,'Starter crafted gear must stay session-friendly after catalog transforms');
ok(qty(asterChest,'ASTER_IRON_INGOT')<=55&&qty(asterChest,'IRONWOOD_LOG')<=80&&qty(asterChest,'REINFORCED_FITTING')<=5,'Mid-tier chest material costs must stay progression-scale after catalog transforms');
ok(qty(oathWard,'OATHSTONE_INGOT')<=28&&qty(oathWard,'CROWNWOOD_LOG')<=48&&qty(oathWard,'OATHGLASS_SHARD')<=8,'Oathstone progression gear must remain demanding but session-scale after catalog transforms');
ok(copperBlade.seconds>=60&&oathWard.seconds>=240,'Routine recipe material reductions must not erase the existing timed crafting identity');
const specialCraft=RECIPES.find(row=>row.id==='CRAFT_STONEHEART_CHEST');
ok(!specialCraft||specialCraft.inputs.some(input=>input.quantity>=20),'Special CRAFT_* Smithing recipes may retain a heavier material burden than routine SMITH_* progression gear');

const alchemy1=RECIPES.find(row=>row.id==='BREW_DEWLEAF_DRAUGHT')!,alchemy8=RECIPES.find(row=>row.id==='BREW_VIGOR_TONIC')!,alchemy16=RECIPES.find(row=>row.id==='BREW_WARD_TONIC')!,alchemy85=RECIPES.find(row=>row.id==='BREW_OATH_WARD_TONIC')!;
const smith1=RECIPES.find(row=>row.id==='SMELT_COPPER_INGOT')!,cook1=RECIPES.find(row=>row.id==='COOK_SILVERFIN')!;
const hourly=(recipe:typeof alchemy1)=>recipe.xp*3600/recipe.seconds;
ok(hourly(alchemy1)>=3600,'Starter Alchemy should provide at least 3,600 XP/hour before bonuses');
ok(hourly(alchemy8)>=5500&&hourly(alchemy16)>=7500,'Mid Asterfall Alchemy must remain session-scale');
ok(hourly(alchemy1)>=hourly(smith1)*.40&&hourly(alchemy1)>=hourly(cook1)*.35,'Starter Alchemy should stay within a reasonable band of Smithing/Cooking rather than being 5–7x slower');
ok(hourly(alchemy85)>=30000,'Late Alchemy should remain fast enough that herbs, not the XP curve, carry the grind');
const level16Alchemy={...state,skills:state.skills.map(row=>row.skillId==='alchemy'?{...row,level:16,xp:totalXpAtLevel(16)}:row)};
const alchemy16Pace=craftingPaceProjection(level16Alchemy,alchemy16,alchemy16.seconds,alchemy16.xp).levelPace;
ok((alchemy16Pace.etaSeconds??Infinity)<=90*60,'Level-16 Alchemy should stay around an hour per level before material acquisition');

const mockRecipe={id:'TEST_RECIPE',name:'Test',skillId:'smithing' as const,level:1,xp:100,gold:0,seconds:60,inputs:[],output:{itemId:'COPPER_INGOT',quantity:1}};
const craftPace=craftingPaceProjection(state,mockRecipe,60,100);
close(craftPace.craftsPerHour,60,.001,'One-minute timed crafting must project 60 crafts/hour');
close(craftPace.xpPerHour,6000,.001,'Timed crafting XP/hour must derive from duration and XP/craft');

console.log('PASS: progression pace, gathering runtime yield and combat/drop expectations share authoritative balance math');
