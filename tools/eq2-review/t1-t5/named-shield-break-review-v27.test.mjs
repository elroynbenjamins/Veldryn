import test from 'node:test';
import assert from 'node:assert/strict';
import {contract} from './normalized-effect-review-v18.mjs';
test('Weather the Break retains exact required shield, direct depletion, duration and cooldown',()=>{
 const setId='eq2_t5_rimewatch',m=contract.sets.find(s=>s.setId===setId&&s.pieces===6),o=m?.outputs?.[0];
 assert.ok(m);assert.equal(m.trigger,'own_named_shield_broken_by_direct_hit');
 assert.equal(m.requiredShieldEffect,setId+':4');assert.equal(m.internalCooldownSeconds,30);
 assert.equal(m.outputs.length,1);assert.equal(o.channel,'incoming_nontrue_reduction');
 assert.equal(o.value,6);assert.equal(o.durationSeconds,4);assert.equal(o.unit,'relative_percent');
 assert.equal(o.target,'self');assert.equal(m.releaseApproved,false);
});
