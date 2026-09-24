import {strict as assert} from 'node:assert';
import {REGIONAL_COMBAT_PRESSURE,REGIONAL_FOOD_SUSTAIN_TARGETS} from '../game';

const regions=['Greenfields','Silverbrook','Ironwood Forest','Old Mines',"King's Road",'Sunscar','Frostmarch','Ashlands'];
let previous=0;
for(const region of regions){
 const pressure=REGIONAL_COMBAT_PRESSURE[region],target=REGIONAL_FOOD_SUSTAIN_TARGETS[region];
 assert.ok(pressure>=previous,region+' pressure must not regress');
 assert.ok(target.foodPerHourMin>=0&&target.foodPerHourMax>=target.foodPerHourMin);
 previous=pressure;
}
assert.equal(REGIONAL_COMBAT_PRESSURE.Greenfields,1);
assert.ok(REGIONAL_COMBAT_PRESSURE.Ashlands>=1.25);
assert.equal(REGIONAL_FOOD_SUSTAIN_TARGETS.Greenfields.foodPerHourMin,0,'starter region remains forgiving');
assert.ok(REGIONAL_FOOD_SUSTAIN_TARGETS["King's Road"].foodPerHourMin>0,'established regional farming should need food');
assert.ok(REGIONAL_FOOD_SUSTAIN_TARGETS.Ashlands.foodPerHourMin>REGIONAL_FOOD_SUSTAIN_TARGETS.Sunscar.foodPerHourMin);
console.log('PASS regional combat pressure and food sustain targets');
