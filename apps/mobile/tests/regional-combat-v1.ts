import {strict as assert} from 'node:assert';
import {SUNSCAR_REGIONAL_ENCOUNTERS_V1} from '../src/online/regional-combat';

assert.equal(SUNSCAR_REGIONAL_ENCOUNTERS_V1.length,5);
assert.equal(new Set(SUNSCAR_REGIONAL_ENCOUNTERS_V1.map(row=>row.id)).size,5);
assert.deepEqual(SUNSCAR_REGIONAL_ENCOUNTERS_V1.map(row=>row.zoneId),['ZONE_006','ZONE_007','ZONE_008','ZONE_009','ZONE_010']);
assert.equal(SUNSCAR_REGIONAL_ENCOUNTERS_V1.filter(row=>row.kind==='regional_boss').length,1);
assert.equal(SUNSCAR_REGIONAL_ENCOUNTERS_V1.find(row=>row.kind==='regional_boss')?.contentId,'BOSS_002');
assert.ok(SUNSCAR_REGIONAL_ENCOUNTERS_V1.every(row=>row.level>=25&&row.level<=45));
assert.ok(SUNSCAR_REGIONAL_ENCOUNTERS_V1.filter(row=>row.kind==='elite').every(row=>row.zoneId!=='ZONE_006'&&row.zoneId!=='ZONE_010'));

console.log('PASS: Sunscar regional combat mobile catalog matches server encounter lanes');
