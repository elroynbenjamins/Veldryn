import {assert} from './test-assert';
import {combatSustainProjection} from '../src/core/game';
import {itemDef} from '../src/content/items';
import type {GameState} from '../src/core/types';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';

const localFoodByRegion:Readonly<Record<string,string>>={
 Greenfields:'COOKED_MEADOW_PERCH',
 Silverbrook:'COOKED_SILVERFIN',
 'Ironwood Forest':'ROASTED_ROOTSTREAM_TROUT',
 'Old Mines':'BAKED_CAVE_LOACH',
 "King's Road":'ROASTED_CROWN_CARP',
 Sunscar:'GLASSFIN_FEAST',
 Frostmarch:'FROSTED_ICEFIN',
 Ashlands:'CHARRED_EMBERFIN',
};
const durations=[1,4,8,24] as const,report:Array<Record<string,unknown>>=[];
let previousHeal=0;
for(const def of REGIONAL_COMBAT_FIXTURES){
 const foodId=localFoodByRegion[def.regionName];assert.ok(foodId,def.regionName+' must have a local cooked-fish sustain item');
 const prepared=regionalCombatFixture(def,'prepared');
 const state={...prepared,character:{...prepared.character!,equippedFoodId:foodId}} as GameState;
 const food=itemDef(foodId);assert.equal(food.type,'food',def.regionName+' sustain item must be real food');
 const heal=food.heal??0;assert.ok(heal>previousHeal,def.regionName+' local sustain food must improve on the previous region');previousHeal=heal;
 const rows=durations.map(hours=>combatSustainProjection(state,def.monsterId,hours)!);
 const row=rows[0];
 assert.ok(row&&Number.isFinite(row.foodPerHour),def.regionName+' sustain projection must be finite');
 assert.ok(row.damagePerKill>=1&&row.killsPerHour>0);
 assert.ok(row.foodPerHour>0,def.regionName+' long-hunt projection must require food');
 assert.equal(row.region,def.regionName);
 for(let i=0;i<rows.length;i++){
  const projection=rows[i];assert.ok(Number.isFinite(projection.projectedFood)&&projection.projectedFood>0,def.regionName+' '+durations[i]+'h food projection must be finite and positive');
  assert.ok(Math.abs(projection.projectedFood-projection.foodPerHour*durations[i])<1e-9,def.regionName+' food projection must scale with hunt duration');
  if(i>0)assert.ok(projection.projectedFood>rows[i-1].projectedFood,def.regionName+' longer hunts must require more food');
 }
 report.push({region:def.regionName,monsterId:def.monsterId,foodId,heal,foodPerHour:Number(row.foodPerHour.toFixed(2)),foodNeeded:Object.fromEntries(rows.map((projection,index)=>[durations[index]+'h',Number(projection.projectedFood.toFixed(1))]))});
}
const greenfields=REGIONAL_COMBAT_FIXTURES[0],noFoodBase=regionalCombatFixture(greenfields,'prepared');
const noFood={...noFoodBase,character:{...noFoodBase.character!,equippedFoodId:undefined}} as GameState;
const noFoodProjection=combatSustainProjection(noFood,greenfields.monsterId);
assert.ok(noFoodProjection,'no-food sustain projection must still resolve');
assert.equal(noFoodProjection!.healingPerFood,0,'no equipped food must provide zero healing');
assert.equal(noFoodProjection!.foodPerHour,Infinity,'no-food long-hunt projection must report unsustainable food demand');

console.log(JSON.stringify({status:'PASS',report},null,2));
