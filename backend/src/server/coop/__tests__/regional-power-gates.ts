import {strict as assert} from 'node:assert';
import {REGIONAL_DUNGEON_BALANCE_VERSION,regionalPowerMultipliers,regionalCombatPowerBoost} from '../regional-power-balance';

assert.equal(REGIONAL_DUNGEON_BALANCE_VERSION,'regional-tier-power-v1');
for(const id of ['EXP_001','EXP_003'])for(const tier of [1,2,3]){
 const row=regionalPowerMultipliers(id,tier,true);
 if(!row)throw new Error('new online regional dungeon missing scaled encounter pressure');
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

assert.equal(regionalCombatPowerBoost('EXP_001',2500,true),1);
assert.ok(regionalCombatPowerBoost('EXP_001',5000,true)>regionalCombatPowerBoost('EXP_001',3750,true));
assert.ok(regionalCombatPowerBoost('EXP_003',8500,true)>regionalCombatPowerBoost('EXP_003',7250,true));
assert.ok(regionalCombatPowerBoost('EXP_001',5000,true)<1.4,'Combat Power increases must stay capped');
assert.equal(regionalCombatPowerBoost('EXP_001',50000,true),1.4,'No unlimited power in normalized co-op');
assert.equal(regionalCombatPowerBoost('EXP_001',50000,false),1,'Legacy saved runs keep original equipment normalization');
assert.equal(regionalCombatPowerBoost('EXP_005',50000,true),1,'Development dungeons have no published power scaling');
