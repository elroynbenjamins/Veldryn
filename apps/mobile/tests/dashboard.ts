import {createCharacter,newGame,startCombat,startGathering} from '../src/core/game';
import {activityCycleSeconds,activityRate,dashboardRecommendation} from '../src/core/dashboard';
import {activeGatheringRuntimeProjection} from '../src/core/balance-projection';
import {environmentEffectForActivity} from '../src/core/world-weather';
import {MONSTERS} from '../src/content/monsters';

const state=createCharacter(newGame(0),'BASTION','Tester');
const first=dashboardRecommendation(state);
if(first.destination!=='World'||first.zoneId!=='Greenfields')throw new Error(`Expected first quest guidance to Greenfields, got ${JSON.stringify(first)}`);
const hunting=startCombat(state,'MOSS_RAT',0);state.activity=hunting.activity;
const rate=activityRate(state);
const effect=environmentEffectForActivity(state.activity!).effect;
const rat=MONSTERS.find(monster=>monster.id==='MOSS_RAT')!;
if(rate.actionsPerHour<200||rate.actionsPerHour>300||rate.xpPerHour!==Math.floor(rate.actionsPerHour*rat.xp*effect.xpMultiplier)||rate.goldPerHour!==Math.floor(rate.actionsPerHour*rat.gold*effect.goldMultiplier))throw new Error(`Unexpected weather-adjusted activity rate ${JSON.stringify(rate)}`);
// Home's gathering countdown and rates must share the real time-modified
// cycle instead of diverging when tools, mastery or class affinity are active.
const gatherState=startGathering(createCharacter(newGame(0),'BASTION','Gatherer'),'GREENWOOD_TREE',0);
const gatherPace=activeGatheringRuntimeProjection(gatherState);
if(!gatherPace)throw new Error('Gathering runtime projection missing');
const gatherRate=activityRate(gatherState);
if(activityCycleSeconds(gatherState)!==gatherPace.cycleSeconds||gatherRate.actionsPerHour!==gatherPace.actionsPerHour||gatherRate.xpPerHour!==gatherPace.xpPerHour)throw new Error('Home gathering countdown/rates diverged from runtime');
state.quests[0].status='complete';
if(dashboardRecommendation(state).destination!=='Quests')throw new Error('Completed quest should take priority');
state.overflow={stacks:[{itemId:'MOSS_FIBER',quantity:1}],expiresAtMs:1};
if(dashboardRecommendation(state).priority!=='urgent')throw new Error('Overflow should be urgent');
console.log(JSON.stringify({status:'PASS',recommendation:first,rate}));
