import assert from 'node:assert/strict';
import {calculateIdleClaim,IdleActivity} from '../activities/idle';
import {validateCraft,Recipe} from '../crafting/crafting';

const activity:IdleActivity={activityId:'ore',startedAtMs:0,lastClaimAtMs:0,ratePerHour:10,xpPerHour:20,maxOfflineHours:8};
const now=24*3600*1000;
const capped=calculateIdleClaim(activity,now);
assert.equal(capped.resourceAmount,80);
assert.equal(capped.xp,160);
assert.equal(capped.newLastClaimAtMs,now);
assert.throws(()=>calculateIdleClaim({...activity,lastClaimAtMs:capped.newLastClaimAtMs},now),/invalid_claim_time/);
const next=calculateIdleClaim({...activity,lastClaimAtMs:capped.newLastClaimAtMs},now+3600000);
assert.equal(next.resourceAmount,10,'a later claim earns only new time');
const partial=calculateIdleClaim(activity,1500);
assert.equal(partial.newLastClaimAtMs,1000);
assert.equal(calculateIdleClaim({...activity,lastClaimAtMs:partial.newLastClaimAtMs},2000).elapsedSec,1);
const cappedPartial=calculateIdleClaim(activity,now+500);
assert.equal(cappedPartial.newLastClaimAtMs,now);
assert.equal(calculateIdleClaim({...activity,lastClaimAtMs:now},now+500).resourceAmount,0);
assert.equal(calculateIdleClaim({...activity,maxOfflineHours:30},30*3600000).elapsedSec,30*3600,'cap is supplied by the owning policy');
for(const value of [NaN,Infinity,-1]) {
  assert.throws(()=>calculateIdleClaim({...activity,ratePerHour:value},now),/invalid_activity/);
  assert.throws(()=>calculateIdleClaim({...activity,xpPerHour:value},now),/invalid_activity/);
  assert.throws(()=>calculateIdleClaim({...activity,maxOfflineHours:value},now),/invalid_activity/);
}
assert.throws(()=>calculateIdleClaim(activity,NaN),/invalid_claim_time/);
assert.throws(()=>calculateIdleClaim({...activity,ratePerHour:Number.MAX_VALUE},now),/invalid_reward/);
const recipe:Recipe={id:'bar',levelReq:1,skillId:'smithing',xp:10,ingredients:[{itemId:'ore',quantity:2}],outputs:[{itemId:'bar',quantity:1}],durationSec:5};
assert.deepEqual(validateCraft(recipe,1,2),{ingredients:[{itemId:'ore',quantity:4}],outputs:[{itemId:'bar',quantity:2}],xp:20,durationSec:10});
for(const qty of [1.5,NaN,Infinity,-1,0,1000])assert.throws(()=>validateCraft(recipe,1,qty),/invalid_quantity/);
assert.throws(()=>validateCraft(recipe,NaN,1),/invalid_skill_level/);
assert.throws(()=>validateCraft(recipe,0,1),/skill_level_too_low/);
assert.throws(()=>validateCraft({...recipe,outputs:[{itemId:'bar',quantity:1.5}]},1,1),/invalid_recipe/);
assert.throws(()=>validateCraft({...recipe,xp:Number.MAX_SAFE_INTEGER},1,2),/invalid_recipe/);
assert.equal(validateCraft(recipe,1,999).outputs[0].quantity,999);
console.log('release economy regressions passed');
