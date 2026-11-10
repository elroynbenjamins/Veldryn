import {ITEMS,itemDef} from '../src/content/items';
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
for(const region of regions)ok((REGIONAL_MIN_ATTRITION_HP_PER_HOUR[region]??0)>0,region+' must accumulate long-hunt hourly attrition');
ok(REGIONAL_FOOD_SUSTAIN_TARGETS["King's Road"].foodPerHourMin>0,'established regional farming should need food');
ok(REGIONAL_MIN_ATTRITION_HP_PER_HOUR.Ashlands>REGIONAL_MIN_ATTRITION_HP_PER_HOUR.Sunscar,'late-region HP pressure must increase even when stronger food reduces portions consumed');

const foodHealingBaseline:Record<string,number>={
 TRAVEL_RATION:18,COOKED_MEADOW_PERCH:24,COOKED_SILVERFIN:26,
 ROASTED_ROOTSTREAM_TROUT:40,SEARED_RIVER_EEL:52,IRONWOOD_STEW:90,
 BAKED_CAVE_LOACH:65,ROASTED_CROWN_CARP:82,ROASTED_OATHSCALE:95,
 GRILLED_OASIS_CARP:130,GLASSFIN_FEAST:190,FROSTED_ICEFIN:250,
 CHARRED_EMBERFIN:330,ASHLANDS_EMBER_STEW:390,
};
const foods=ITEMS.filter(item=>item.type==='food');
ok(foods.length===Object.keys(foodHealingBaseline).length,'every food must have an approved healing baseline');
for(const food of foods){
 const baseline=foodHealingBaseline[food.id];
 ok(baseline!==undefined,'unreviewed food healing: '+food.id);
 const expected=Math.max(1,Math.round(baseline*0.85));
 ok(food.heal===expected,food.id+' must heal 85% of baseline rounded to whole HP');
 ok(itemDef(food.id).heal===expected,'direct food lookup must match combat and inventory values: '+food.id);
}

console.log('PASS regional combat pressure and 15% lower food healing across '+foods.length+' items');
