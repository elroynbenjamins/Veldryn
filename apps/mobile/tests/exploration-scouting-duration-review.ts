import assert from 'node:assert/strict';
import {reserveScout,scoutClaimPreview,SCOUT_TRAINING_MINUTES,type ScoutState,type ScoutAuthority,type ScoutTrainingMinutes} from '../src/core/exploration-scouting-review';
import {simulateScoutingProgress} from '../src/core/exploration-scouting-balance-review';
const state:ScoutState={accountId:'a',characterId:'c',explorationLevel:1,explorationXp:0,discoveredRouteIds:['SCOUT_GREENFIELDS'],visitedZoneIds:['GREENFIELDS']};
const authority:ScoutAuthority={owned:{},legacyAssignments:[],equipped:new Set(),trialLocked:new Set(),unavailable:new Set()};
const input={state,authority,receipts:[],routeId:'scout2:SCOUT_GREENFIELDS',kind:'practice' as const,companionIds:[],requestId:'training_01',now:1000};
const base=reserveScout(input);
assert.equal(base.trainingMinutes,5);
for(const minutes of SCOUT_TRAINING_MINUTES){
 const r=reserveScout({...input,trainingMinutes:minutes});
 assert.equal(r.xp,Math.floor(24/48*minutes*60));
 assert.equal(r.endsAt-r.startedAt,Math.round(minutes*60000*1.25));
 assert.equal(scoutClaimPreview(r,state,r.endsAt).explorationXp,r.xp);
 assert.equal(reserveScout({...input,trainingMinutes:minutes,receipts:[r]}),r);
}
assert.throws(()=>reserveScout({...input,trainingMinutes:7 as ScoutTrainingMinutes}),/invalid_duration/);
assert.throws(()=>reserveScout({...input,trainingMinutes:120,receipts:[base]}),/nonce_conflict/);
assert.throws(()=>reserveScout({...input,kind:'route',trainingMinutes:5}),/invalid_duration/);
assert.throws(()=>reserveScout({...input,kind:'survey',trainingMinutes:480}),/companion_required/);
const short=simulateScoutingProgress({authority,companionIds:[],repeat:'practice',claimCadenceMs:1000,xpMultiplier:.6,targetLevel:100,trainingMinutes:5});
const long=simulateScoutingProgress({authority,companionIds:[],repeat:'practice',claimCadenceMs:1000,xpMultiplier:.6,targetLevel:100,trainingMinutes:480});
assert.ok(long.assignments<short.assignments/20);
assert.ok(long.hours>=short.hours*.9&&long.hours<=short.hours*1.1);
console.table([{duration:'5m',hours:Math.round(short.hours),assignments:short.assignments},{duration:'8h',hours:Math.round(long.hours),assignments:long.assignments}]);
console.log('PASS selectable duration allowlist, same base rate, frozen receipt and guide accessibility');
