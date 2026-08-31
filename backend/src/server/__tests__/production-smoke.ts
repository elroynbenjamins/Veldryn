import {requiredMarketReserve,validateIdleCommit} from '../transactions/economy';
import {chooseBestMatch} from '../matchmaking/matchmaker';
import {bossAttemptAllowed} from '../guild/progression';
import {raidPityChance,ratingDelta} from '../endgame/pvp-raids';
import {riskScore,restrictionLevel} from '../telemetry/risk';
import {ANDROID_PACKAGE,decideBootstrap} from '../api/contracts';
function assert(x:boolean,m:string){if(!x)throw new Error(m)}
assert(requiredMarketReserve({side:'buy',unitPrice:100,quantity:10,listingFeeRate:.02}).gold===1020,'market reserve');
assert(validateIdleCommit({characterId:'c',idempotencyKey:'k',activityId:'a',elapsedSec:28800,resourceItemId:'ore',resourceAmount:80,xp:100}).elapsedSec===28800,'idle validation');
const q:any[]=[{id:'1',characterId:'1',role:'tank',powerIndex:100,createdAtMs:0,echoAllowed:true},{id:'2',characterId:'2',role:'damage',powerIndex:101,createdAtMs:0,echoAllowed:true},{id:'3',characterId:'3',role:'damage',powerIndex:99,createdAtMs:0,echoAllowed:true},{id:'4',characterId:'4',role:'support',powerIndex:100,createdAtMs:0,echoAllowed:true}];
assert(chooseBestMatch(q,60000)?.ticketIds.length===4,'matchmaker');
assert(bossAttemptAllowed(2,3)&&!bossAttemptAllowed(3,3),'guild boss attempts');
assert(raidPityChance(39)===1,'raid hard pity');
assert(ratingDelta(1000,1000,1)>0,'rating');
assert(restrictionLevel(riskScore(['seed_mismatch','impossible_elapsed','seed_mismatch']))>=1,'risk');
assert(ANDROID_PACKAGE==='com.elroybenjamins.veldryn','package');
assert(decideBootstrap({platform:'android',buildNumber:10,contentVersion:'a',locale:'en',timezone:'Europe/Amsterdam'},9,'b').contentUpdateRequired,'bootstrap');
console.log('production-smoke ok');
