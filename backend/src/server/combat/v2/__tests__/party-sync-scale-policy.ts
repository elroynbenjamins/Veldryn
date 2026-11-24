import {strict as assert} from 'node:assert';
import {
 PARTY_SYNCHRONIZATION_SCALES_V2,
 partySynchronizationEquivalentLinkBudgetV2,
 partySynchronizationScalePercentV2,
} from '../party-synchronization';

assert.deepEqual([...PARTY_SYNCHRONIZATION_SCALES_V2],[0,100,100,80,65,55,50]);
const expectedBudgets=[0,1,2,2.4,2.6,2.75,3];
const budgets=expectedBudgets.map((_,links)=>partySynchronizationEquivalentLinkBudgetV2(links));
assert.deepEqual(budgets,expectedBudgets);
for(let links=1;links<=6;links++){
 assert.ok(partySynchronizationScalePercentV2(links)<=partySynchronizationScalePercentV2(links-1||1),
  'per-link scale must not increase as links accumulate');
 if(links>1)assert.ok(budgets[links]>=budgets[links-1],
  'total nominal link budget must never decrease');
}
assert.equal(partySynchronizationScalePercentV2(1),100);
assert.equal(partySynchronizationScalePercentV2(2),100);
assert.equal(partySynchronizationScalePercentV2(6),50);
assert.equal(partySynchronizationEquivalentLinkBudgetV2(6),3);
for(const bad of [-1,7,1.5,NaN,Infinity])
 assert.throws(()=>partySynchronizationScalePercentV2(bad),/invalid_pair_count/);

console.log(JSON.stringify({
 kind:'PARTY_SYNC_SCALE_POLICY',
 scales:[...PARTY_SYNCHRONIZATION_SCALES_V2],
 equivalentLinkBudgets:budgets,
 maxNominalBudget:3,
 interpretation:'more links dilute individual links but never reduce total nominal Synchronization budget',
}));
