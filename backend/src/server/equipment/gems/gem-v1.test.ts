import {strict as assert} from 'node:assert';
import {EFFECT_GEMS_V1,STAT_GEMS_V1,validateGemCatalogV1} from './gem-catalog-v1';
import {combineGemV1,dismantleGemV1,type GemWallet} from './gem-progression-v1';
import {summarizeGemLoadoutV1} from './gem-runtime-v1';
import {buildGemDropsForSourceV1,gemPoolForSourceV1,settleGemSourceV1,validateGemAcquisitionV1} from './gem-acquisition-v1';

assert.equal(STAT_GEMS_V1.length,12);
assert.equal(EFFECT_GEMS_V1.length,20);
assert.deepEqual(validateGemCatalogV1(),[]);
assert.deepEqual(validateGemAcquisitionV1(),[]);
assert.ok(gemPoolForSourceV1('COP_004'));
assert.ok(buildGemDropsForSourceV1('COP_004').length>0);
const forcedPity=settleGemSourceV1('COP_004','forced-pity',{pityBySource:{COP_004:7},unlockedRecipeIds:[]});
assert.ok(forcedPity.gem,'Dungeon pity must settle one actual gem');
assert.equal(forcedPity.gem?.pityTriggered,true);
assert.equal(forcedPity.pityBySource.COP_004,0);

const summary=summarizeGemLoadoutV1([
 {equipmentItemId:'a',sockets:{effect:{familyId:'effect_momentum',grade:5},stat:{familyId:'stat_might',grade:5}}},
 {equipmentItemId:'b',sockets:{effect:{familyId:'effect_momentum',grade:3}}},
 {equipmentItemId:'c',sockets:{effect:{familyId:'effect_momentum',grade:1}}},
]);
assert.equal(summary.effects[0]?.resonance,3);
assert.equal(summary.effects[0]?.copies,3);
assert.equal(summary.statPercent.power,.01);

const wallet:GemWallet={gold:100000,dust:100,regionalCatalysts:2,radiantCatalysts:1,gems:[{familyId:'stat_might',grade:1,quantity:3}]};
const combined=combineGemV1(wallet,'stat_might',1);
assert.equal(combined.gems.find(v=>v.grade===2)?.quantity,1);
const dismantled=dismantleGemV1(combined,'stat_might',2,1);
assert.equal(dismantled.dust,101);

let resonanceCapBlocked=false;
try{
 summarizeGemLoadoutV1([
  {equipmentItemId:'1',sockets:{effect:{familyId:'effect_execution',grade:1}}},
  {equipmentItemId:'2',sockets:{effect:{familyId:'effect_execution',grade:1}}},
  {equipmentItemId:'3',sockets:{effect:{familyId:'effect_execution',grade:1}}},
  {equipmentItemId:'4',sockets:{effect:{familyId:'effect_execution',grade:1}}},
 ]);
}catch(error){resonanceCapBlocked=error instanceof Error&&error.message==='effect_gem_resonance_cap';}
assert.ok(resonanceCapBlocked,'Fourth matching Effect Gem must be rejected');

console.log('gem v1 tests passed');
