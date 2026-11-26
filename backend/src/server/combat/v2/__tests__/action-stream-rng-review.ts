import {strict as assert} from 'node:assert';
import {ActionStreamRngReview,CombatRng} from '../../deterministic-rng';
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
