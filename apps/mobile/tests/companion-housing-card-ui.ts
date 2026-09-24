import {assert} from './test-assert';
import {COMPANION_HOUSING_VISUALS,companionHousingVisual} from '../src/core/companion-housing';

assert.equal(COMPANION_HOUSING_VISUALS.length,4);
assert.deepEqual(COMPANION_HOUSING_VISUALS.map(v=>v.accent),['BASIC','REINFORCED','VETERAN','MASTER']);
assert.ok(COMPANION_HOUSING_VISUALS[3].borderWidth>COMPANION_HOUSING_VISUALS[0].borderWidth);
assert.notEqual(COMPANION_HOUSING_VISUALS[1].borderColor,COMPANION_HOUSING_VISUALS[2].borderColor);
assert.equal(companionHousingVisual('UNIT_001',{}).accent,'BASIC');
assert.equal(companionHousingVisual('UNIT_001',{UNIT_001:3}).accent,'MASTER');
console.log('PASS companion housing card visual hierarchy');
