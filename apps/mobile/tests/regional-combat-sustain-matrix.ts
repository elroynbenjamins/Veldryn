import {assert} from './test-assert';
import {combatSustainProjection,createCharacter,newGame} from '../src/core/game';
import {itemDef} from '../src/content/items';
import type {GameState} from '../src/core/types';

const cases=[
 ['Greenfields','MOSS_RAT',1,'COOKED_MEADOW_PERCH'],
 ['Silverbrook','DROWNED_PILGRIM',22,'COOKED_SILVERFIN'],
 ['Ironwood Forest','ANCIENT_TREANT',15,'ROASTED_ROOTSTREAM_TROUT'],
 ['Old Mines','RUNEBOUND_MINER',19,'BAKED_CAVE_LOACH'],
 ["King's Road",'OATHGLASS_REVENANT',25,'ROASTED_CROWN_CARP'],
 ['Sunscar','GLASSBOUND_SENTINEL',40,'GLASSFIN_FEAST'],
 ['Frostmarch','CHOIR_HUNTER',66,'FROSTED_ICEFIN'],
 ['Ashlands','ASHEN_REVENANT',88,'CHARRED_EMBERFIN'],
] as const;
const base=createCharacter(newGame(0),'IRONWARDEN','Sustain Test');
const durations=[1,4,8,24] as const,report:Array<Record<string,unknown>>=[];
let previousHeal=0;
for(const [region,monsterId,level,foodId] of cases){
 const state={...base,currentRegionId:region==='Ironwood Forest'?'IRONWOOD':region==="King's Road"?'KINGS_ROAD':region.toUpperCase(),character:{...base.character!,level,equippedFoodId:foodId,currentHp:base.character!.hp}} as GameState;
 const food=itemDef(foodId);assert.equal(food.type,'food',region+' sustain item must be real food');
 const heal=food.heal??0;assert.ok(heal>previousHeal,region+' local sustain food must improve on the previous region');previousHeal=heal;
 const rows=durations.map(hours=>combatSustainProjection(state,monsterId,hours)!);
 const row=rows[0];
 assert.ok(row&&Number.isFinite(row.foodPerHour),region+' sustain projection must be finite');
 assert.ok(row.damagePerKill>=1&&row.killsPerHour>0);
 assert.ok(row.foodPerHour>0,region+' long-hunt projection must require food');
 assert.equal(row.region,region);
 for(let i=0;i<rows.length;i++){
  const projection=rows[i];assert.ok(Number.isFinite(projection.projectedFood)&&projection.projectedFood>0,region+' '+durations[i]+'h food projection must be finite and positive');
  assert.ok(Math.abs(projection.projectedFood-projection.foodPerHour*durations[i])<1e-9,region+' food projection must scale with hunt duration');
  if(i>0)assert.ok(projection.projectedFood>rows[i-1].projectedFood,region+' longer hunts must require more food');
 }
 report.push({region,monsterId,foodId,heal,foodPerHour:Number(row.foodPerHour.toFixed(2)),foodNeeded:Object.fromEntries(rows.map((projection,index)=>[durations[index]+'h',Number(projection.projectedFood.toFixed(1))]))});
}
console.log(JSON.stringify({status:'PASS',report},null,2));
