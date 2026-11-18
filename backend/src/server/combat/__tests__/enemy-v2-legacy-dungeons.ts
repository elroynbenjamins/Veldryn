import {strict as assert} from 'node:assert';
import {EXPEDITION_ENCOUNTERS} from '../content/expedition-encounters';
import {prepareEnemyV2} from '../enemy-v2-prototype';
import {prepareAsterfallBossV2} from '../boss-v2-asterfall-prototype';

/**
 * Migration guard: the existing dungeon factories MUST retain canonical
 * enemy snapshots when Enemy 2.0 is not explicitly selected by the server.
 * In-flight saved runs and live rewards continue using those definitions.
 */
let checked=0;
for(const [encounterId,factory] of Object.entries(EXPEDITION_ENCOUNTERS)){
  const original=factory();
  const serialized=JSON.stringify(original);
  const legacy=prepareEnemyV2(original);
  assert.deepEqual(legacy.preview,[],`${encounterId}: legacy preview must not gain 2.0 traits`);
  assert.equal(legacy.enemies.length,original.length,`${encounterId}: enemy count must not change`);
  for(let i=0;i<original.length;i++){
    assert.equal(legacy.enemies[i],original[i],`${encounterId}: enemy must remain identical when v2 is disabled`);
    assert.equal(prepareAsterfallBossV2(original[i]),original[i],`${encounterId}: legacy boss must remain identical`);
    assert.equal((original[i].tags??[]).some(tag=>tag.startsWith('enemy-v2:')),false,
      `${encounterId}: live dungeon factory accidentally includes experimental tags`);
  }
  assert.equal(JSON.stringify(original),serialized,`${encounterId}: prototype may not mutate existing content`);
  checked++;
}
assert.ok(checked>0,'Expected existing dungeon encounters to validate');
console.log(`PASS: ${checked} existing dungeon encounters remain under legacy combat rules`);
