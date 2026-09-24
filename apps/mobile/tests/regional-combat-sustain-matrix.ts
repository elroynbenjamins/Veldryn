import {strict as assert} from 'node:assert';
import {combatSustainProjection,createCharacter,newGame} from '../src/core/game';
import type {GameState} from '../src/core/types';

const cases=[
 ['Greenfields','MOSS_RAT',1,'TRAVEL_RATION'],
 ['Silverbrook','DROWNED_PILGRIM',22,'SEARED_RIVER_EEL'],
 ['Ironwood Forest','ANCIENT_TREANT',15,'IRONWOOD_STEW'],
 ['Old Mines','RUNEBOUND_MINER',19,'IRONWOOD_STEW'],
 ["King's Road",'OATHGLASS_REVENANT',25,'ROASTED_OATHSCALE'],
 ['Sunscar','GLASSBOUND_SENTINEL',40,'GLASSFIN_FEAST'],
 ['Frostmarch','CHOIR_HUNTER',66,'FROSTED_ICEFIN'],
 ['Ashlands','ASHEN_REVENANT',88,'FROSTED_ICEFIN'],
] as const;
const base=createCharacter(newGame(0),'IRONWARDEN','Sustain Test');
for(const [region,monsterId,level,foodId] of cases){
 const state={...base,currentRegionId:region==='Ironwood Forest'?'IRONWOOD':region==="King's Road"?'KINGS_ROAD':region.toUpperCase(),character:{...base.character!,level,equippedFoodId:foodId,currentHp:base.character!.hp}} as GameState;
 const row=combatSustainProjection(state,monsterId);
 assert.ok(row&&Number.isFinite(row.foodPerHour),region+' sustain projection must be finite');
 assert.ok(row!.damagePerKill>=1&&row!.killsPerHour>0);
 assert.equal(row!.region,region);
}
console.log('PASS regional sustain matrix projection');
