import {createCharacter,newGame} from '../src/core/game';
import {activityRate,dashboardRecommendation} from '../src/core/dashboard';

const state=createCharacter(newGame(0),'BASTION','Tester');
const first=dashboardRecommendation(state);
if(first.destination!=='World'||first.zoneId!=='Greenfields')throw new Error(`Expected first quest guidance to Greenfields, got ${JSON.stringify(first)}`);
state.activity={kind:'combat',targetId:'MOSS_RAT',startedAtMs:0,lastClaimAtMs:0};
const rate=activityRate(state);
if(rate.actionsPerHour<400||rate.xpPerHour!==rate.actionsPerHour*14||rate.goldPerHour!==rate.actionsPerHour)throw new Error(`Unexpected activity rate ${JSON.stringify(rate)}`);
state.quests[0].status='complete';
if(dashboardRecommendation(state).destination!=='Quests')throw new Error('Completed quest should take priority');
state.overflow={stacks:[{itemId:'MOSS_FIBER',quantity:1}],expiresAtMs:1};
if(dashboardRecommendation(state).priority!=='urgent')throw new Error('Overflow should be urgent');
console.log(JSON.stringify({status:'PASS',recommendation:first,rate}));
