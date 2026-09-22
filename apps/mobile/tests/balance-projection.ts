import {createCharacter,newGame,startGathering} from '../src/core/game';
import {GATHERING} from '../src/content/skills';
import {MONSTERS} from '../src/content/monsters';
import {activeActivityLevelPace,combatBaselineProjection,dropExpectation,formatBalanceDuration,gatheringBalanceProjection,skillTargetEta} from '../src/core/balance-projection';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function close(actual:number,expected:number,tolerance:number,message:string){if(Math.abs(actual-expected)>tolerance)throw new Error(message+': expected '+expected+', got '+actual)}

let state=createCharacter(newGame(1),'IRONWARDEN','Balance Tester');
const greenwood=GATHERING.find(row=>row.id==='GREENWOOD_TREE')!;
const gather=gatheringBalanceProjection(state,greenwood,24);
ok(gather.cycleSeconds>greenwood.seconds,'Gathering projection must include global pacing/tool/weather modifiers');
ok(gather.xpPerHour>0&&gather.levelPace.etaSeconds!==undefined,'Gathering projection must expose XP/hour and next-level ETA');
ok(gather.runtimeItemsPerHour<gather.authoredMeanItemsPerHour,'Projection must expose the current runtime minimum-yield behavior instead of overstating min/max average yield');
close(gather.runtimeItemsPerHour/gather.authoredMeanItemsPerHour,2/3,.02,'1-2 authored yield should reveal the current 1-vs-1.5 runtime/display gap');
const target=skillTargetEta(state,'woodcutting',7,gather.xpPerHour);
ok((target.etaSeconds??0)>gather.levelPace.etaSeconds!,'Higher skill unlock ETA must include multiple levels of XP');

state=startGathering(state,'GREENWOOD_TREE',1000);
const active=activeActivityLevelPace(state,gather.xpPerHour);
ok(active?.label==='Woodcutting'&&active.level===1,'Active gathering pace must resolve the trained skill');
ok((active?.etaSeconds??0)>0,'Active gathering pace must expose a next-level ETA');

const rat=MONSTERS.find(row=>row.id==='MOSS_RAT')!,combat=combatBaselineProjection(rat);
ok(combat.cycleSeconds>rat.secondsPerKill,'Combat baseline must include the global combat-time scale used by settlement');
ok(combat.killsPerHour>0&&combat.xpPerHour>0,'Combat baseline must expose kills/hour and XP/hour');
const gearDrop=rat.drops.find(drop=>drop.chance<.1)!;
const expected=dropExpectation(gearDrop.chance,gearDrop.min,gearDrop.max,combat.killsPerHour);
close(expected.oneIn,1/gearDrop.chance,.001,'Drop odds must be the reciprocal of per-kill chance');
ok(expected.averageFindSeconds>combat.cycleSeconds,'Rare-drop average find time must exceed one kill cycle');
ok(formatBalanceDuration(30)==='<1m'&&formatBalanceDuration(3600)==='1h'&&formatBalanceDuration(90000)==='1d 1h','Balance duration labels must stay compact and readable');

console.log('PASS: progression pace, gathering runtime yield and combat/drop expectations share authoritative balance math');
