import {REGIONAL_COMBAT_PRESSURE,REGIONAL_FOOD_SUSTAIN_TARGETS,REGIONAL_MIN_ATTRITION_HP_PER_HOUR} from '../src/core/game';
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+': expected '+String(expected)+', got '+String(actual))}
const regions=['Greenfields','Silverbrook','Ironwood Forest','Old Mines',"King's Road",'Sunscar','Frostmarch','Ashlands'];
let previous=0;
for(const region of regions){
 const pressure=REGIONAL_COMBAT_PRESSURE[region],target=REGIONAL_FOOD_SUSTAIN_TARGETS[region];
 ok(pressure>=previous,region+' pressure must not regress');
 ok(target.foodPerHourMin>=0&&target.foodPerHourMax>=target.foodPerHourMin,region+' food sustain band must be valid');
 previous=pressure;
}
equal(REGIONAL_COMBAT_PRESSURE.Greenfields,1,'starter pressure');
ok(REGIONAL_COMBAT_PRESSURE.Ashlands>=1.25,'Ashlands must carry late-game pressure');
ok(REGIONAL_FOOD_SUSTAIN_TARGETS.Greenfields.foodPerHourMin>0,'even starter long hunts should eventually need food');
for(const region of regions)ok((REGIONAL_MIN_NET_DAMAGE_PER_KILL[region]??0)>0,region+' must accumulate long-hunt hourly attrition');
ok(REGIONAL_FOOD_SUSTAIN_TARGETS["King's Road"].foodPerHourMin>0,'established regional farming should need food');
ok(REGIONAL_FOOD_SUSTAIN_TARGETS.Ashlands.foodPerHourMin>REGIONAL_FOOD_SUSTAIN_TARGETS.Sunscar.foodPerHourMin,'late-region food demand must increase');
console.log('PASS regional combat pressure and food sustain targets');
