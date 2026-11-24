import assert from 'node:assert/strict';
import {target,caps,capacity,rewards} from './weekly-guild-boss-balance-review.mjs';
for(let n=1;n<=20;n++){
 const rows=Array.from({length:n},()=>({hit:15000,focus:.82}));
 const hp=target(rows);
 assert.ok(hp>100);assert.ok(capacity(rows,hp)>=hp);
 assert.ok(hp<=3*15000*n);
}
const rows=Array.from({length:11},()=>({hit:183434/11,focus:1}));
assert.equal(target(rows),410000);
const weak=Array.from({length:5},()=>({hit:4000,focus:1})),strong=weak.map(r=>({...r,hit:16000}));
assert.ok(target(strong)>target(weak));
const skew=[{hit:100000,focus:1},...Array.from({length:4},()=>({hit:3000,focus:.82}))];
assert.ok(capacity(skew,target(skew))>=target(skew));
assert.equal(rewards.reduce((n,r)=>n+r.gold,0),2000);
assert.equal(rewards.reduce((n,r)=>n+r.tokens,0),30);
assert.deepEqual(caps(1,.82),[.34,1]);
assert.equal(target([{hit:15000,focus:.82}]),34000);
assert.ok(target(skew)>100);
console.log('PASS weekly scaling review: sizes 1–20, strongest-roster calibration, skew and reward totals');
