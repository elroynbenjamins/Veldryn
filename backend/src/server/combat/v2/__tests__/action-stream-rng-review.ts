import {strict as assert} from 'node:assert';
import {ActionStreamRngReview,CombatRng,ACTION_STREAM_RNG_QA_V2} from '../../deterministic-rng';
const sample=(r:ActionStreamRngReview,source:string,target:string,ability:string,kind:'damage'|'dot_tick'='damage')=>{
 const roll=r.begin(source,target,ability,kind);
 return [roll('hit'),roll('crit'),roll('var')];
};
const a=new ActionStreamRngReview('paired-seed'),b=new ActionStreamRngReview('paired-seed');
const first=sample(a,'A','B','BASIC');
sample(b,'OTHER','B','BASIC');sample(b,'A','B','OTHER');sample(b,'A','C','BASIC');
sample(b,'A','B','BASIC','dot_tick');
assert.deepEqual(sample(b,'A','B','BASIC'),first);
const second=sample(a,'A','B','BASIC');
const extra=b.begin('OTHER','B','BASIC','damage');extra('hit');extra('crit');
assert.deepEqual(sample(b,'A','B','BASIC'),second);
assert.notDeepEqual(first,second);
const missed=new ActionStreamRngReview('paired-seed');
missed.begin('A','B','BASIC','damage')('hit');
assert.deepEqual(sample(missed,'A','B','BASIC'),second,'miss still advances ordinal');
const changed=new ActionStreamRngReview('other-seed');
assert.notDeepEqual(sample(changed,'A','B','BASIC'),first);
const legacy=new CombatRng('paired-seed');
for(let i=0;i<500;i++){
 const x=sample(a,'A','B','BASIC');
 assert.ok(x.every(n=>n>=0&&n<.5),'review retains existing half-range');
 const old=legacy.next('probe');assert.ok(old>=0&&old<.5);
}
console.log('PASS: independent damage action streams, per-attempt replay, seed and range compatibility; review only');

const half=new ActionStreamRngReview('range-evidence'),full=new ActionStreamRngReview('range-evidence',ACTION_STREAM_RNG_QA_V2);
const targets=new CombatRng('target-range-evidence',true),targetLegacy=new CombatRng('target-range-evidence');
const counts=new Array<number>(10).fill(0),targetCounts=new Array<number>(10).fill(0);
let sum=0;
for(let i=0;i<4096;i++){
 const a=sample(half,'A','B','BASIC'),b=sample(full,'A','B','BASIC');
 for(let j=0;j<a.length;j++){
  assert.ok(b[j]>=0&&b[j]<1);
  assert.ok(Math.abs(b[j]-a[j]*(0x1fffffffffffff/0x10000000000000))<1e-14,'same digest, corrected divisor only');
  counts[Math.floor(b[j]*10)]++;sum+=b[j];
 }
 const value=targets.next('target'),old=targetLegacy.next('target');
 assert.ok(Math.abs(value-old*(0x1fffffffffffff/0x10000000000000))<1e-14);
 targetCounts[Math.floor(value*10)]++;
}
assert.ok(counts.every(n=>n>1000&&n<1450),'fixed-sample full-range damage coverage');
assert.ok(targetCounts.every(n=>n>300&&n<520),'fixed-sample full-range target coverage');
assert.ok(sum/12288>.48&&sum/12288<.52);
const picker=new CombatRng('pick-evidence',true),seen=new Set<string>();
for(let i=0;i<200;i++)seen.add(picker.pick(['A','B','C','D'],'pick'));
assert.equal(seen.size,4);
console.log(JSON.stringify({kind:'FULL_RANGE_RNG_QA_NOT_RELEASE',damageSamples:12288,damageDeciles:counts,mean:sum/12288,targetSamples:4096,targetDeciles:targetCounts}));
