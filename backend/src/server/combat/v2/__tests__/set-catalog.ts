import {strict as assert} from 'node:assert';
import {SET_FAMILIES_V2,TIERED_SETS_V2,EQUIPMENT_TIERS_V2,tieredSetV2} from '../set-catalog';

assert.equal(SET_FAMILIES_V2.length,12,'four sets per role');
assert.equal(TIERED_SETS_V2.length,60,'five tiers of 12 families');
assert.equal(new Set(TIERED_SETS_V2.map(set=>set.id)).size,60,'unique IDs');
assert.equal(new Set(SET_FAMILIES_V2.map(set=>set.id)).size,12,'unique family IDs');
for(const role of ['tank','damage','support'] as const){
  assert.equal(SET_FAMILIES_V2.filter(family=>family.role===role).length,4);
  assert.ok(SET_FAMILIES_V2.some(family=>family.role===role&&family.thresholds.includes(3)));
  assert.ok(SET_FAMILIES_V2.some(family=>family.role===role&&family.thresholds.includes(6)));
}
for(const family of SET_FAMILIES_V2){
  assert.ok(!family.slots.includes('weapon')&&!family.slots.includes('offhand'),'weapons never mandatory for set thresholds');
  assert.equal(new Set(family.slots).size,family.slots.length,'unique slots in every family');
  assert.ok(family.thresholds.every(value=>value>=2&&value<=family.slots.length));
  assert.equal(new Set(family.thresholds).size,family.thresholds.length);
  for(const tier of EQUIPMENT_TIERS_V2){
    const item=tieredSetV2(family.id,tier);
    assert.ok(item);
    assert.equal(item!.tier,tier);
    assert.equal(item!.familyId,family.id);
    assert.equal(item!.role,family.role);
    assert.deepEqual(item!.slots,family.slots);
    assert.deepEqual(item!.thresholds,family.thresholds);
  }
}
assert.equal(tieredSetV2('not_a_set','T3'),undefined);
console.log('PASS: Combat 2.0 canonical 12-family / 60-tier set structures');
