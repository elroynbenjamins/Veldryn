import {strict as assert} from 'node:assert';
import {REGIONAL_DUNGEON_BALANCE_VERSION,regionalPowerMultipliers} from '../regional-power-balance';

assert.equal(REGIONAL_DUNGEON_BALANCE_VERSION,'regional-tier-power-v1');
for(const id of ['EXP_001','EXP_003'])for(const tier of [1,2,3]){
 const row=regionalPowerMultipliers(id,tier,true);
 assert.ok(row,'new online regional dungeon has scaled encounter pressure');
 assert.ok(row.attack>0&&row.attack<1&&row.hp>0&&row.hp<1&&row.defense>0&&row.defense<=1);
 assert.equal(regionalPowerMultipliers(id,tier,false),undefined,'saved legacy runs retain old enemy stats');
}
assert.equal(regionalPowerMultipliers('EXP_005',1,true),undefined,'Frostmarch is still in development');
assert.equal(regionalPowerMultipliers('EXP_001',1,true)?.enemyLevel,10);
assert.equal(regionalPowerMultipliers('EXP_003',1,true)?.enemyLevel,25);
for(const id of ['EXP_001','EXP_003']){
 const rows=[1,2,3].map(tier=>regionalPowerMultipliers(id,tier,true)!);
 for(const stat of ['attack','hp','defense'] as const){
  assert.ok(rows[0][stat]<rows[1][stat]&&rows[1][stat]<rows[2][stat],id+' has monotonic tier '+stat);
 }
}
console.log('PASS: versioned regional encounter scale and legacy-run protection');
