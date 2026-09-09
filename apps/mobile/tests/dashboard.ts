import {createCharacter,newGame,startCombat} from '../src/core/game';
import {activityRate,dashboardRecommendation} from '../src/core/dashboard';
import {environmentEffectForActivity} from '../src/core/world-weather';

const state=createCharacter(newGame(0),'BASTION','Tester');
const first=dashboardRecommendation(state);
if(first.destination!=='World'||first.zoneId!=='Greenfields')throw new Error(`Expected first quest guidance to Greenfields, got ${JSON.stringify(first)}`);
const hunting=startCombat(state,'MOSS_RAT',0);state.activity=hunting.activity;
const rate=activityRate(state);
const effect=environmentEffectForActivity(state.activity!).effect;
if(rate.actionsPerHour<300||rate.xpPerHour!==Math.floor(rate.actionsPerHour*14*effect.xpMultiplier)||rate.goldPerHour!==Math.floor(rate.actionsPerHour*effect.goldMultiplier))throw new Error(`Unexpected weather-adjusted activity rate ${JSON.stringify(rate)}`);
state.quests[0].status='complete';
if(dashboardRecommendation(state).destination!=='Quests')throw new Error('Completed quest should take priority');
state.overflow={stacks:[{itemId:'MOSS_FIBER',quantity:1}],expiresAtMs:1};
if(dashboardRecommendation(state).priority!=='urgent')throw new Error('Overflow should be urgent');
console.log(JSON.stringify({status:'PASS',recommendation:first,rate}));
