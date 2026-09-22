import {createCharacter,newGame,startGathering} from '../src/core/game';
import {characterTotalXpAtLevel,totalXpAtLevel} from '../src/core/progression';
import {GATHERING} from '../src/content/skills';
import {MONSTERS} from '../src/content/monsters';
import {activeActivityLevelPace,activityProgressFeedback,characterLevelPace,combatBaselineProjection,craftingPaceProjection,dropExpectation,formatBalanceDuration,gatheringBalanceProjection,skillTargetEta} from '../src/core/balance-projection';

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
const gearDrop=rat.drops.find(drop=>drop.chance<.1)!;
const expected=dropExpectation(gearDrop.chance,gearDrop.min,gearDrop.max,combat.killsPerHour);
close(expected.oneIn,1/gearDrop.chance,.001,'Drop odds must be the reciprocal of per-kill chance');
ok(expected.averageFindSeconds>combat.cycleSeconds,'Rare-drop average find time must exceed one kill cycle');
const mossMaterial=rat.drops.find(drop=>drop.itemId==='MOSS_FIBER')!,mossExpected=dropExpectation(mossMaterial.chance,mossMaterial.min,mossMaterial.max,combat.killsPerHour);
ok(mossExpected.averageFindSeconds<5*60,'Starter required materials should arrive frequently rather than carrying the grind');
const revenant=MONSTERS.find(row=>row.id==='OATHGLASS_REVENANT')!,revenantPace=combatBaselineProjection(revenant),normalGear=revenant.drops.find(drop=>drop.itemId==='SPELLGLASS_CHEST')!,normalGearExpected=dropExpectation(normalGear.chance,normalGear.min,normalGear.max,revenantPace.killsPerHour);
ok(normalGearExpected.averageFindSeconds>=30*60&&normalGearExpected.averageFindSeconds<=3*3600,'Later ordinary gear should average tens of minutes to a few hours, not become a chase grind');
const oracle=MONSTERS.find(row=>row.id==='DUNE_ORACLE')!,oraclePace=combatBaselineProjection(oracle),sigil=oracle.drops.find(drop=>drop.itemId==='SWIFT_SIGIL')!,sigilExpected=dropExpectation(sigil.chance,sigil.min,sigil.max,oraclePace.killsPerHour);
ok(sigilExpected.averageFindSeconds>=3*3600&&sigilExpected.averageFindSeconds<=12*3600,'Rare build-defining sigils should remain multi-hour chase drops');
ok(formatBalanceDuration(30)==='<1m'&&formatBalanceDuration(3600)==='1h'&&formatBalanceDuration(90000)==='1d 1h','Balance duration labels must stay compact and readable');
ok(activityProgressFeedback('gathering',.1)==='Preparing tools…'&&activityProgressFeedback('gathering',.8)==='Finishing the action…','Gathering cycle feedback must describe real progress phases');
ok(activityProgressFeedback('combat',.1)==='Tracking the target…'&&activityProgressFeedback('combat',.8)==='Pressing the advantage…','Combat cycle feedback must describe real progress phases');
ok(activityProgressFeedback('crafting',.1)==='Preparing materials…'&&activityProgressFeedback('faith',.8)==='Deepening devotion…','Crafting and Faith must use activity-specific progress language');
ok(activityProgressFeedback('training',.8)==='Refining form…'&&activityProgressFeedback('exploration',.8)==='Following the trail…','Training and Exploration must use activity-specific progress language');
const mockRecipe={id:'TEST_RECIPE',name:'Test',skillId:'smithing' as const,level:1,xp:100,gold:0,seconds:60,inputs:[],output:{itemId:'COPPER_INGOT',quantity:1}};
const craftPace=craftingPaceProjection(state,mockRecipe,60,100);
close(craftPace.craftsPerHour,60,.001,'One-minute timed crafting must project 60 crafts/hour');
close(craftPace.xpPerHour,6000,.001,'Timed crafting XP/hour must derive from duration and XP/craft');

console.log('PASS: progression pace, gathering runtime yield and combat/drop expectations share authoritative balance math');
